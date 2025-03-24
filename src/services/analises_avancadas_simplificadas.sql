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

-- ANÁLISE POR CATEGORIA TERAPÊUTICA
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
    SELECT 
      id,
      produto,
      classe_terapeutica,
      ano,
      CASE 
        WHEN preco_anterior > 0 THEN 
          ((preco_atual - preco_anterior) / preco_anterior) * 100
        ELSE 0
      END AS variacao_percentual
    FROM 
      medicamentos_com_historico
    WHERE 
      preco_anterior IS NOT NULL
  )
  SELECT 
    mcv.ano,
    mcv.classe_terapeutica,
    AVG(mcv.variacao_percentual) AS variacao_media,
    ra.percentual_reajuste AS reajuste_cmed,
    AVG(mcv.variacao_percentual) - ra.percentual_reajuste AS diferenca,
    COUNT(DISTINCT mcv.id) AS total_medicamentos
  FROM 
    medicamentos_com_variacao mcv
    LEFT JOIN reajustes_anuais ra ON mcv.ano = ra.ano
  WHERE 
    mcv.variacao_percentual BETWEEN -50 AND 50
  GROUP BY 
    mcv.ano, mcv.classe_terapeutica, ra.percentual_reajuste
  ORDER BY 
    mcv.ano, mcv.classe_terapeutica;
END;
$$ LANGUAGE plpgsql;

