-- Funções de análises avançadas para o sistema CMED

-- 1. Função para análise de tendências por categoria terapêutica
CREATE OR REPLACE FUNCTION analise_por_categoria_terapeutica(ano_inicio INT, ano_fim INT)
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
  WITH medicamentos_por_classe AS (
    SELECT 
      m.id,
      m.classe_terapeutica,
      m.substancia
    FROM medicamentos_base m
    WHERE m.classe_terapeutica IS NOT NULL
  ),
  precos_anos AS (
    SELECT 
      ph.medicamento_id,
      EXTRACT(YEAR FROM ph.data_publicacao) AS ano,
      FIRST_VALUE(ph.pf_sem_impostos) OVER (
        PARTITION BY ph.medicamento_id, EXTRACT(YEAR FROM ph.data_publicacao)
        ORDER BY ph.data_publicacao DESC
      ) AS preco_final_ano
    FROM precos_historico ph
    WHERE EXTRACT(YEAR FROM ph.data_publicacao) BETWEEN ano_inicio AND ano_fim
  ),
  precos_completos AS (
    SELECT 
      pa.medicamento_id,
      pa.ano,
      pa.preco_final_ano,
      LAG(pa.preco_final_ano) OVER (
        PARTITION BY pa.medicamento_id 
        ORDER BY pa.ano
      ) AS preco_ano_anterior
    FROM precos_anos pa
  ),
  variacoes AS (
    SELECT 
      pc.ano,
      mpc.classe_terapeutica,
      pc.medicamento_id,
      CASE 
        WHEN pc.preco_ano_anterior > 0 THEN 
          ((pc.preco_final_ano - pc.preco_ano_anterior) / pc.preco_ano_anterior) * 100
        ELSE NULL
      END AS variacao_percentual
    FROM precos_completos pc
    JOIN medicamentos_por_classe mpc ON pc.medicamento_id = mpc.id
    WHERE pc.preco_ano_anterior IS NOT NULL
  )
  SELECT 
    v.ano::INT,
    v.classe_terapeutica,
    ROUND(AVG(v.variacao_percentual), 2) AS variacao_media,
    COALESCE(r.percentual, 0) AS reajuste_cmed,
    ROUND(AVG(v.variacao_percentual) - COALESCE(r.percentual, 0), 2) AS diferenca,
    COUNT(DISTINCT v.medicamento_id) AS total_medicamentos
  FROM variacoes v
  LEFT JOIN reajustes_anuais r ON v.ano = r.ano
  GROUP BY v.ano, v.classe_terapeutica, r.percentual
  ORDER BY v.ano, v.classe_terapeutica;
END;
$$ LANGUAGE plpgsql;

-- 2. Função para análise de impacto da variação cambial
CREATE OR REPLACE FUNCTION analise_impacto_cambial(ano_inicio INT, ano_fim INT)
RETURNS TABLE (
  ano INT,
  variacao_preco_media NUMERIC,
  variacao_dolar NUMERIC,
  reajuste_cmed NUMERIC,
  correlacao_cambio_preco NUMERIC
) AS $$
DECLARE
  correlacao NUMERIC;
BEGIN
  -- Esta função assume que exista uma tabela com dados de variação cambial
  -- Se não existir, você precisará criar e popular essa tabela
  
  RETURN QUERY
  WITH precos_anos AS (
    SELECT 
      medicamento_id,
      EXTRACT(YEAR FROM data_publicacao)::INT AS ano,
      FIRST_VALUE(pf_sem_impostos) OVER (
        PARTITION BY medicamento_id, EXTRACT(YEAR FROM data_publicacao)
        ORDER BY data_publicacao DESC
      ) AS preco_final_ano
    FROM precos_historico
    WHERE EXTRACT(YEAR FROM data_publicacao) BETWEEN ano_inicio AND ano_fim
  ),
  variacoes_preco AS (
    SELECT 
      pa.ano,
      pa.medicamento_id,
      pa.preco_final_ano,
      LAG(pa.preco_final_ano) OVER (
        PARTITION BY pa.medicamento_id 
        ORDER BY pa.ano
      ) AS preco_ano_anterior,
      CASE 
        WHEN LAG(pa.preco_final_ano) OVER (PARTITION BY pa.medicamento_id ORDER BY pa.ano) > 0 THEN
          ((pa.preco_final_ano - LAG(pa.preco_final_ano) OVER (PARTITION BY pa.medicamento_id ORDER BY pa.ano)) / 
           LAG(pa.preco_final_ano) OVER (PARTITION BY pa.medicamento_id ORDER BY pa.ano)) * 100
        ELSE NULL
      END AS variacao_percentual
    FROM precos_anos pa
  ),
  medias_anuais AS (
    SELECT 
      ano,
      AVG(variacao_percentual) AS variacao_media
    FROM variacoes_preco
    WHERE preco_ano_anterior IS NOT NULL
    GROUP BY ano
  )
  SELECT 
    ma.ano,
    ROUND(ma.variacao_media, 2) AS variacao_preco_media,
    COALESCE(ra.variacao_dolar, 0) AS variacao_dolar,
    COALESCE(ra.percentual, 0) AS reajuste_cmed,
    -- Cálculo simplificado de correlação:
    -- Se a variação do dólar for próxima da variação média de preços, a correlação é alta
    ROUND(
      CASE 
        WHEN ra.variacao_dolar IS NULL OR ma.variacao_media IS NULL THEN 0
        ELSE 1 - (ABS(ma.variacao_media - ra.variacao_dolar) / NULLIF(ra.variacao_dolar, 0))
      END
    , 2) AS correlacao_cambio_preco
  FROM medias_anuais ma
  LEFT JOIN reajustes_anuais ra ON ma.ano = ra.ano
  ORDER BY ma.ano;
