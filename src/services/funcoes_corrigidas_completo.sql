-- Script corrigido com base nos erros específicos encontrados na aplicação
-- Primeiro remover todas as funções existentes com suas assinaturas específicas
DROP FUNCTION IF EXISTS obter_anos_disponiveis();
DROP FUNCTION IF EXISTS analise_por_categoria_terapeutica(INT, INT);
DROP FUNCTION IF EXISTS analise_genericos_vs_referencia(INT, INT);
DROP FUNCTION IF EXISTS analise_elasticidade_por_faixa(INT, INT);
DROP FUNCTION IF EXISTS analise_elasticidade_por_faixa(INT);
DROP FUNCTION IF EXISTS projecao_impacto_financeiro(INT, NUMERIC);
DROP FUNCTION IF EXISTS obter_projecoes_reajuste(INT);
DROP FUNCTION IF EXISTS analise_impacto_cambial(INT, INT);
DROP FUNCTION IF EXISTS analise_outliers(INT, INT);

-- Função auxiliar para obter anos disponíveis no histórico de preços
CREATE OR REPLACE FUNCTION obter_anos_disponiveis()
RETURNS TABLE (
  ano INT
) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT EXTRACT(YEAR FROM data_publicacao)::INT AS ano
  FROM precos_historico
  ORDER BY ano;
END;
$$ LANGUAGE plpgsql;

-- ========================================================================
-- 1. ANÁLISE POR CATEGORIA TERAPÊUTICA
-- ========================================================================
CREATE OR REPLACE FUNCTION analise_por_categoria_terapeutica(
  ano_inicio INT,
  ano_fim INT
)
RETURNS TABLE (
  ano INT,
  classe_terapeutica TEXT,
  variacao_media NUMERIC,
  reajuste_cmed NUMERIC,
  diferenca NUMERIC,
  total_medicamentos BIGINT
) AS $$
BEGIN
  RETURN QUERY
  WITH medicamentos_historico AS (
    SELECT 
      m.id,
      m.produto,
      m.apresentacao,
      m.laboratorio,
      m.tipo_de_produto AS tipo,
      m.classe_terapeutica,
      EXTRACT(YEAR FROM ph1.data_publicacao)::INT AS ano_preco,
      ph1.pf_sem_impostos AS preco_atual,
      LAG(ph1.pf_sem_impostos) OVER (PARTITION BY m.id ORDER BY ph1.data_publicacao) AS preco_anterior
    FROM 
      medicamentos_base m
      JOIN precos_historico ph1 ON m.id = ph1.medicamento_id
    WHERE 
      EXTRACT(YEAR FROM ph1.data_publicacao) BETWEEN ano_inicio AND ano_fim
  ),
  medicamentos_com_variacao AS (
    SELECT 
      mh.id,
      mh.ano_preco,
      mh.classe_terapeutica,
      ((mh.preco_atual - mh.preco_anterior) / NULLIF(mh.preco_anterior, 0)) * 100 AS variacao_percentual
    FROM 
      medicamentos_historico mh
    WHERE 
      mh.preco_anterior IS NOT NULL
  )
  SELECT 
    mcv.ano_preco AS ano,
    mcv.classe_terapeutica,
    AVG(mcv.variacao_percentual) AS variacao_media,
    ra.percentual AS reajuste_cmed,
    AVG(mcv.variacao_percentual) - ra.percentual AS diferenca,
    COUNT(DISTINCT mcv.id) AS total_medicamentos
  FROM 
    medicamentos_com_variacao mcv
    LEFT JOIN reajustes_anuais ra ON mcv.ano_preco = ra.ano
  WHERE 
    mcv.variacao_percentual BETWEEN -50 AND 50 -- Filtrar outliers extremos
  GROUP BY 
    mcv.ano_preco, mcv.classe_terapeutica, ra.percentual
  ORDER BY 
    mcv.ano_preco, mcv.classe_terapeutica;
END;
$$ LANGUAGE plpgsql;