-- ANÁLISE DE IMPACTO CAMBIAL
CREATE OR REPLACE FUNCTION analise_impacto_cambial(
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
  WITH medicamentos_com_variacao AS (
    SELECT 
      EXTRACT(YEAR FROM ph.data_publicacao)::INT AS ano,
      m.id,
      m.produto,
      LAG(ph.pf_sem_impostos) OVER (PARTITION BY m.id ORDER BY ph.data_publicacao) AS preco_anterior,
      ph.pf_sem_impostos AS preco_atual
    FROM 
      medicamentos_base m
      JOIN precos_historico ph ON m.id = ph.medicamento_id
    WHERE 
      EXTRACT(YEAR FROM ph.data_publicacao) BETWEEN ano_inicio AND ano_fim
  ),
  medicamentos_variacao_calculada AS (
    SELECT 
      ano,
      id,
      produto,
      CASE 
        WHEN preco_anterior > 0 THEN 
          ((preco_atual - preco_anterior) / preco_anterior) * 100
        ELSE 0
      END AS variacao_percentual
    FROM 
      medicamentos_com_variacao
    WHERE 
      preco_anterior IS NOT NULL
  ),
  medias_anuais AS (
    SELECT 
      ano,
      AVG(variacao_percentual) AS variacao_media
    FROM 
      medicamentos_variacao_calculada
    WHERE 
      variacao_percentual BETWEEN -50 AND 50
    GROUP BY 
      ano
  )
  SELECT 
    ma.ano,
    ma.variacao_media AS variacao_preco_media,
    ra.variacao_dolar,
    ra.percentual_reajuste AS reajuste_cmed,
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

-- ANÁLISE DE ELASTICIDADE POR FAIXA DE PREÇO
CREATE OR REPLACE FUNCTION analise_elasticidade_por_faixa(
  ano_referencia INT
)
RETURNS TABLE (
  faixa_preco TEXT,
  variacao_media NUMERIC,
  reajuste_cmed NUMERIC,
  diferenca NUMERIC,
  elasticidade NUMERIC,
  total_medicamentos INT
) AS $$
DECLARE
  reajuste_valor NUMERIC;
BEGIN
  SELECT percentual_reajuste INTO reajuste_valor 
  FROM reajustes_anuais 
  WHERE ano = ano_referencia;

  RETURN QUERY
  WITH medicamentos_ano_anterior AS (
    SELECT 
      m.id,
      m.produto,
      ph.pf_sem_impostos
    FROM 
      medicamentos_base m
      JOIN precos_historico ph ON m.id = ph.medicamento_id
    WHERE 
      EXTRACT(YEAR FROM ph.data_publicacao) = ano_referencia - 1
  ),
  medicamentos_ano_atual AS (
    SELECT 
      m.id,
      m.produto,
      ph.pf_sem_impostos
    FROM 
      medicamentos_base m
      JOIN precos_historico ph ON m.id = ph.medicamento_id
    WHERE 
      EXTRACT(YEAR FROM ph.data_publicacao) = ano_referencia
  ),
  medicamentos_com_variacao AS (
    SELECT 
      maa.id,
      maa.produto,
      CASE
        WHEN mant.pf_sem_impostos < 50 THEN 'Até R$ 50'
        WHEN mant.pf_sem_impostos < 100 THEN 'R$ 50 a R$ 100'
        WHEN mant.pf_sem_impostos < 200 THEN 'R$ 100 a R$ 200'
        WHEN mant.pf_sem_impostos < 500 THEN 'R$ 200 a R$ 500'
        WHEN mant.pf_sem_impostos < 1000 THEN 'R$ 500 a R$ 1.000'
        ELSE 'Acima de R$ 1.000'
      END AS faixa_preco,
      mant.pf_sem_impostos AS preco_anterior,
      maa.pf_sem_impostos AS preco_atual,
      ((maa.pf_sem_impostos - mant.pf_sem_impostos) / mant.pf_sem_impostos) * 100 AS variacao_percentual
    FROM 
      medicamentos_ano_atual maa
      JOIN medicamentos_ano_anterior mant ON maa.id = mant.id
  )
  SELECT 
    mcv.faixa_preco,
    AVG(mcv.variacao_percentual) AS variacao_media,
    reajuste_valor AS reajuste_cmed,
    AVG(mcv.variacao_percentual) - reajuste_valor AS diferenca,
    CASE 
      WHEN reajuste_valor > 0 THEN
        AVG(mcv.variacao_percentual) / reajuste_valor
      ELSE 1.0
    END AS elasticidade,
    COUNT(DISTINCT mcv.id) AS total_medicamentos
  FROM 
    medicamentos_com_variacao mcv
  WHERE 
    mcv.variacao_percentual BETWEEN -50 AND 50
    AND mcv.preco_anterior > 0
  GROUP BY 
    mcv.faixa_preco
  ORDER BY 
    MIN(mcv.preco_anterior);
END;
$$ LANGUAGE plpgsql;

-- ANÁLISE DE GENÉRICOS VS. REFERÊNCIA
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
  total_medicamentos INT
) AS $$
BEGIN
  RETURN QUERY
  WITH medicamentos_com_historico AS (
    SELECT 
      m.id,
      m.produto,
      m.tipo_produto,
      EXTRACT(YEAR FROM ph.data_publicacao)::INT AS ano,
      LAG(ph.pf_sem_impostos) OVER (PARTITION BY m.id ORDER BY ph.data_publicacao) AS preco_anterior,
      ph.pf_sem_impostos AS preco_atual
    FROM 
      medicamentos_base m
      JOIN precos_historico ph ON m.id = ph.medicamento_id
    WHERE 
      EXTRACT(YEAR FROM ph.data_publicacao) BETWEEN ano_inicio AND ano_fim
      AND m.tipo_produto IN ('GENÉRICO', 'REFERÊNCIA', 'SIMILAR')
  ),
  medicamentos_com_variacao AS (
    SELECT 
      id,
      produto,
      tipo_produto,
      ano,
      CASE 
        WHEN preco_anterior > 0 THEN 
          ((preco_atual - preco_anterior) / preco_anterior) * 100
        ELSE 0
      END AS variacao_percentual
    FROM 
      medicamentos_com_historico
    WHERE 
      preco_anterior IS NOT NULL
  )
  SELECT 
    mcv.ano,
    mcv.tipo_produto,
    AVG(mcv.variacao_percentual) AS variacao_media,
    ra.percentual_reajuste AS reajuste_cmed,
    AVG(mcv.variacao_percentual) - ra.percentual_reajuste AS diferenca,
    COUNT(DISTINCT mcv.id) AS total_medicamentos
  FROM 
    medicamentos_com_variacao mcv
    LEFT JOIN reajustes_anuais ra ON mcv.ano = ra.ano
  WHERE 
    mcv.variacao_percentual BETWEEN -50 AND 50
  GROUP BY 
    mcv.ano, mcv.tipo_produto, ra.percentual_reajuste
  ORDER BY 
    mcv.ano, mcv.tipo_produto;