END;
$$ LANGUAGE plpgsql;

-- 3. Função para análise de elasticidade de preço por faixa de preço
CREATE OR REPLACE FUNCTION analise_elasticidade_por_faixa(ano_referencia INT)
RETURNS TABLE (
  faixa_preco TEXT,
  variacao_media NUMERIC,
  reajuste_cmed NUMERIC,
  diferenca NUMERIC,
  total_medicamentos INT,
  elasticidade NUMERIC
) AS $$
DECLARE
  ano_anterior INT := ano_referencia - 1;
BEGIN
  RETURN QUERY
  WITH precos_referencia AS (
    SELECT 
      ph.medicamento_id,
      ph.pf_sem_impostos,
      m.tipo_de_produto,
      m.classe_terapeutica
    FROM precos_historico ph
    JOIN medicamentos_base m ON ph.medicamento_id = m.id
    JOIN (
      SELECT 
        medicamento_id, 
        MAX(data_publicacao) AS max_data
      FROM precos_historico
      WHERE EXTRACT(YEAR FROM data_publicacao) = ano_anterior
      GROUP BY medicamento_id
    ) anterior ON ph.medicamento_id = anterior.medicamento_id AND ph.data_publicacao = anterior.max_data
  ),
  precos_atuais AS (
    SELECT 
      ph.medicamento_id,
      ph.pf_sem_impostos
    FROM precos_historico ph
    JOIN (
      SELECT 
        medicamento_id, 
        MAX(data_publicacao) AS max_data
      FROM precos_historico
      WHERE EXTRACT(YEAR FROM data_publicacao) = ano_referencia
      GROUP BY medicamento_id
    ) atual ON ph.medicamento_id = atual.medicamento_id AND ph.data_publicacao = atual.max_data
  ),
  analise_completa AS (
    SELECT 
      pr.medicamento_id,
      pr.pf_sem_impostos AS preco_anterior,
      pa.pf_sem_impostos AS preco_atual,
      CASE 
        WHEN pr.pf_sem_impostos < 50 THEN 'Até R$ 50'
        WHEN pr.pf_sem_impostos BETWEEN 50 AND 150 THEN 'R$ 50 a R$ 150'
        WHEN pr.pf_sem_impostos BETWEEN 150 AND 500 THEN 'R$ 150 a R$ 500'
        ELSE 'Acima de R$ 500'
      END AS faixa_preco,
      pr.tipo_de_produto,
      pr.classe_terapeutica,
      CASE 
        WHEN pr.pf_sem_impostos > 0 THEN
          ((pa.pf_sem_impostos - pr.pf_sem_impostos) / pr.pf_sem_impostos) * 100
        ELSE NULL
      END AS variacao_percentual
    FROM precos_referencia pr
    JOIN precos_atuais pa ON pr.medicamento_id = pa.medicamento_id
  )
  SELECT 
    ac.faixa_preco,
    ROUND(AVG(ac.variacao_percentual), 2) AS variacao_media,
    (SELECT percentual FROM reajustes_anuais WHERE ano = ano_referencia) AS reajuste_cmed,
    ROUND(AVG(ac.variacao_percentual) - (SELECT percentual FROM reajustes_anuais WHERE ano = ano_referencia), 2) AS diferenca,
    COUNT(DISTINCT ac.medicamento_id) AS total_medicamentos,
    -- Elasticidade: razão entre variação percentual e reajuste oficial
    ROUND(AVG(ac.variacao_percentual) / NULLIF((SELECT percentual FROM reajustes_anuais WHERE ano = ano_referencia), 0), 2) AS elasticidade
  FROM analise_completa ac
  GROUP BY ac.faixa_preco, (SELECT percentual FROM reajustes_anuais WHERE ano = ano_referencia)
  ORDER BY MIN(ac.preco_anterior);
