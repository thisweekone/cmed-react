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
  total_medicamentos INT
) AS $$
BEGIN
  RETURN QUERY
  WITH medicamentos_com_historico AS (
    -- Medicamentos com pelo menos dois registros de preço para calcular variação
    SELECT 
      m.id,
      m.produto,
      m.classe_terapeutica,
      EXTRACT(YEAR FROM ph.data_publicacao)::INT AS ano,
      LAG(ph.pf_sem_impostos) OVER (PARTITION BY m.id ORDER BY ph.data_publicacao) AS preco_anterior,
      ph.pf_sem_impostos AS preco_atual
    FROM 
      medicamentos_base m
      JOIN precos_historico ph ON m.id = ph.medicamento_id
    WHERE 
      EXTRACT(YEAR FROM ph.data_publicacao) BETWEEN ano_inicio AND ano_fim
      AND m.classe_terapeutica IS NOT NULL
      AND m.classe_terapeutica != ''
  ),
  medicamentos_com_variacao AS (
    -- Calcular variação percentual para cada medicamento
    SELECT 
      mh.id,
      mh.produto,
      mh.classe_terapeutica,
      mh.ano,
      CASE 
        WHEN mh.preco_anterior > 0 THEN 
          ((mh.preco_atual - mh.preco_anterior) / mh.preco_anterior) * 100
        ELSE 0
      END AS variacao_percentual
    FROM 
      medicamentos_com_historico mh
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
-- 2. ANÁLISE DE CORRELAÇÃO COM CÂMBIO
-- ========================================================================
CREATE OR REPLACE FUNCTION analise_correlacao_cambio(
  ano_inicio INT,
  ano_fim INT
)
RETURNS TABLE (
  ano INT,
  variacao_preco_media NUMERIC,
  variacao_dolar NUMERIC,
  reajuste_cmed NUMERIC,
  correlacao_cambio_preco NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH precos_por_ano AS (
    -- Preços médios por ano
    SELECT 
      EXTRACT(YEAR FROM ph.data_publicacao)::INT AS ano,
      AVG(ph.pf_sem_impostos) AS preco_medio
    FROM 
      precos_historico ph
    WHERE 
      EXTRACT(YEAR FROM ph.data_publicacao) BETWEEN ano_inicio AND ano_fim
    GROUP BY 
      EXTRACT(YEAR FROM ph.data_publicacao)
    ORDER BY 
      ano
  ),
  medias_anuais AS (
    -- Calcular variação percentual para cada ano
    SELECT 
      pp.ano,
      pp.preco_medio,
      CASE
        WHEN LAG(pp.preco_medio) OVER (ORDER BY pp.ano) IS NULL THEN 0
        ELSE ((pp.preco_medio - LAG(pp.preco_medio) OVER (ORDER BY pp.ano)) / 
               LAG(pp.preco_medio) OVER (ORDER BY pp.ano)) * 100
      END AS variacao_media
    FROM 
      precos_por_ano pp
  )
  SELECT 
    ma.ano,
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
    END AS correlacao_cambio_preco
  FROM 
    medias_anuais ma
    JOIN reajustes_anuais ra ON ma.ano = ra.ano
  ORDER BY 
    ma.ano;
END;
$$ LANGUAGE plpgsql;

-- ========================================================================
-- 5. ANÁLISE DE GENÉRICOS VS REFERÊNCIA
-- ========================================================================
CREATE OR REPLACE FUNCTION analise_genericos_vs_referencia(
  ano_referencia INT,
  tipo TEXT DEFAULT 'ambos'
)
RETURNS TABLE (
  id INT,
  produto TEXT,
  apresentacao TEXT,
  laboratorio TEXT,
  tipo_de_produto TEXT,
  pf_sem_impostos_anterior NUMERIC,
  pf_sem_impostos NUMERIC,
  variacao_percentual NUMERIC,
  reajuste_cmed NUMERIC,
  diferenca NUMERIC,
  tipo_outlier TEXT
) AS $$
DECLARE
  reajuste NUMERIC;
  desvio_padrao NUMERIC;
BEGIN
  -- Obter reajuste CMED do ano de referência
  SELECT percentual INTO reajuste
  FROM reajustes_anuais
  WHERE ano = ano_referencia;
  
  -- Calcular variações
  WITH medicamentos_ano_anterior AS (
    -- Preços do ano anterior
    SELECT 
      m.id,
      m.produto,
      m.apresentacao,
      m.laboratorio,
      m.tipo_de_produto,
      ph.pf_sem_impostos
    FROM 
      medicamentos_base m
      JOIN precos_historico ph ON m.id = ph.medicamento_id
    WHERE 
      EXTRACT(YEAR FROM ph.data_publicacao) = ano_referencia - 1
  ),
  medicamentos_ano_atual AS (
    -- Preços do ano atual
    SELECT 
      m.id,
      m.produto,
      m.apresentacao,
      m.laboratorio,
      m.tipo_de_produto,
      ph.pf_sem_impostos
    FROM 
      medicamentos_base m
      JOIN precos_historico ph ON m.id = ph.medicamento_id
    WHERE 
      EXTRACT(YEAR FROM ph.data_publicacao) = ano_referencia
  ),
  medicamentos_com_variacao AS (
    -- Medicamentos com preços em ambos os anos para cálculo de variação
    SELECT 
      maa.id,
      maa.produto,
      maa.apresentacao,
      maa.laboratorio,
      maa.tipo_de_produto,
      mant.pf_sem_impostos AS pf_sem_impostos_anterior,
      maa.pf_sem_impostos,
      ((maa.pf_sem_impostos - mant.pf_sem_impostos) / mant.pf_sem_impostos) * 100 AS variacao_percentual,
      reajuste AS reajuste_cmed,
      ((maa.pf_sem_impostos - mant.pf_sem_impostos) / mant.pf_sem_impostos) * 100 - reajuste AS diferenca
    FROM 
      medicamentos_ano_atual maa
      JOIN medicamentos_ano_anterior mant ON maa.id = mant.id
    WHERE 
      mant.pf_sem_impostos > 0
  ),
  estatisticas AS (
    -- Calcular estatísticas para determinar outliers
    SELECT 
      AVG(mcv.diferenca) AS media,
      STDDEV(mcv.diferenca) AS desvio_padrao
    FROM 
      medicamentos_com_variacao mcv
    WHERE 
      mcv.variacao_percentual BETWEEN -50 AND 50 -- Filtrar outliers extremos iniciais
  )
  SELECT 
    mcv.id,
    mcv.produto,
    mcv.apresentacao,
    mcv.laboratorio,
    mcv.tipo_de_produto,
    mcv.pf_sem_impostos_anterior,
    mcv.pf_sem_impostos,
    mcv.variacao_percentual,
    mcv.reajuste_cmed,
    mcv.diferenca,
    CASE
      WHEN mcv.diferenca > (SELECT e.media + 2 * e.desvio_padrao FROM estatisticas e) THEN 'positivo'
      WHEN mcv.diferenca < (SELECT e.media - 2 * e.desvio_padrao FROM estatisticas e) THEN 'negativo'
      ELSE 'normal'
    END AS tipo_outlier
  FROM 
    medicamentos_com_variacao mcv
  WHERE 
    mcv.variacao_percentual BETWEEN -50 AND 50 -- Filtrar outliers extremos
    AND (
      (tipo = 'ambos') OR
      (tipo = 'generico' AND mcv.tipo_de_produto = 'GENÉRICO') OR
      (tipo = 'referencia' AND mcv.tipo_de_produto = 'REFERÊNCIA')
    )
  ORDER BY 
    mcv.diferenca DESC;
END;
$$ LANGUAGE plpgsql;

-- ========================================================================
-- 6. PROJEÇÃO DE IMPACTO FINANCEIRO
-- ========================================================================
CREATE OR REPLACE FUNCTION projecao_impacto_financeiro(
  ano_inicio INT,
  ano_fim INT,
  anos_projecao INT DEFAULT 3,
  cenario TEXT DEFAULT 'medio'
)
RETURNS TABLE (
  ano INT,
  preco_medio NUMERIC,
  variacao_percentual NUMERIC,
  impacto_acumulado NUMERIC,
  projetado BOOLEAN
) AS $$
DECLARE
  fator_ajuste NUMERIC;
  variacao_media NUMERIC;
  preco_base NUMERIC;
BEGIN
  -- Definir fator de ajuste baseado no cenário
  IF cenario = 'otimista' THEN
    fator_ajuste := 0.8;
  ELSIF cenario = 'pessimista' THEN
    fator_ajuste := 1.2;
  ELSE
    fator_ajuste := 1.0;
  END IF;
  
  -- Criar tabela temporária
  DROP TABLE IF EXISTS temp_precos_historicos;
  CREATE TEMPORARY TABLE IF NOT EXISTS temp_precos_historicos (
    ano INT,
    preco_medio NUMERIC,
    variacao_percentual NUMERIC,
    impacto_acumulado NUMERIC,
    projetado BOOLEAN
  );
  
  -- Inserir dados históricos
  INSERT INTO temp_precos_historicos
  WITH precos_por_ano AS (
    SELECT 
      EXTRACT(YEAR FROM ph.data_publicacao)::INT AS ano,
      AVG(ph.pf_sem_impostos) AS preco_medio
    FROM 
      precos_historico ph
    WHERE 
      EXTRACT(YEAR FROM ph.data_publicacao) BETWEEN ano_inicio AND ano_fim
    GROUP BY 
      EXTRACT(YEAR FROM ph.data_publicacao)
    ORDER BY 
      ano
  )
  SELECT 
    pp.ano,
    pp.preco_medio,
    CASE
      WHEN LAG(pp.preco_medio) OVER (ORDER BY pp.ano) IS NULL THEN 0
      ELSE ((pp.preco_medio - LAG(pp.preco_medio) OVER (ORDER BY pp.ano)) / 
             LAG(pp.preco_medio) OVER (ORDER BY pp.ano)) * 100
    END AS variacao_percentual,
    CASE
      WHEN pp.ano = ano_inicio THEN 0
      ELSE ((pp.preco_medio - FIRST_VALUE(pp.preco_medio) OVER (ORDER BY pp.ano)) / 
             FIRST_VALUE(pp.preco_medio) OVER (ORDER BY pp.ano)) * 100
    END AS impacto_acumulado,
    FALSE AS projetado
  FROM 
    precos_por_ano pp;
  
  -- Calcular variação média histórica para projeção
  SELECT AVG(th.variacao_percentual) INTO variacao_media
  FROM temp_precos_historicos th
  WHERE th.ano > ano_inicio;
  
  -- Ajustar variação média conforme o cenário
  variacao_media := variacao_media * fator_ajuste;
  
  -- Obter o último preço médio conhecido
  SELECT th.preco_medio INTO preco_base
  FROM temp_precos_historicos th
  WHERE th.ano = ano_fim;
  
  -- Criar projeções
  INSERT INTO temp_precos_historicos
  SELECT 
    ano_fim + generate_series(1, anos_projecao) AS ano,
    preco_base * POWER(1 + variacao_media/100, generate_series(1, anos_projecao)) AS preco_medio,
    variacao_media AS variacao_percentual,
    ((preco_base * POWER(1 + variacao_media/100, generate_series(1, anos_projecao)) - preco_base) / preco_base) * 100 AS impacto_acumulado,
    TRUE AS projetado;
  
  -- Retornar resultados
  RETURN QUERY
  SELECT 
    tph.ano,
    tph.preco_medio,
    tph.variacao_percentual,
    tph.impacto_acumulado,
    tph.projetado
  FROM 
    temp_precos_historicos tph
  ORDER BY 
    tph.ano;
  
  -- Limpar tabela temporária
  DROP TABLE IF EXISTS temp_precos_historicos;
END;
$$ LANGUAGE plpgsql;