END;
$$ LANGUAGE plpgsql;

-- ANÁLISE DE OUTLIERS
CREATE OR REPLACE FUNCTION analise_outliers(
  ano_referencia INT,
  tipo TEXT DEFAULT 'ambos'
)
RETURNS TABLE (
  id INT,
  produto TEXT,
  apresentacao TEXT,
  laboratorio TEXT,
  tipo_produto TEXT,
  pf_sem_impostos_anterior NUMERIC,
  pf_sem_impostos NUMERIC,
  variacao_percentual NUMERIC,
  reajuste_cmed NUMERIC,
  diferenca NUMERIC,
  tipo_outlier TEXT
) AS $$
DECLARE
  reajuste NUMERIC;
  media_diferenca NUMERIC;
  desvio_padrao NUMERIC;
BEGIN
  -- Obter reajuste CMED do ano de referência
  SELECT percentual_reajuste INTO reajuste
  FROM reajustes_anuais
  WHERE ano = ano_referencia;
  
  -- Calcular variações e estatísticas em uma única consulta
  WITH medicamentos_ano_anterior AS (
    SELECT 
      m.id, m.produto, m.apresentacao, m.laboratorio, m.tipo_produto, ph.pf_sem_impostos
    FROM 
      medicamentos_base m
      JOIN precos_historico ph ON m.id = ph.medicamento_id
    WHERE 
      EXTRACT(YEAR FROM ph.data_publicacao) = ano_referencia - 1
  ),
  medicamentos_ano_atual AS (
    SELECT 
      m.id, m.produto, m.apresentacao, m.laboratorio, m.tipo_produto, ph.pf_sem_impostos
    FROM 
      medicamentos_base m
      JOIN precos_historico ph ON m.id = ph.medicamento_id
    WHERE 
      EXTRACT(YEAR FROM ph.data_publicacao) = ano_referencia
  ),
  medicamentos_com_variacao AS (
    SELECT 
      maa.id, maa.produto, maa.apresentacao, maa.laboratorio, maa.tipo_produto,
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
  )
  SELECT 
    AVG(diferenca) INTO media_diferenca
  FROM 
    medicamentos_com_variacao
  WHERE 
    variacao_percentual BETWEEN -50 AND 50;
    
  SELECT 
    STDDEV(diferenca) INTO desvio_padrao
  FROM 
    medicamentos_com_variacao
  WHERE 
    variacao_percentual BETWEEN -50 AND 50;
  
  -- Retornar resultados
  RETURN QUERY
  WITH medicamentos_ano_anterior AS (
    SELECT 
      m.id, m.produto, m.apresentacao, m.laboratorio, m.tipo_produto, ph.pf_sem_impostos
    FROM 
      medicamentos_base m
      JOIN precos_historico ph ON m.id = ph.medicamento_id
    WHERE 
      EXTRACT(YEAR FROM ph.data_publicacao) = ano_referencia - 1
  ),
  medicamentos_ano_atual AS (
    SELECT 
      m.id, m.produto, m.apresentacao, m.laboratorio, m.tipo_produto, ph.pf_sem_impostos
    FROM 
      medicamentos_base m
      JOIN precos_historico ph ON m.id = ph.medicamento_id
    WHERE 
      EXTRACT(YEAR FROM ph.data_publicacao) = ano_referencia
  ),
  medicamentos_com_variacao AS (
    SELECT 
      maa.id, maa.produto, maa.apresentacao, maa.laboratorio, maa.tipo_produto,
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
  )
  SELECT 
    mcv.id,
    mcv.produto,
    mcv.apresentacao,
    mcv.laboratorio,
    mcv.tipo_produto,
    mcv.pf_sem_impostos_anterior,
    mcv.pf_sem_impostos,
    mcv.variacao_percentual,
    mcv.reajuste_cmed,
    mcv.diferenca,
    CASE
      WHEN mcv.diferenca > (media_diferenca + 2 * desvio_padrao) THEN 'positivo'
      WHEN mcv.diferenca < (media_diferenca - 2 * desvio_padrao) THEN 'negativo'
      ELSE 'normal'
    END AS tipo_outlier
  FROM 
    medicamentos_com_variacao mcv
  WHERE (
    (tipo = 'ambos') OR
    (tipo = 'positivo' AND mcv.diferenca > 0) OR
    (tipo = 'negativo' AND mcv.diferenca < 0)
  )
  ORDER BY 
    CASE
      WHEN mcv.diferenca > (media_diferenca + 2 * desvio_padrao) THEN 1
      WHEN mcv.diferenca < (media_diferenca - 2 * desvio_padrao) THEN 2
      ELSE 3
    END,
    ABS(mcv.diferenca) DESC;
