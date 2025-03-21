-- Função para analisar o impacto dos reajustes nos preços dos medicamentos
CREATE OR REPLACE FUNCTION analisar_impacto_reajustes()
RETURNS TABLE (
  ano INTEGER,
  percentual_reajuste NUMERIC(5,2),
  media_reajuste_real NUMERIC(5,2),
  desvio_padrao NUMERIC(5,2),
  menor_reajuste_real NUMERIC(5,2),
  maior_reajuste_real NUMERIC(5,2),
  total_medicamentos INTEGER,
  total_acima_media INTEGER,
  total_abaixo_media INTEGER
) AS $$
DECLARE
  anos_disponiveis INT[];
  ano_atual INT;
  ano_anterior INT;
BEGIN
  -- Obter anos com dados disponíveis no histórico de preços
  SELECT ARRAY(
    SELECT DISTINCT EXTRACT(YEAR FROM data_publicacao)::int
    FROM precos_historico
    ORDER BY 1
  ) INTO anos_disponiveis;
  
  -- Para cada ano disponível, calcular a variação em relação ao ano anterior
  FOR i IN 2..array_length(anos_disponiveis, 1) LOOP
    ano_atual := anos_disponiveis[i];
    ano_anterior := anos_disponiveis[i-1];
    
    RETURN QUERY
    WITH precos_atuais AS (
      SELECT 
        ph.medicamento_id,
        ph.pf_sem_impostos,
        EXTRACT(YEAR FROM ph.data_publicacao)::int AS ano
      FROM precos_historico ph
      JOIN (
        SELECT 
          medicamento_id, 
          MAX(data_publicacao) AS max_data
        FROM precos_historico
        WHERE EXTRACT(YEAR FROM data_publicacao) = ano_atual
        GROUP BY medicamento_id
      ) atual ON ph.medicamento_id = atual.medicamento_id AND ph.data_publicacao = atual.max_data
    ),
    precos_anteriores AS (
      SELECT 
        ph.medicamento_id,
        ph.pf_sem_impostos,
        EXTRACT(YEAR FROM ph.data_publicacao)::int AS ano
      FROM precos_historico ph
      JOIN (
        SELECT 
          medicamento_id, 
          MAX(data_publicacao) AS max_data
        FROM precos_historico
        WHERE EXTRACT(YEAR FROM data_publicacao) = ano_anterior
        GROUP BY medicamento_id
      ) anterior ON ph.medicamento_id = anterior.medicamento_id AND ph.data_publicacao = anterior.max_data
    ),
    variacoes AS (
      SELECT
        pa.medicamento_id,
        pa.pf_sem_impostos AS preco_atual,
        pb.pf_sem_impostos AS preco_anterior,
        CASE WHEN pb.pf_sem_impostos > 0 
          THEN ((pa.pf_sem_impostos - pb.pf_sem_impostos) / pb.pf_sem_impostos * 100)
          ELSE 0
        END AS variacao_percentual
      FROM precos_atuais pa
      JOIN precos_anteriores pb ON pa.medicamento_id = pb.medicamento_id
      WHERE pb.pf_sem_impostos > 0
    ),
    estatisticas AS (
      SELECT
        AVG(variacao_percentual) AS media_reajuste,
        STDDEV(variacao_percentual) AS desvio_padrao,
        MIN(variacao_percentual) AS menor_reajuste,
        MAX(variacao_percentual) AS maior_reajuste,
        COUNT(*) AS total_medicamentos,
        SUM(CASE WHEN variacao_percentual > AVG(variacao_percentual) OVER () THEN 1 ELSE 0 END) AS total_acima_media,
        SUM(CASE WHEN variacao_percentual < AVG(variacao_percentual) OVER () THEN 1 ELSE 0 END) AS total_abaixo_media
      FROM variacoes
    )
    SELECT
      ano_atual,
      (SELECT percentual FROM reajustes_anuais WHERE ano = ano_atual),
      ROUND(media_reajuste::numeric, 2),
      ROUND(desvio_padrao::numeric, 2),
      ROUND(menor_reajuste::numeric, 2),
      ROUND(maior_reajuste::numeric, 2),
      total_medicamentos,
      total_acima_media,
      total_abaixo_media
    FROM estatisticas;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Função para identificar os medicamentos mais impactados pelos reajustes
CREATE OR REPLACE FUNCTION medicamentos_mais_impactados(ano_alvo INTEGER)
RETURNS TABLE (
  medicamento_id INTEGER,
  substancia TEXT,
  laboratorio TEXT,
  produto TEXT,
  apresentacao TEXT,
  tipo_de_produto TEXT,
  preco_anterior NUMERIC(10,2),
  preco_atual NUMERIC(10,2),
  variacao_percentual NUMERIC(10,2),
  data_publicacao_anterior DATE,
  data_publicacao_atual DATE
) AS $$
DECLARE
  ano_anterior INTEGER := ano_alvo - 1;
BEGIN
  RETURN QUERY
  WITH precos_atuais AS (
    SELECT 
      ph.medicamento_id,
      ph.pf_sem_impostos,
      ph.data_publicacao
    FROM precos_historico ph
    JOIN (
      SELECT 
        medicamento_id, 
        MAX(data_publicacao) AS max_data
      FROM precos_historico
      WHERE EXTRACT(YEAR FROM data_publicacao) = ano_alvo
      GROUP BY medicamento_id
    ) atual ON ph.medicamento_id = atual.medicamento_id AND ph.data_publicacao = atual.max_data
  ),
  precos_anteriores AS (
    SELECT 
      ph.medicamento_id,
      ph.pf_sem_impostos,
      ph.data_publicacao
    FROM precos_historico ph
    JOIN (
      SELECT 
        medicamento_id, 
        MAX(data_publicacao) AS max_data
      FROM precos_historico
      WHERE EXTRACT(YEAR FROM data_publicacao) = ano_anterior
      GROUP BY medicamento_id
    ) anterior ON ph.medicamento_id = anterior.medicamento_id AND ph.data_publicacao = anterior.max_data
  ),
  variacoes AS (
    SELECT
      pa.medicamento_id,
      pa.pf_sem_impostos AS preco_atual,
      pb.pf_sem_impostos AS preco_anterior,
      CASE WHEN pb.pf_sem_impostos > 0 
        THEN ((pa.pf_sem_impostos - pb.pf_sem_impostos) / pb.pf_sem_impostos * 100)
        ELSE 0
      END AS variacao_percentual,
      pb.data_publicacao AS data_publicacao_anterior,
      pa.data_publicacao AS data_publicacao_atual
    FROM precos_atuais pa
    JOIN precos_anteriores pb ON pa.medicamento_id = pb.medicamento_id
    WHERE pb.pf_sem_impostos > 0
  )
  SELECT
    v.medicamento_id,
    mb.substancia,
    mb.laboratorio,
    mb.produto,
    mb.apresentacao,
    mb.tipo_de_produto,
    v.preco_anterior,
    v.preco_atual,
    ROUND(v.variacao_percentual::numeric, 2),
    v.data_publicacao_anterior::date,
    v.data_publicacao_atual::date
  FROM variacoes v
  JOIN medicamentos_base mb ON v.medicamento_id = mb.id
  ORDER BY v.variacao_percentual DESC
  LIMIT 100;
END;
$$ LANGUAGE plpgsql;
