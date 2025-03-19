-- Função atualizada com nome único para inserir ou atualizar medicamento com preço (melhor tratamento de data)
CREATE OR REPLACE FUNCTION upsert_medicamento_com_preco_v2(
  p_substancia TEXT,
  p_laboratorio TEXT,
  p_produto TEXT,
  p_apresentacao TEXT,
  p_codigo_ggrem TEXT,
  p_registro TEXT,
  p_ean_1 TEXT,
  p_classe_terapeutica TEXT,
  p_tipo_de_produto TEXT,
  p_regime_de_preco TEXT,
  p_data_publicacao TEXT,
  p_pf_sem_impostos NUMERIC,
  p_importacao_id INTEGER
) RETURNS INTEGER AS $$
DECLARE
  v_hash TEXT;
  v_medicamento_id INTEGER;
  v_data_publicacao DATE;
BEGIN
  -- Garantir que a data está no formato correto
  BEGIN
    -- Se a data está no formato ISO com hora (ex: 2025-01-01T12:00:00)
    IF p_data_publicacao LIKE '%T%' THEN
      -- Extrair apenas a parte da data
      v_data_publicacao := (p_data_publicacao::TIMESTAMP AT TIME ZONE 'UTC')::DATE;
      RAISE NOTICE 'Data convertida de timestamp com sucesso: %', v_data_publicacao;
    ELSE
      -- Tentar converter a string de data para tipo DATE (formato AAAA-MM-DD)
      v_data_publicacao := p_data_publicacao::DATE;
      RAISE NOTICE 'Data convertida com sucesso (formato ISO): %', v_data_publicacao;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    BEGIN
      -- Tentar converter assumindo formato DD/MM/YYYY
      v_data_publicacao := TO_DATE(p_data_publicacao, 'DD/MM/YYYY');
      RAISE NOTICE 'Data convertida com sucesso (formato DD/MM/YYYY): %', v_data_publicacao;
    EXCEPTION WHEN OTHERS THEN
      BEGIN
        -- Tentar converter assumindo formato MM/DD/YYYY
        v_data_publicacao := TO_DATE(p_data_publicacao, 'MM/DD/YYYY');
        RAISE NOTICE 'Data convertida com sucesso (formato MM/DD/YYYY): %', v_data_publicacao;
      EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Erro ao converter data: %, usando data atual', p_data_publicacao;
        v_data_publicacao := CURRENT_DATE;
      END;
    END;
  END;

  -- Registro de depuração
  RAISE NOTICE 'Data final após processamento: %', v_data_publicacao;

  -- Gerar hash identificador
  v_hash := generate_medicamento_hash(p_substancia, p_laboratorio, p_produto, p_apresentacao, p_codigo_ggrem);
  
  -- Inserir ou atualizar medicamento base
  INSERT INTO medicamentos_base (
    substancia, laboratorio, produto, apresentacao, codigo_ggrem, 
    registro, ean_1, classe_terapeutica, tipo_de_produto, regime_de_preco, hash_identificador
  ) VALUES (
    p_substancia, p_laboratorio, p_produto, p_apresentacao, p_codigo_ggrem,
    p_registro, p_ean_1, p_classe_terapeutica, p_tipo_de_produto, p_regime_de_preco, v_hash
  )
  ON CONFLICT (hash_identificador) 
  DO UPDATE SET
    registro = COALESCE(p_registro, medicamentos_base.registro),
    ean_1 = COALESCE(p_ean_1, medicamentos_base.ean_1),
    classe_terapeutica = COALESCE(p_classe_terapeutica, medicamentos_base.classe_terapeutica),
    tipo_de_produto = COALESCE(p_tipo_de_produto, medicamentos_base.tipo_de_produto),
    regime_de_preco = COALESCE(p_regime_de_preco, medicamentos_base.regime_de_preco)
  RETURNING id INTO v_medicamento_id;
  
  -- Inserir ou atualizar preço
  INSERT INTO precos_historico (
    medicamento_id, importacao_id, data_publicacao, pf_sem_impostos
  ) VALUES (
    v_medicamento_id, p_importacao_id, v_data_publicacao, p_pf_sem_impostos
  )
  ON CONFLICT (medicamento_id, data_publicacao) 
  DO UPDATE SET
    pf_sem_impostos = p_pf_sem_impostos,
    importacao_id = p_importacao_id;
    
  RETURN v_medicamento_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