END;
$$ LANGUAGE plpgsql;

-- 4. Função para análise comparativa entre medicamentos genéricos e de referência
CREATE OR REPLACE FUNCTION analise_genericos_vs_referencia(ano_inicio INT, ano_fim INT)
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
  WITH precos_anos AS (
    SELECT 
      ph.medicamento_id,
      EXTRACT(YEAR FROM ph.data_publicacao)::INT AS ano,
      m.tipo_de_produto,
      FIRST_VALUE(ph.pf_sem_impostos) OVER (
        PARTITION BY ph.medicamento_id, EXTRACT(YEAR FROM ph.data_publicacao)
        ORDER BY ph.data_publicacao DESC
      ) AS preco_final_ano
    FROM precos_historico ph
    JOIN medicamentos_base m ON ph.medicamento_id = m.id
    WHERE EXTRACT(YEAR FROM ph.data_publicacao) BETWEEN ano_inicio AND ano_fim
    AND m.tipo_de_produto IN ('Genérico', 'Referência', 'Similar')
  ),
  variacoes_preco AS (
    SELECT 
      pa.ano,
      pa.medicamento_id,
      pa.tipo_de_produto,
      pa.preco_final_ano,
      LAG(pa.preco_final_ano) OVER (
        PARTITION BY pa.medicamento_id 
        ORDER BY pa.ano
      ) AS preco_ano_anterior,
      CASE 
        WHEN LAG(pa.preco_final_ano) OVER (PARTITION BY pa.medicamento_id ORDER BY pa.ano) > 0 THEN
          ((pa.preco_final_ano - LAG(pa.preco_final_ano) OVER (PARTITION BY pa.medicamento_id ORDER BY pa.ano)) / 
           LAG(pa.preco_final_ano) OVER (PARTITION BY pa.medicamento_id ORDER BY pa.ano)) * 100
        ELSE NULL
      END AS variacao_percentual
    FROM precos_anos pa
  )
  SELECT 
    vp.ano,
    vp.tipo_de_produto,
    ROUND(AVG(vp.variacao_percentual), 2) AS variacao_media,
    COALESCE(ra.percentual, 0) AS reajuste_cmed,
    ROUND(AVG(vp.variacao_percentual) - COALESCE(ra.percentual, 0), 2) AS diferenca,
    COUNT(DISTINCT vp.medicamento_id) AS total_medicamentos
  FROM variacoes_preco vp
  LEFT JOIN reajustes_anuais ra ON vp.ano = ra.ano
  WHERE vp.preco_ano_anterior IS NOT NULL
  GROUP BY vp.ano, vp.tipo_de_produto, ra.percentual
  ORDER BY vp.ano, vp.tipo_de_produto;
END;
$$ LANGUAGE plpgsql;

-- 5. Função para identificar outliers nos reajustes
CREATE OR REPLACE FUNCTION identificar_outliers_reajuste(ano_referencia INT, limite_desvio NUMERIC DEFAULT 1.5)
RETURNS TABLE (
  medicamento_id INT,
  substancia TEXT,
  laboratorio TEXT,
  produto TEXT,
  apresentacao TEXT,
  preco_anterior NUMERIC,
  preco_atual NUMERIC,
  variacao_percentual NUMERIC,
  reajuste_cmed NUMERIC,
  desvio NUMERIC,
  status TEXT
) AS $$
DECLARE
  ano_anterior INT := ano_referencia - 1;
  reajuste NUMERIC;
  media_variacao NUMERIC;
  desvio_padrao NUMERIC;
