-- Função para estimar o próximo reajuste com base em dados históricos e tendências
CREATE OR REPLACE FUNCTION estimar_proximo_reajuste(
  ano_alvo INTEGER DEFAULT NULL, 
  peso_media_geral NUMERIC DEFAULT 0.20,
  peso_ultimos_5_anos NUMERIC DEFAULT 0.50,
  peso_ultimo_ano NUMERIC DEFAULT 0.30
)
RETURNS TABLE (
  ano_estimado INTEGER,
  reajuste_estimado NUMERIC(5,2),
  metodo_calculo TEXT,
  ipca_estimado NUMERIC(5,2),
  intervalo_confianca_min NUMERIC(5,2),
  intervalo_confianca_max NUMERIC(5,2)
) AS $$
DECLARE
  ultimo_ano INTEGER;
  media_geral NUMERIC(5,2);
  media_ultimos_5_anos NUMERIC(5,2);
  reajuste_ultimo_ano NUMERIC(5,2);
  ipca_ultimos_5_anos NUMERIC(5,2);
  correlacao_ipca_reajuste NUMERIC(5,2);
  desvio_padrao NUMERIC(5,2);
BEGIN
  -- Determinar o ano alvo (próximo ano se não especificado)
  IF ano_alvo IS NULL THEN
    SELECT MAX(ano) + 1 INTO ano_alvo FROM reajustes_anuais;
  END IF;
  
  -- Verificar se o ano alvo já existe
  IF EXISTS (SELECT 1 FROM reajustes_anuais WHERE ano = ano_alvo) THEN
    RAISE NOTICE 'O ano % já existe na tabela de reajustes. A estimativa não substituirá o valor existente.', ano_alvo;
  END IF;

  -- Obter o último ano com dados oficiais
  SELECT MAX(ano) INTO ultimo_ano FROM reajustes_anuais WHERE estimativa = false;
  
  -- Calcular a média geral de todos os reajustes oficiais
  SELECT AVG(percentual) INTO media_geral FROM reajustes_anuais WHERE estimativa = false;
  
  -- Calcular a média dos últimos 5 anos
  SELECT AVG(percentual) INTO media_ultimos_5_anos 
  FROM reajustes_anuais 
  WHERE ano > ultimo_ano - 5 AND estimativa = false;
  
  -- Obter o reajuste do último ano
  SELECT percentual INTO reajuste_ultimo_ano 
  FROM reajustes_anuais 
  WHERE ano = ultimo_ano AND estimativa = false;
  
  -- Calcular a média do IPCA dos últimos 5 anos, se disponível
  SELECT AVG(ipca_ano) INTO ipca_ultimos_5_anos 
  FROM reajustes_anuais 
  WHERE ano > ultimo_ano - 5 AND ipca_ano IS NOT NULL AND estimativa = false;
  
  -- Calcular a correlação entre IPCA e reajuste (simplificada)
  -- Na prática, seria melhor usar uma correlação mais robusta
  SELECT CASE 
    WHEN COUNT(*) < 3 THEN 0.6 -- valor padrão se não tivermos dados suficientes
    ELSE COALESCE(
      CORR(percentual, ipca_ano),
      0.6 -- valor padrão se a correlação não puder ser calculada
    )
  END INTO correlacao_ipca_reajuste
  FROM reajustes_anuais 
  WHERE ipca_ano IS NOT NULL AND estimativa = false;
  
  -- Calcular o desvio padrão dos reajustes para o intervalo de confiança
  SELECT STDDEV(percentual) INTO desvio_padrao FROM reajustes_anuais WHERE estimativa = false;
  
  -- Retornar a estimativa
  RETURN QUERY
  SELECT 
    ano_alvo as ano_estimado,
    ROUND(
      (media_geral * peso_media_geral) + 
      (media_ultimos_5_anos * peso_ultimos_5_anos) + 
      (reajuste_ultimo_ano * peso_ultimo_ano)
    , 2) as reajuste_estimado,
    'Média ponderada: ' || 
    peso_media_geral*100 || '% média histórica + ' || 
    peso_ultimos_5_anos*100 || '% média 5 anos + ' || 
    peso_ultimo_ano*100 || '% último ano' as metodo_calculo,
    CASE WHEN ipca_ultimos_5_anos IS NULL THEN NULL
         ELSE ROUND(ipca_ultimos_5_anos * 0.9, 2)
    END as ipca_estimado,
    ROUND(
      (media_geral * peso_media_geral) + 
      (media_ultimos_5_anos * peso_ultimos_5_anos) + 
      (reajuste_ultimo_ano * peso_ultimo_ano) - 
      (desvio_padrao * 0.5)
    , 2) as intervalo_confianca_min,
    ROUND(
      (media_geral * peso_media_geral) + 
      (media_ultimos_5_anos * peso_ultimos_5_anos) + 
      (reajuste_ultimo_ano * peso_ultimo_ano) + 
      (desvio_padrao * 0.5)
    , 2) as intervalo_confianca_max;
END;
$$ LANGUAGE plpgsql;

-- Função auxiliar para aplicar a estimativa e inserir ou atualizar na tabela
CREATE OR REPLACE FUNCTION aplicar_estimativa_reajuste(
  ano_alvo INTEGER DEFAULT NULL,
  peso_media_geral NUMERIC DEFAULT 0.20,
  peso_ultimos_5_anos NUMERIC DEFAULT 0.50,
  peso_ultimo_ano NUMERIC DEFAULT 0.30,
  observacao TEXT DEFAULT 'Estimativa gerada automaticamente com base em médias históricas'
)
RETURNS TEXT AS $$
DECLARE
  ano_estimado INTEGER;
  reajuste_estimado NUMERIC(5,2);
  ipca_estimado NUMERIC(5,2);
  resultado TEXT;
BEGIN
  -- Obter a estimativa
  SELECT e.ano_estimado, e.reajuste_estimado, e.ipca_estimado 
  INTO ano_estimado, reajuste_estimado, ipca_estimado
  FROM estimar_proximo_reajuste(ano_alvo, peso_media_geral, peso_ultimos_5_anos, peso_ultimo_ano) e;
  
  -- Verificar se o ano já existe
  IF EXISTS (SELECT 1 FROM reajustes_anuais WHERE ano = ano_estimado) THEN
    -- Atualizar o registro existente apenas se for uma estimativa
    UPDATE reajustes_anuais 
    SET percentual = reajuste_estimado,
        ipca_ano = ipca_estimado,
        observacoes = observacao,
        estimativa = true,
        updated_at = NOW()
    WHERE ano = ano_estimado AND estimativa = true;
    
    resultado := 'Atualizada estimativa para o ano ' || ano_estimado || ' com reajuste de ' || reajuste_estimado || '%';
  ELSE
    -- Inserir novo registro
    INSERT INTO reajustes_anuais (
      ano, percentual, ipca_ano, observacoes, estimativa
    ) VALUES (
      ano_estimado, reajuste_estimado, ipca_estimado, observacao, true
    );
    
    resultado := 'Inserida nova estimativa para o ano ' || ano_estimado || ' com reajuste de ' || reajuste_estimado || '%';
  END IF;
  
  RETURN resultado;
END;
$$ LANGUAGE plpgsql;

-- Exemplo de uso:
-- SELECT * FROM estimar_proximo_reajuste(); -- apenas visualiza a estimativa
-- SELECT aplicar_estimativa_reajuste(); -- aplica a estimativa para o próximo ano
-- SELECT aplicar_estimativa_reajuste(2026); -- aplica a estimativa para 2026
