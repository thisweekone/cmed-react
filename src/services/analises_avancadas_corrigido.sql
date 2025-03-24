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

-- Função para obter a definição de uma função SQL
CREATE OR REPLACE FUNCTION pg_get_function_def(p_schema_name TEXT, p_function_name TEXT)
RETURNS TEXT AS
$$
DECLARE
    v_result TEXT;
BEGIN
    SELECT pg_get_functiondef(p.oid)
    INTO v_result
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = p_schema_name
    AND p.proname = p_function_name;
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

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
      m.tipo_de_produto,
      m.classe_terapeutica,
      EXTRACT(YEAR FROM ph1.data_publicacao)::INT AS ano,
      ph1.preco_maximo_consumidor AS preco_atual,
      LAG(ph1.preco_maximo_consumidor) OVER (PARTITION BY m.id ORDER BY ph1.data_publicacao) AS preco_anterior
    FROM 
      medicamentos m
      JOIN precos_historico ph1 ON m.id = ph1.medicamento_id
    WHERE 
      EXTRACT(YEAR FROM ph1.data_publicacao) BETWEEN ano_inicio AND ano_fim
  ),
  medicamentos_com_variacao AS (
    SELECT 
      mh.id,
      mh.ano,
      mh.classe_terapeutica,
      ((mh.preco_atual - mh.preco_anterior) / NULLIF(mh.preco_anterior, 0)) * 100 AS variacao_percentual
    FROM 
      medicamentos_historico mh
    WHERE 
      mh.preco_anterior IS NOT NULL
  )
  SELECT 
    mcv.ano AS ano,
    mcv.classe_terapeutica AS classe_terapeutica,
    AVG(mcv.variacao_percentual) AS variacao_media,
    ra.percentual AS reajuste_cmed,
    AVG(mcv.variacao_percentual) - ra.percentual AS diferenca,
    COUNT(DISTINCT mcv.id) AS total_medicamentos
  FROM 
    medicamentos_com_variacao mcv
    LEFT JOIN reajustes_anuais ra ON mcv.ano = ra.ano
  WHERE 
    mcv.variacao_percentual BETWEEN -50 AND 50 -- Filtrar outliers extremos
  GROUP BY 
    mcv.ano, mcv.classe_terapeutica, ra.percentual
  ORDER BY 
    mcv.ano, mcv.classe_terapeutica;
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
      EXTRACT(YEAR FROM ph.data_publicacao)::INT AS ano,
      m.tipo_de_produto,
      AVG((ph.preco_maximo_consumidor - LAG(ph.preco_maximo_consumidor) OVER (
          PARTITION BY m.id ORDER BY ph.data_publicacao)
        ) / NULLIF(LAG(ph.preco_maximo_consumidor) OVER (
          PARTITION BY m.id ORDER BY ph.data_publicacao), 0) * 100
      ) AS variacao_media,
      COUNT(DISTINCT m.id) AS total_medicamentos
    FROM 
      medicamentos m
      JOIN precos_historico ph ON m.id = ph.medicamento_id
    WHERE 
      EXTRACT(YEAR FROM ph.data_publicacao) BETWEEN ano_inicio AND ano_fim
      AND m.tipo_de_produto IN ('Genérico', 'Referência')
    GROUP BY 
      ano, m.tipo_de_produto
    HAVING 
      COUNT(DISTINCT m.id) > 5
  )
  SELECT 
    ma.ano,
    ma.tipo_produto,
    ma.variacao_media AS variacao_preco_media,
    ra.variacao_dolar,
    ra.percentual AS reajuste_cmed,
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
    LEFT JOIN reajustes_anuais ra ON ma.ano = ra.ano
  ORDER BY 
    ma.ano, ma.tipo_produto;
END;
$$ LANGUAGE plpgsql;