BEGIN
  SELECT percentual INTO reajuste FROM reajustes_anuais WHERE ano = ano_referencia;
  
  -- Calcular estatísticas gerais
  WITH variacoes AS (
    SELECT 
      anterior.medicamento_id,
      ((atual.pf - anterior.pf) / anterior.pf) * 100 AS variacao
    FROM (
      SELECT 
        ph.medicamento_id, 
        ph.pf_sem_impostos AS pf
      FROM precos_historico ph
      JOIN (
        SELECT 
          medicamento_id, 
          MAX(data_publicacao) AS max_data
        FROM precos_historico
        WHERE EXTRACT(YEAR FROM data_publicacao) = ano_anterior
        GROUP BY medicamento_id
      ) a ON ph.medicamento_id = a.medicamento_id AND ph.data_publicacao = a.max_data
    ) anterior
    JOIN (
      SELECT 
        ph.medicamento_id, 
        ph.pf_sem_impostos AS pf
      FROM precos_historico ph
      JOIN (
        SELECT 
          medicamento_id, 
          MAX(data_publicacao) AS max_data
        FROM precos_historico
        WHERE EXTRACT(YEAR FROM data_publicacao) = ano_referencia
        GROUP BY medicamento_id
      ) a ON ph.medicamento_id = a.medicamento_id AND ph.data_publicacao = a.max_data
    ) atual ON anterior.medicamento_id = atual.medicamento_id
  )
  SELECT 
    AVG(variacao),
    STDDEV(variacao)
  INTO media_variacao, desvio_padrao
  FROM variacoes;
  
  -- Retornar outliers
  RETURN QUERY
  WITH analise_completa AS (
    SELECT 
      anterior.medicamento_id,
      m.substancia,
      m.laboratorio,
      m.produto,
      m.apresentacao,
      anterior.pf AS preco_anterior,
      atual.pf AS preco_atual,
      ((atual.pf - anterior.pf) / anterior.pf) * 100 AS variacao_percentual,
      reajuste,
      ABS(((atual.pf - anterior.pf) / anterior.pf) * 100 - reajuste) / desvio_padrao AS desvio_normalizado
    FROM (
      SELECT 
        ph.medicamento_id, 
        ph.pf_sem_impostos AS pf
      FROM precos_historico ph
      JOIN (
        SELECT 
          medicamento_id, 
          MAX(data_publicacao) AS max_data
        FROM precos_historico
        WHERE EXTRACT(YEAR FROM data_publicacao) = ano_anterior
        GROUP BY medicamento_id
      ) a ON ph.medicamento_id = a.medicamento_id AND ph.data_publicacao = a.max_data
    ) anterior
    JOIN (
      SELECT 
        ph.medicamento_id, 
        ph.pf_sem_impostos AS pf
      FROM precos_historico ph
      JOIN (
        SELECT 
          medicamento_id, 
          MAX(data_publicacao) AS max_data
        FROM precos_historico
        WHERE EXTRACT(YEAR FROM data_publicacao) = ano_referencia
        GROUP BY medicamento_id
      ) a ON ph.medicamento_id = a.medicamento_id AND ph.data_publicacao = a.max_data
    ) atual ON anterior.medicamento_id = atual.medicamento_id
    JOIN medicamentos_base m ON anterior.medicamento_id = m.id
  )
  SELECT 
    ac.medicamento_id,
    ac.substancia,
    ac.laboratorio,
    ac.produto,
    ac.apresentacao,
    ROUND(ac.preco_anterior::NUMERIC, 2) AS preco_anterior,
    ROUND(ac.preco_atual::NUMERIC, 2) AS preco_atual,
    ROUND(ac.variacao_percentual, 2) AS variacao_percentual,
    ROUND(ac.reajuste, 2) AS reajuste_cmed,
    ROUND(ac.desvio_normalizado, 2) AS desvio,
    CASE 
      WHEN ac.variacao_percentual > ac.reajuste + (desvio_padrao * limite_desvio) THEN 'Muito Acima'
      WHEN ac.variacao_percentual > ac.reajuste THEN 'Acima'
      WHEN ac.variacao_percentual < ac.reajuste - (desvio_padrao * limite_desvio) THEN 'Muito Abaixo'
      WHEN ac.variacao_percentual < ac.reajuste THEN 'Abaixo'
      ELSE 'Alinhado'
    END AS status
  FROM analise_completa ac
  WHERE ac.desvio_normalizado > limite_desvio  -- Retorna apenas os outliers
  ORDER BY ac.desvio_normalizado DESC;
END;
$$ LANGUAGE plpgsql;

-- 6. Função para projetar o impacto financeiro dos reajustes
CREATE OR REPLACE FUNCTION projetar_impacto_financeiro(medicamento_id INT, anos_projecao INT DEFAULT 5)
RETURNS TABLE (
  ano INT,
  preco_projetado NUMERIC,
  reajuste_estimado NUMERIC,
  variacao_projetada NUMERIC
) AS $$
DECLARE
  ano_atual INT;
  preco_atual NUMERIC;
  tendencia_variacao NUMERIC;
  tendencia_reajuste NUMERIC;