END;
$$ LANGUAGE plpgsql;

-- PROJEÇÃO DE IMPACTO FINANCEIRO
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
  preco_base NUMERIC;
  variacao_media NUMERIC;
  r RECORD;
  results_array INT[];
  anos_array INT[];
  precos_array NUMERIC[];
  variacoes_array NUMERIC[];
  impactos_array NUMERIC[];
  projetados_array BOOLEAN[];
BEGIN
  -- Definir fator de ajuste baseado no cenário
  IF cenario = 'otimista' THEN
    fator_ajuste := 0.8;
  ELSIF cenario = 'pessimista' THEN
    fator_ajuste := 1.2;
  ELSE
    fator_ajuste := 1.0;
  END IF;
  
  -- Obter dados históricos
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
    array_agg(pp.ano) INTO anos_array,
    array_agg(pp.preco_medio) INTO precos_array
  FROM 
    precos_por_ano pp;
  
  -- Calcular variações percentuais
  variacoes_array := ARRAY[]::NUMERIC[];
  impactos_array := ARRAY[]::NUMERIC[];
  projetados_array := ARRAY[]::BOOLEAN[];
  
  FOR i IN 1..array_length(anos_array, 1) LOOP
    IF i = 1 THEN
      variacoes_array := variacoes_array || 0;
      impactos_array := impactos_array || 0;
    ELSE
      variacoes_array := variacoes_array || ((precos_array[i] - precos_array[i-1]) / precos_array[i-1]) * 100;
      impactos_array := impactos_array || ((precos_array[i] - precos_array[1]) / precos_array[1]) * 100;
    END IF;
    projetados_array := projetados_array || FALSE;
  END LOOP;
  
  -- Calcular variação média histórica para projeção (excluindo o primeiro ano)
  SELECT AVG(variacao) INTO variacao_media
  FROM unnest(variacoes_array[2:array_length(variacoes_array, 1)]) AS variacao;
  
  -- Ajustar variação média conforme o cenário
  variacao_media := variacao_media * fator_ajuste;
  
  -- Obter último preço médio conhecido
  preco_base := precos_array[array_length(precos_array, 1)];
  
  -- Adicionar anos projetados
  FOR i IN 1..anos_projecao LOOP
    anos_array := anos_array || (ano_fim + i);
    precos_array := precos_array || (preco_base * POWER(1 + variacao_media/100, i));
    variacoes_array := variacoes_array || variacao_media;
    impactos_array := impactos_array || ((preco_base * POWER(1 + variacao_media/100, i) - preco_base) / preco_base) * 100;
    projetados_array := projetados_array || TRUE;
  END LOOP;
  
  -- Retornar resultados
  RETURN QUERY
  SELECT 
    unnest(anos_array),
    unnest(precos_array),
    unnest(variacoes_array),
    unnest(impactos_array),
    unnest(projetados_array);
END;
$$ LANGUAGE plpgsql;