-- ========================================================================
-- 2. ANÁLISE GENÉRICOS vs REFERÊNCIA - Corrigido erro "aggregate function calls cannot contain window function calls"
-- ========================================================================
CREATE OR REPLACE FUNCTION analise_genericos_vs_referencia(
  ano_inicio INT,
  ano_fim INT
)
RETURNS TABLE (
  ano INT,
  tipo_produto TEXT,
  variacao_media NUMERIC,
  reajuste_cmed NUMERIC,
  diferenca NUMERIC,
  correlacao_dolar NUMERIC,
  total_medicamentos BIGINT
) AS $$
BEGIN
  RETURN QUERY
  WITH precos_anteriores AS (
    SELECT
      m.id, 
      m.tipo_de_produto,
      EXTRACT(YEAR FROM ph.data_publicacao)::INT AS ano_med,
      ph.pf_sem_impostos,
      LAG(ph.pf_sem_impostos) OVER (PARTITION BY m.id ORDER BY ph.data_publicacao) AS preco_anterior
    FROM
      medicamentos_base m
      JOIN precos_historico ph ON m.id = ph.medicamento_id
    WHERE
      EXTRACT(YEAR FROM ph.data_publicacao) BETWEEN ano_inicio AND ano_fim
      AND m.tipo_de_produto IN ('Genérico', 'Referência')
  ),
  variacoes_calculadas AS (
    SELECT
      pa.id,
      pa.tipo_de_produto,
      pa.ano_med,
      ((pa.pf_sem_impostos - pa.preco_anterior) / NULLIF(pa.preco_anterior, 0)) * 100 AS variacao_percentual
    FROM
      precos_anteriores pa
    WHERE
      pa.preco_anterior IS NOT NULL AND pa.preco_anterior > 0
  ),
  medicamentos_agregados AS (
    SELECT 
      vc.ano_med,
      vc.tipo_de_produto,
      AVG(vc.variacao_percentual) AS variacao_media,
      COUNT(DISTINCT vc.id) AS total_medicamentos
    FROM 
      variacoes_calculadas vc
    WHERE
      vc.variacao_percentual BETWEEN -50 AND 50  -- Filtrar outliers extremos
    GROUP BY 
      vc.ano_med, vc.tipo_de_produto
    HAVING 
      COUNT(DISTINCT vc.id) > 5
  )
  SELECT 
    ma.ano_med AS ano,
    ma.tipo_de_produto AS tipo_produto,
    ma.variacao_media,
    ra.percentual AS reajuste_cmed,
    ma.variacao_media - ra.percentual AS diferenca,
    -- Cálculo de correlação simplificado (0-1)
    CASE
      WHEN ABS(ma.variacao_media - ra.variacao_dolar) < 2 THEN 0.9
      WHEN ABS(ma.variacao_media - ra.variacao_dolar) < 5 THEN 0.7
      WHEN ABS(ma.variacao_media - ra.variacao_dolar) < 10 THEN 0.5
      WHEN ABS(ma.variacao_media - ra.variacao_dolar) < 15 THEN 0.3
      ELSE 0.1
    END AS correlacao_dolar,
    ma.total_medicamentos
  FROM 
    medicamentos_agregados ma
    LEFT JOIN reajustes_anuais ra ON ma.ano_med = ra.ano
  ORDER BY 
    ma.ano_med, ma.tipo_de_produto;
END;
$$ LANGUAGE plpgsql;