BEGIN
  -- Obter ano atual
  SELECT EXTRACT(YEAR FROM CURRENT_DATE)::INT INTO ano_atual;
  
  -- Obter preço atual do medicamento
  SELECT ph.pf_sem_impostos INTO preco_atual
  FROM precos_historico ph
  JOIN (
    SELECT medicamento_id, MAX(data_publicacao) AS max_data
    FROM precos_historico
    WHERE medicamento_id = projetar_impacto_financeiro.medicamento_id
    GROUP BY medicamento_id
  ) atual ON ph.medicamento_id = atual.medicamento_id AND ph.data_publicacao = atual.max_data;
  
  -- Calcular tendência de variação específica do medicamento
  WITH variacoes AS (
    SELECT 
      EXTRACT(YEAR FROM ph1.data_publicacao)::INT AS ano,
      ((ph1.pf_sem_impostos - ph2.pf_sem_impostos) / ph2.pf_sem_impostos) * 100 AS variacao
    FROM precos_historico ph1
    JOIN (
      SELECT 
        medicamento_id,
        EXTRACT(YEAR FROM data_publicacao)::INT AS ano,
        MAX(data_publicacao) AS max_data
      FROM precos_historico
      WHERE medicamento_id = projetar_impacto_financeiro.medicamento_id
      GROUP BY medicamento_id, EXTRACT(YEAR FROM data_publicacao)
    ) anos ON ph1.medicamento_id = anos.medicamento_id AND ph1.data_publicacao = anos.max_data
    JOIN (
      SELECT 
        ph.medicamento_id,
        ph.pf_sem_impostos,
        EXTRACT(YEAR FROM ph.data_publicacao)::INT AS ano
      FROM precos_historico ph
      JOIN (
        SELECT 
          medicamento_id,
          EXTRACT(YEAR FROM data_publicacao)::INT AS ano,
          MAX(data_publicacao) AS max_data
        FROM precos_historico
        WHERE medicamento_id = projetar_impacto_financeiro.medicamento_id
        GROUP BY medicamento_id, EXTRACT(YEAR FROM data_publicacao)
      ) anos_prev ON ph.medicamento_id = anos_prev.medicamento_id AND ph.data_publicacao = anos_prev.max_data
    ) ph2 ON ph1.medicamento_id = ph2.medicamento_id AND anos.ano = ph2.ano + 1
  )
  SELECT AVG(variacao) INTO tendencia_variacao FROM variacoes;
  
  -- Obter tendência de reajuste CMED
  SELECT AVG(percentual) INTO tendencia_reajuste
  FROM reajustes_anuais
  WHERE ano >= ano_atual - 5;
  
  -- Valor padrão se não houver histórico
  tendencia_variacao := COALESCE(tendencia_variacao, tendencia_reajuste);
  tendencia_reajuste := COALESCE(tendencia_reajuste, 4.5); -- Valor médio histórico aproximado
  
  -- Gerar projeções
  FOR i IN 1..anos_projecao LOOP
    ano_atual := ano_atual + 1;
    
    -- Estimar reajuste CMED para o ano
    DECLARE
      reajuste_estimado NUMERIC;
    BEGIN
      -- Verificar se já existe um reajuste oficial para este ano
      SELECT percentual INTO reajuste_estimado FROM reajustes_anuais WHERE ano = ano_atual;
      
      -- Se não existir, projetar com base na tendência
      IF reajuste_estimado IS NULL THEN
        reajuste_estimado := tendencia_reajuste;
      END IF;
      
      -- Calcular variação projetada específica deste medicamento
      -- Aqui usamos um ajuste com base no comportamento histórico do medicamento em relação ao reajuste oficial
      DECLARE
        variacao_projetada NUMERIC;
        comportamento_historico NUMERIC;
      BEGIN
        comportamento_historico := tendencia_variacao / NULLIF(tendencia_reajuste, 0);
        comportamento_historico := COALESCE(comportamento_historico, 1.0);
        
        variacao_projetada := reajuste_estimado * comportamento_historico;
        
        -- Calcular preço projetado
        preco_atual := preco_atual * (1 + (variacao_projetada / 100));
        
        RETURN QUERY SELECT 
          ano_atual, 
          ROUND(preco_atual::NUMERIC, 2)::NUMERIC,
          ROUND(reajuste_estimado::NUMERIC, 2)::NUMERIC,
          ROUND(variacao_projetada::NUMERIC, 2)::NUMERIC;
      END;
    END;
  END LOOP;
END;
$$ LANGUAGE plpgsql;
