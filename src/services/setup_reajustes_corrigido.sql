-- Criar tabela de reajustes anuais da CMED
CREATE TABLE IF NOT EXISTS reajustes_anuais (
  id SERIAL PRIMARY KEY,
  ano INTEGER NOT NULL UNIQUE,
  percentual NUMERIC(5,2) NOT NULL,
  data_vigencia DATE,
  fonte TEXT,
  ipca_ano NUMERIC(5,2),
  variacao_dolar NUMERIC(5,2),
  observacoes TEXT,
  estimativa BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Inserir dados históricos
INSERT INTO reajustes_anuais (ano, percentual, estimativa) 
VALUES 
  (2015, 7.70, false),
  (2016, 12.50, false),
  (2017, 4.76, false),
  (2018, 2.84, false),
  (2019, 4.33, false),
  (2020, 5.21, false),
  (2021, 10.08, false),
  (2022, 10.89, false),
  (2023, 5.60, false),
  (2024, 4.50, false),
  (2025, 3.90, true)
ON CONFLICT (ano) 
DO UPDATE SET 
  percentual = EXCLUDED.percentual,
  estimativa = EXCLUDED.estimativa,
  updated_at = NOW();

-- Função para calcular médias e estatísticas de reajustes
CREATE OR REPLACE FUNCTION calcular_estatisticas_reajustes()
RETURNS TABLE (
  media_geral NUMERIC(5,2),
  media_ultimos_5_anos NUMERIC(5,2),
  maior_reajuste NUMERIC(5,2),
  ano_maior_reajuste INTEGER,
  menor_reajuste NUMERIC(5,2),
  ano_menor_reajuste INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ROUND(AVG(percentual)::numeric, 2) as media_geral,
    ROUND((SELECT AVG(percentual) FROM reajustes_anuais WHERE ano > (SELECT MAX(ano) FROM reajustes_anuais) - 5 AND estimativa = false)::numeric, 2) as media_ultimos_5_anos,
    MAX(percentual) as maior_reajuste,
    (SELECT ano FROM reajustes_anuais WHERE percentual = (SELECT MAX(percentual) FROM reajustes_anuais WHERE estimativa = false) AND estimativa = false LIMIT 1) as ano_maior_reajuste,
    MIN(percentual) as menor_reajuste,
    (SELECT ano FROM reajustes_anuais WHERE percentual = (SELECT MIN(percentual) FROM reajustes_anuais WHERE estimativa = false) AND estimativa = false LIMIT 1) as ano_menor_reajuste
  FROM reajustes_anuais
  WHERE estimativa = false;
END;
$$ LANGUAGE plpgsql;