-- ========================================================================
-- 3. ANÁLISE ELASTICIDADE DE PREÇO
-- ========================================================================
CREATE OR REPLACE FUNCTION analise_elasticidade_por_faixa(
  ano_referencia INT
)
RETURNS TABLE (
  faixa_preco TEXT,
  elasticidade NUMERIC,
  total_medicamentos BIGINT,
  variacao_volume NUMERIC,
  variacao_preco NUMERIC
) AS $$
BEGIN
  -- Criar tabela temporária para armazenar os resultados intermediários
  DROP TABLE IF EXISTS temp_elasticidade;
  
  CREATE TEMPORARY TABLE temp_elasticidade AS
  WITH precos_ano_ref AS (
    SELECT
      ph.medicamento_id,
      ph.pf_sem_impostos AS preco,
      v.quantidade_vendida
    FROM
      precos_historico ph
      JOIN vendas v ON ph.medicamento_id = v.medicamento_id AND EXTRACT(YEAR FROM ph.data_publicacao) = v.ano
    WHERE
      EXTRACT(YEAR FROM ph.data_publicacao) = ano_referencia
  ),
  precos_ano_anterior AS (
    SELECT
      ph.medicamento_id,
      ph.pf_sem_impostos AS preco,
      v.quantidade_vendida
    FROM
      precos_historico ph
      JOIN vendas v ON ph.medicamento_id = v.medicamento_id AND EXTRACT(YEAR FROM ph.data_publicacao) = v.ano
    WHERE
      EXTRACT(YEAR FROM ph.data_publicacao) = ano_referencia - 1
  ),
  medicamentos_com_dados AS (
    SELECT
      ref.medicamento_id,
      ref.preco AS preco_atual,
      ant.preco AS preco_anterior,
      ref.quantidade_vendida AS volume_atual,
      ant.quantidade_vendida AS volume_anterior,
      ((ref.preco - ant.preco) / NULLIF(ant.preco, 0)) * 100 AS variacao_preco,
      ((ref.quantidade_vendida - ant.quantidade_vendida) / NULLIF(ant.quantidade_vendida, 0)) * 100 AS variacao_volume,
      CASE
        WHEN ref.preco < 50 THEN 'Baixo (< R$50)'
        WHEN ref.preco BETWEEN 50 AND 200 THEN 'Médio (R$50-200)'
        ELSE 'Alto (> R$200)'
      END AS faixa_preco
    FROM
      precos_ano_ref ref
      JOIN precos_ano_anterior ant ON ref.medicamento_id = ant.medicamento_id
    WHERE
      ant.preco > 0 AND ant.quantidade_vendida > 0
  )
  SELECT
    mcd.faixa_preco,
    (mcd.variacao_volume / NULLIF(mcd.variacao_preco, 0)) * (-1) AS elasticidade,
    mcd.medicamento_id,
    mcd.variacao_volume,
    mcd.variacao_preco
  FROM
    medicamentos_com_dados mcd
  WHERE
    ABS(mcd.variacao_preco) > 0 AND ABS(mcd.variacao_preco) < 50 AND
    ABS(mcd.variacao_volume) < 100;  -- Filtrar outliers extremos

  -- Retornar os resultados agregados
  RETURN QUERY
  SELECT
    te.faixa_preco,
    AVG(te.elasticidade) AS elasticidade,
    COUNT(DISTINCT te.medicamento_id) AS total_medicamentos,
    AVG(te.variacao_volume) AS variacao_volume,
    AVG(te.variacao_preco) AS variacao_preco
  FROM
    temp_elasticidade te
  GROUP BY
    te.faixa_preco
  ORDER BY
    CASE 
      WHEN te.faixa_preco = 'Baixo (< R$50)' THEN 1
      WHEN te.faixa_preco = 'Médio (R$50-200)' THEN 2
      ELSE 3
    END;
    
  -- Limpar a tabela temporária (não é necessário com DROP TABLE IF EXISTS no início)
  DROP TABLE IF EXISTS temp_elasticidade;
END;
$$ LANGUAGE plpgsql;

-- ========================================================================
-- 4. ANÁLISE DE OUTLIERS - Corrigido erro "column 'percentual_reajuste' does not exist"
-- ========================================================================
CREATE OR REPLACE FUNCTION analise_outliers(
  ano_inicio INT,
  ano_fim INT
)
RETURNS TABLE (
  ano INT,
  percentual_cmed NUMERIC,
  media_reajuste NUMERIC,
  mediana_reajuste NUMERIC,
  primeiro_quartil NUMERIC,
  terceiro_quartil NUMERIC,
  min_reajuste NUMERIC,
  max_reajuste NUMERIC,
  desvio_padrao NUMERIC,
  contagem_outliers BIGINT,
  percentual_outliers NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH dados_reajustes AS (
    SELECT
      EXTRACT(YEAR FROM ph.data_publicacao)::INT AS ano,
      ph.medicamento_id,
      ph.pf_sem_impostos AS preco_atual,
      LAG(ph.pf_sem_impostos) OVER (PARTITION BY ph.medicamento_id ORDER BY ph.data_publicacao) AS preco_anterior,
      ra.percentual AS percentual_cmed
    FROM
      precos_historico ph
      LEFT JOIN reajustes_anuais ra ON EXTRACT(YEAR FROM ph.data_publicacao)::INT = ra.ano
    WHERE
      EXTRACT(YEAR FROM ph.data_publicacao) BETWEEN ano_inicio AND ano_fim
  ),
  calculo_reajustes AS (
    SELECT
      dr.ano,
      dr.percentual_cmed,
      ((dr.preco_atual - dr.preco_anterior) / NULLIF(dr.preco_anterior, 0)) * 100 AS reajuste_calculado
    FROM
      dados_reajustes dr
    WHERE
      dr.preco_anterior IS NOT NULL AND dr.preco_anterior > 0
  ),
  estatisticas_reajustes AS (
    SELECT
      cr.ano,
      cr.percentual_cmed,
      AVG(cr.reajuste_calculado) AS media_reajuste,
      PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY cr.reajuste_calculado) AS mediana_reajuste,
      PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY cr.reajuste_calculado) AS primeiro_quartil,
      PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY cr.reajuste_calculado) AS terceiro_quartil,
      MIN(cr.reajuste_calculado) AS min_reajuste,
      MAX(cr.reajuste_calculado) AS max_reajuste,
      STDDEV(cr.reajuste_calculado) AS desvio_padrao,
      COUNT(*) AS total_registros
    FROM
      calculo_reajustes cr
    WHERE
      ABS(cr.reajuste_calculado) < 1000 -- Filtrar valores extremos
    GROUP BY
      cr.ano, cr.percentual_cmed
  ),
  outliers AS (
    SELECT
      er.ano,
      er.terceiro_quartil + (1.5 * (er.terceiro_quartil - er.primeiro_quartil)) AS limite_superior,
      er.primeiro_quartil - (1.5 * (er.terceiro_quartil - er.primeiro_quartil)) AS limite_inferior,
      COUNT(*) FILTER (WHERE 
        cr.reajuste_calculado > er.terceiro_quartil + (1.5 * (er.terceiro_quartil - er.primeiro_quartil)) OR
        cr.reajuste_calculado < er.primeiro_quartil - (1.5 * (er.terceiro_quartil - er.primeiro_quartil))
      ) AS contagem_outliers,
      (COUNT(*) FILTER (WHERE 
        cr.reajuste_calculado > er.terceiro_quartil + (1.5 * (er.terceiro_quartil - er.primeiro_quartil)) OR
        cr.reajuste_calculado < er.primeiro_quartil - (1.5 * (er.terceiro_quartil - er.primeiro_quartil))
      )::NUMERIC / er.total_registros) * 100 AS percentual_outliers
    FROM
      estatisticas_reajustes er
      JOIN calculo_reajustes cr ON er.ano = cr.ano
    GROUP BY
      er.ano, er.primeiro_quartil, er.terceiro_quartil, er.total_registros
  )
  SELECT
    er.ano,
    er.percentual_cmed,
    er.media_reajuste,
    er.mediana_reajuste,
    er.primeiro_quartil,
    er.terceiro_quartil,
    er.min_reajuste,
    er.max_reajuste,
    er.desvio_padrao,
    o.contagem_outliers,
    o.percentual_outliers
  FROM
    estatisticas_reajustes er
    JOIN outliers o ON er.ano = o.ano
  ORDER BY
    er.ano;
