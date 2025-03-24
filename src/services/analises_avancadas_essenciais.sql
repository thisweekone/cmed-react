-- Script com apenas as funções essenciais para o dashboard
-- Remover funções existentes para evitar conflitos
DROP FUNCTION IF EXISTS obter_anos_disponiveis();
DROP FUNCTION IF EXISTS analise_por_categoria_terapeutica(INT, INT);
DROP FUNCTION IF EXISTS analise_genericos_vs_referencia(INT, INT);
DROP FUNCTION IF EXISTS analise_elasticidade_por_faixa(INT, INT);
DROP FUNCTION IF EXISTS analise_elasticidade_por_faixa(INT);
DROP FUNCTION IF EXISTS projecao_impacto_financeiro(INT, NUMERIC);
DROP FUNCTION IF EXISTS obter_projecoes_reajuste(INT);
DROP FUNCTION IF EXISTS analise_impacto_cambial(INT, INT);

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
-- 2. ANÁLISE GENÉRICOS vs REFERÊNCIA
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
  WITH medicamentos_agregados AS (
    SELECT 
      EXTRACT(YEAR FROM ph.data_publicacao)::INT AS ano_med,
      m.tipo_de_produto,
      AVG((ph.pf_sem_impostos - LAG(ph.pf_sem_impostos) OVER (
          PARTITION BY m.id ORDER BY ph.data_publicacao)
        ) / NULLIF(LAG(ph.pf_sem_impostos) OVER (
          PARTITION BY m.id ORDER BY ph.data_publicacao), 0) * 100
      ) AS variacao_media,
      COUNT(DISTINCT m.id) AS total_medicamentos
    FROM 
      medicamentos_base m
      JOIN precos_historico ph ON m.id = ph.medicamento_id
    WHERE 
      EXTRACT(YEAR FROM ph.data_publicacao) BETWEEN ano_inicio AND ano_fim
      AND m.tipo_de_produto IN ('Genérico', 'Referência')
    GROUP BY 
      ano_med, m.tipo_de_produto
    HAVING 
      COUNT(DISTINCT m.id) > 5
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
-- 3. PROJEÇÃO DE IMPACTO FINANCEIRO
-- ========================================================================
CREATE OR REPLACE FUNCTION projecao_impacto_financeiro(
  ano_referencia INT,
  percentual_projecao NUMERIC DEFAULT NULL
)
RETURNS TABLE (
  ano INT,
  preco_medio NUMERIC,
  variacao_percentual NUMERIC,
  projetado BOOLEAN
) AS $$
DECLARE
  ultimo_ano INT;
  fator_ajuste NUMERIC;
  reajuste_cmed NUMERIC;
BEGIN
  -- Obter o último ano com dados
  SELECT MAX(EXTRACT(YEAR FROM data_publicacao))::INT
  INTO ultimo_ano
  FROM precos_historico;
  
  -- Se o percentual de projeção for NULL, usar o último reajuste CMED
  IF percentual_projecao IS NULL THEN
    SELECT percentual
    INTO reajuste_cmed
    FROM reajustes_anuais
    WHERE ano = ultimo_ano;
    
    percentual_projecao := COALESCE(reajuste_cmed, 5.0); -- 5% como padrão se não houver reajuste
  END IF;
  
  -- Converter percentual para fator
  fator_ajuste := 1 + (percentual_projecao / 100.0);
  
  -- Se o percentual for zero ou negativo, usar 1.0 (sem ajuste)
  IF fator_ajuste <= 0 THEN
    fator_ajuste := 1.0;
  END IF;
  
  -- Substituir DELETE por DROP para garantir limpeza segura
  DROP TABLE IF EXISTS temp_precos_historicos;
  
  -- Criar tabela temporária para resultados
  CREATE TEMPORARY TABLE temp_precos_historicos (
    ano INT,
    preco_medio NUMERIC,
    variacao_percentual NUMERIC,
    projetado BOOLEAN
  );
  
  -- Inserir dados históricos
  INSERT INTO temp_precos_historicos
  WITH precos_por_ano AS (
    SELECT 
      EXTRACT(YEAR FROM ph.data_publicacao)::INT AS ano_med,
      AVG(ph.pf_sem_impostos) AS preco_medio
    FROM 
      precos_historico ph
    GROUP BY 
      ano_med
    ORDER BY 
      ano_med
  )
  SELECT 
    ppa.ano_med AS ano,
    ppa.preco_medio,
    (ppa.preco_medio - LAG(ppa.preco_medio) OVER (ORDER BY ppa.ano_med)) / 
      NULLIF(LAG(ppa.preco_medio) OVER (ORDER BY ppa.ano_med), 0) * 100 AS variacao_percentual,
    FALSE AS projetado
  FROM 
    precos_por_ano ppa;
  
  -- Inserir projeção para o próximo ano
  INSERT INTO temp_precos_historicos
  SELECT 
    ultimo_ano + 1 AS ano,
    (SELECT preco_medio FROM temp_precos_historicos WHERE ano = ultimo_ano) * fator_ajuste AS preco_medio,
    percentual_projecao AS variacao_percentual,
    TRUE AS projetado;
  
  -- Inserir projeção para dois anos à frente
  INSERT INTO temp_precos_historicos
  SELECT 
    ultimo_ano + 2 AS ano,
    (SELECT preco_medio FROM temp_precos_historicos WHERE ano = ultimo_ano + 1) * fator_ajuste AS preco_medio,
    percentual_projecao AS variacao_percentual,
    TRUE AS projetado;
  
  -- Retornar resultados
  RETURN QUERY
  SELECT 
    tph.ano,
    tph.preco_medio,
    tph.variacao_percentual,
    tph.projetado
  FROM 
    temp_precos_historicos tph
  ORDER BY 
    tph.ano;
    
  -- Limpar tabela temporária ao finalizar
  DROP TABLE IF EXISTS temp_precos_historicos;
END;
$$ LANGUAGE plpgsql;

-- ========================================================================
-- 4. OBTER PROJEÇÕES DE REAJUSTE
-- ========================================================================
CREATE OR REPLACE FUNCTION obter_projecoes_reajuste(
  anos_historico INT DEFAULT 5
)
RETURNS TABLE (
  metodo TEXT,
  projecao NUMERIC,
  descricao TEXT
) AS $$
DECLARE
  media_reajustes NUMERIC;
  media_ponderada NUMERIC;
  mediana_reajustes NUMERIC;
  inflacao_atual NUMERIC;
  tendencia_linear NUMERIC;
  peso_total NUMERIC;
BEGIN
  -- 1. Calcular média histórica
  SELECT AVG(percentual)
  INTO media_reajustes
  FROM (
    SELECT percentual 
    FROM reajustes_anuais
    ORDER BY ano DESC
    LIMIT anos_historico
  ) AS ultimos_reajustes;
  
  -- 2. Calcular média ponderada (anos mais recentes têm peso maior)
  SELECT 
    SUM(percentual * peso) / NULLIF(SUM(peso), 0)
  INTO 
    media_ponderada
  FROM (
    SELECT 
      percentual, 
      ROW_NUMBER() OVER (ORDER BY ano DESC) AS peso
    FROM 
      reajustes_anuais
    ORDER BY 
      ano DESC
    LIMIT 
      anos_historico
  ) AS reajustes_com_peso;
  
  -- 3. Tentar obter a inflação atual (IPCA) do último ano disponível
  SELECT ipca_ano
  INTO inflacao_atual
  FROM reajustes_anuais
  ORDER BY ano DESC
  LIMIT 1;
  
  -- 4. Calcular tendência linear simples (variação da média)
  SELECT 
    COALESCE(
      (
        (SELECT AVG(percentual) FROM reajustes_anuais WHERE ano > (SELECT MAX(ano) - (anos_historico/2) FROM reajustes_anuais)) -
        (SELECT AVG(percentual) FROM reajustes_anuais WHERE ano <= (SELECT MAX(ano) - (anos_historico/2) FROM reajustes_anuais) AND ano > (SELECT MAX(ano) - anos_historico FROM reajustes_anuais))
      ) / GREATEST(anos_historico/2, 1),
      0
    ) + COALESCE(media_reajustes, 0)
  INTO 
    tendencia_linear;
  
  -- Ajustar tendência se for muito diferente da média
  IF ABS(tendencia_linear - COALESCE(media_reajustes, 0)) > 5 THEN
    tendencia_linear := COALESCE(media_reajustes, 0) + (SIGN(tendencia_linear - COALESCE(media_reajustes, 0)) * 5);
  END IF;
  
  -- Calcular mediana
  SELECT percentil
  INTO mediana_reajustes
  FROM (
    SELECT percentual AS percentil, ROW_NUMBER() OVER (ORDER BY percentual) AS rn, COUNT(*) OVER() AS cnt
    FROM (
      SELECT percentual
      FROM reajustes_anuais
      ORDER BY ano DESC
      LIMIT anos_historico
    ) AS t
  ) AS x
  WHERE rn = (cnt + 1) / 2
  OR rn = cnt / 2;
  
  -- Retornar resultados
  RETURN QUERY
  SELECT 'Média Histórica' AS metodo, 
         ROUND(COALESCE(media_reajustes, 0)::numeric, 2) AS projecao, 
         'Média dos últimos ' || anos_historico || ' anos' AS descricao
  UNION ALL
  SELECT 'Média Ponderada' AS metodo, 
         ROUND(COALESCE(media_ponderada, 0)::numeric, 2) AS projecao, 
         'Maior peso para anos recentes' AS descricao
  UNION ALL
  SELECT 'Mediana' AS metodo, 
         ROUND(COALESCE(mediana_reajustes, 0)::numeric, 2) AS projecao, 
         'Valor central dos últimos ' || anos_historico || ' anos' AS descricao
  UNION ALL
  SELECT 'IPCA Atual' AS metodo, 
         ROUND(COALESCE(inflacao_atual, COALESCE(media_reajustes, 0))::numeric, 2) AS projecao, 
         'Baseado no IPCA atual' AS descricao
  UNION ALL
  SELECT 'Tendência Linear' AS metodo, 
         ROUND(COALESCE(tendencia_linear, 0)::numeric, 2) AS projecao, 
         'Projeção baseada na tendência' AS descricao;
END;
$$ LANGUAGE plpgsql;