-- ========================================================================
-- 3. ANÁLISE DE ELASTICIDADE POR FAIXA DE PREÇO
-- ========================================================================
CREATE OR REPLACE FUNCTION analise_elasticidade_por_faixa(
  ano_referencia INT,
  faixas_preco INT DEFAULT 5
)
RETURNS TABLE (
  faixa_preco TEXT,
  preco_minimo NUMERIC,
  preco_maximo NUMERIC,
  variacao_media NUMERIC,
  elasticidade NUMERIC,
  total_medicamentos BIGINT
) AS $$
DECLARE
  reajuste NUMERIC;
  faixa_tamanho NUMERIC;
  preco_min NUMERIC;
  preco_max NUMERIC;
  desvio_padrao NUMERIC;
BEGIN
  -- Obter reajuste CMED do ano de referência
  SELECT percentual INTO reajuste
  FROM reajustes_anuais
  WHERE ano = ano_referencia;
  
  -- Obter estatísticas para definir faixas
  SELECT 
    MIN(ph.preco_maximo_consumidor), 
    MAX(ph.preco_maximo_consumidor),
    STDDEV(ph.preco_maximo_consumidor)
  INTO 
    preco_min, 
    preco_max,
    desvio_padrao
  FROM 
    precos_historico ph
  WHERE 
    EXTRACT(YEAR FROM ph.data_publicacao) = ano_referencia;
    
  -- Ajuste se não houver desvio padrão
  IF desvio_padrao IS NULL OR desvio_padrao = 0 THEN
    desvio_padrao := (preco_max - preco_min) / 10;
  END IF;
  
  -- Calcular tamanho de cada faixa
  faixa_tamanho := (preco_max - preco_min) / faixas_preco;
  
  RETURN QUERY
  WITH medicamentos_faixas AS (
    SELECT 
      m.id,
      m.produto,
      CASE 
        WHEN faixas_preco = 5 THEN -- Uso de faixas predefinidas para 5 categorias
          CASE 
            WHEN ph.preco_maximo_consumidor < preco_min + faixa_tamanho THEN 'Faixa 1: Preço Baixo'
            WHEN ph.preco_maximo_consumidor < preco_min + (faixa_tamanho * 2) THEN 'Faixa 2: Preço Médio-Baixo'
            WHEN ph.preco_maximo_consumidor < preco_min + (faixa_tamanho * 3) THEN 'Faixa 3: Preço Médio'
            WHEN ph.preco_maximo_consumidor < preco_min + (faixa_tamanho * 4) THEN 'Faixa 4: Preço Médio-Alto'
            ELSE 'Faixa 5: Preço Alto'
          END
        ELSE -- Uso de faixas numéricas para outros casos
          'Faixa ' || FLOOR((ph.preco_maximo_consumidor - preco_min) / faixa_tamanho) + 1
      END AS faixa_preco,
      -- Min e Max da faixa
      CASE 
        WHEN FLOOR((ph.preco_maximo_consumidor - preco_min) / faixa_tamanho) = 0 THEN preco_min
        ELSE preco_min + (FLOOR((ph.preco_maximo_consumidor - preco_min) / faixa_tamanho) * faixa_tamanho)
      END AS faixa_min,
      CASE 
        WHEN FLOOR((ph.preco_maximo_consumidor - preco_min) / faixa_tamanho) >= faixas_preco - 1 THEN preco_max
        ELSE preco_min + ((FLOOR((ph.preco_maximo_consumidor - preco_min) / faixa_tamanho) + 1) * faixa_tamanho)
      END AS faixa_max,
      -- Cálculo de variação percentual
      ((ph_posterior.preco_maximo_consumidor - ph.preco_maximo_consumidor) / NULLIF(ph.preco_maximo_consumidor, 0)) * 100 AS variacao_percentual
    FROM 
      medicamentos m
      JOIN precos_historico ph ON m.id = ph.medicamento_id
      -- Join com o próximo preço no histórico
      LEFT JOIN precos_historico ph_posterior ON 
        m.id = ph_posterior.medicamento_id AND
        ph.data_publicacao < ph_posterior.data_publicacao AND
        NOT EXISTS (
          SELECT 1 FROM precos_historico ph_between
          WHERE ph_between.medicamento_id = m.id
            AND ph_between.data_publicacao > ph.data_publicacao
            AND ph_between.data_publicacao < ph_posterior.data_publicacao
        )
    WHERE 
      EXTRACT(YEAR FROM ph.data_publicacao) = ano_referencia
      AND ph_posterior.preco_maximo_consumidor IS NOT NULL
  )
  SELECT 
    mf.faixa_preco,
    MIN(mf.faixa_min) AS preco_minimo,
    MAX(mf.faixa_max) AS preco_maximo,
    AVG(mf.variacao_percentual) AS variacao_media,
    CASE 
      WHEN reajuste > 0 THEN AVG(mf.variacao_percentual) / reajuste
      ELSE NULL
    END AS elasticidade,
    COUNT(DISTINCT mf.id) AS total_medicamentos
  FROM 
    medicamentos_faixas mf
  WHERE 
    mf.variacao_percentual BETWEEN -50 AND 50 -- Filtrar outliers extremos
  GROUP BY 
    mf.faixa_preco
  HAVING
    COUNT(DISTINCT mf.id) >= 5
  ORDER BY 
    MIN(mf.faixa_min);