END;
$$ LANGUAGE plpgsql;

-- ========================================================================
-- 5. ANÁLISE IMPACTO CAMBIAL
-- ========================================================================
CREATE OR REPLACE FUNCTION analise_impacto_cambial(
  ano_inicio INT,
  ano_fim INT
)
RETURNS TABLE (
  ano INT,
  categoria TEXT,
  variacao_preco NUMERIC,
  variacao_cambial NUMERIC,
  impacto_estimado NUMERIC,
  correlacao NUMERIC,
  total_medicamentos BIGINT
) AS $$
BEGIN
  RETURN QUERY
  WITH medicamentos_categoria AS (
    SELECT
      m.id,
      m.produto,
      CASE
        WHEN m.insumos_importados = TRUE THEN 'Com Insumos Importados'
        ELSE 'Sem Insumos Importados'
      END AS categoria,
      EXTRACT(YEAR FROM ph.data_publicacao)::INT AS ano,
      ph.pf_sem_impostos AS preco_atual,
      LAG(ph.pf_sem_impostos) OVER (PARTITION BY m.id ORDER BY ph.data_publicacao) AS preco_anterior
    FROM
      medicamentos_base m
      JOIN precos_historico ph ON m.id = ph.medicamento_id
    WHERE
      EXTRACT(YEAR FROM ph.data_publicacao) BETWEEN ano_inicio AND ano_fim
  ),
  medicamentos_variacao AS (
    SELECT
      mc.id,
      mc.categoria,
      mc.ano,
      ((mc.preco_atual - mc.preco_anterior) / NULLIF(mc.preco_anterior, 0)) * 100 AS variacao_percentual
    FROM
      medicamentos_categoria mc
    WHERE
      mc.preco_anterior IS NOT NULL AND mc.preco_anterior > 0
  ),
  calculos_finais AS (
    SELECT
      mv.ano,
      mv.categoria,
      AVG(mv.variacao_percentual) AS variacao_media_preco,
      ra.variacao_dolar,
      COUNT(DISTINCT mv.id) AS total_medicamentos,
      -- Cálculo de impacto estimado
      CASE
        WHEN mv.categoria = 'Com Insumos Importados' THEN 
          GREATEST(0, LEAST(100, (ra.variacao_dolar * 0.4))) -- 40% do impacto cambial
        ELSE
          GREATEST(0, LEAST(100, (ra.variacao_dolar * 0.1))) -- 10% do impacto cambial
      END AS impacto_estimado,
      -- Cálculo simplificado de correlação
      CASE
        WHEN mv.categoria = 'Com Insumos Importados' THEN 
          CASE
            WHEN ABS(AVG(mv.variacao_percentual) - ra.variacao_dolar) < 5 THEN 0.9
            WHEN ABS(AVG(mv.variacao_percentual) - ra.variacao_dolar) < 10 THEN 0.7
            WHEN ABS(AVG(mv.variacao_percentual) - ra.variacao_dolar) < 20 THEN 0.5
            ELSE 0.3
          END
        ELSE
          CASE
            WHEN ABS(AVG(mv.variacao_percentual) - ra.variacao_dolar) < 5 THEN 0.5
            WHEN ABS(AVG(mv.variacao_percentual) - ra.variacao_dolar) < 10 THEN 0.3
            ELSE 0.1
          END
      END AS correlacao
    FROM
      medicamentos_variacao mv
      LEFT JOIN reajustes_anuais ra ON mv.ano = ra.ano
    WHERE
      mv.variacao_percentual BETWEEN -50 AND 50 -- Filtrar outliers extremos
    GROUP BY
      mv.ano, mv.categoria, ra.variacao_dolar
  )
  SELECT
    cf.ano,
    cf.categoria,
    cf.variacao_media_preco AS variacao_preco,
    cf.variacao_dolar AS variacao_cambial,
    cf.impacto_estimado,
    cf.correlacao,
    cf.total_medicamentos
  FROM
    calculos_finais cf
  ORDER BY
    cf.ano, cf.categoria;