END;
$$ LANGUAGE plpgsql;

-- ========================================================================
-- 4. PROJEÇÃO DE IMPACTO FINANCEIRO
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
  
  -- Criar tabela temporária
  DROP TABLE IF EXISTS temp_precos_historicos;
  CREATE TEMPORARY TABLE IF NOT EXISTS temp_precos_historicos (
    ano INT,
    preco_medio NUMERIC,
    variacao_percentual NUMERIC,
    projetado BOOLEAN
  );
  
  -- Inserir dados históricos
  INSERT INTO temp_precos_historicos
  WITH precos_por_ano AS (
    SELECT 
      EXTRACT(YEAR FROM ph.data_publicacao)::INT AS ano,
      AVG(ph.preco_maximo_consumidor) AS preco_medio
    FROM 
      precos_historico ph
    GROUP BY 
      ano
    ORDER BY 
      ano
  )
  SELECT 
    ppa.ano,
    ppa.preco_medio,
    (ppa.preco_medio - LAG(ppa.preco_medio) OVER (ORDER BY ppa.ano)) / 
      NULLIF(LAG(ppa.preco_medio) OVER (ORDER BY ppa.ano), 0) * 100 AS variacao_percentual,
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
-- 5. OBTER PROJEÇÕES DE REAJUSTE
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
    SUM(percentual * peso) / SUM(peso)
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
        (SELECT AVG(percentual) FROM reajustes_anuais WHERE ano <= (SELECT MAX(ano) - (anos_historico/2) FROM reajustes_anuais))
      ) / (anos_historico/2),
      0
    ) + media_reajustes
  INTO 
    tendencia_linear;
  
  -- Ajustar tendência se for muito diferente da média
  IF ABS(tendencia_linear - media_reajustes) > 5 THEN
    tendencia_linear := media_reajustes + (SIGN(tendencia_linear - media_reajustes) * 5);
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
         ROUND(media_reajustes::numeric, 2) AS projecao, 
         'Média dos últimos ' || anos_historico || ' anos' AS descricao
  UNION ALL
  SELECT 'Média Ponderada' AS metodo, 
         ROUND(media_ponderada::numeric, 2) AS projecao, 
         'Maior peso para anos recentes' AS descricao
  UNION ALL
  SELECT 'Mediana' AS metodo, 
         ROUND(mediana_reajustes::numeric, 2) AS projecao, 
         'Valor central dos últimos ' || anos_historico || ' anos' AS descricao
  UNION ALL
  SELECT 'IPCA Atual' AS metodo, 
         ROUND(COALESCE(inflacao_atual, media_reajustes)::numeric, 2) AS projecao, 
         'Baseado no IPCA atual' AS descricao
  UNION ALL
  SELECT 'Tendência Linear' AS metodo, 
         ROUND(tendencia_linear::numeric, 2) AS projecao, 
         'Projeção baseada na tendência' AS descricao;
END;
$$ LANGUAGE plpgsql;