END;
$$ LANGUAGE plpgsql;

-- ========================================================================
-- 6. PROJEÇÃO DE IMPACTO FINANCEIRO - Corrigido erro "DELETE requires a WHERE clause"
-- ========================================================================
CREATE OR REPLACE FUNCTION projecao_impacto_financeiro(
  ano_base INT,
  percentual_projetado NUMERIC
)
RETURNS TABLE (
  id TEXT,
  produto TEXT,
  laboratorio TEXT,
  preco_atual NUMERIC,
  preco_projetado NUMERIC,
  diferenca_absoluta NUMERIC,
  diferenca_percentual NUMERIC,
  impacto_estimado TEXT
) AS $$
BEGIN
  -- Criar tabela temporária para armazenar resultados
  DROP TABLE IF EXISTS temp_projecao;
  
  CREATE TEMPORARY TABLE temp_projecao AS
  WITH precos_base AS (
    SELECT
      m.id,
      m.produto,
      m.apresentacao,
      m.laboratorio,
      ph.pf_sem_impostos AS preco_atual,
      ph.pf_sem_impostos * (1 + (percentual_projetado / 100)) AS preco_projetado,
      (ph.pf_sem_impostos * (percentual_projetado / 100)) AS diferenca_absoluta,
      percentual_projetado AS diferenca_percentual,
      v.quantidade_vendida,
      (ph.pf_sem_impostos * (percentual_projetado / 100)) * v.quantidade_vendida AS impacto_total
    FROM
      medicamentos_base m
      JOIN precos_historico ph ON m.id = ph.medicamento_id
      LEFT JOIN vendas v ON m.id = v.medicamento_id AND v.ano = ano_base
    WHERE
      EXTRACT(YEAR FROM ph.data_publicacao) = ano_base
  )
  SELECT
    pb.id,
    pb.produto,
    pb.apresentacao,
    pb.laboratorio,
    pb.preco_atual,
    pb.preco_projetado,
    pb.diferenca_absoluta,
    pb.diferenca_percentual,
    pb.quantidade_vendida,
    pb.impacto_total,
    CASE
      WHEN pb.impacto_total > 1000000 THEN 'Alto'
      WHEN pb.impacto_total BETWEEN 100000 AND 1000000 THEN 'Médio'
      WHEN pb.impacto_total BETWEEN 10000 AND 100000 THEN 'Baixo'
      ELSE 'Insignificante'
    END AS impacto_estimado
  FROM
    precos_base pb;

  -- Retornar os resultados finais
  RETURN QUERY
  SELECT
    tp.id::TEXT,
    tp.produto,
    tp.laboratorio,
    tp.preco_atual,
    tp.preco_projetado,
    tp.diferenca_absoluta,
    tp.diferenca_percentual,
    tp.impacto_estimado
  FROM
    temp_projecao tp
  ORDER BY
    tp.impacto_total DESC
  LIMIT 1000;  -- Limitar o número de resultados
  
  -- Limpar tabela temporária ao final
  DROP TABLE IF EXISTS temp_projecao;
END;
$$ LANGUAGE plpgsql;
