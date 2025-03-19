-- Script para criar todas as tabelas e funções necessárias desde o início

-- 1. Função para gerar hash identificador
CREATE OR REPLACE FUNCTION generate_medicamento_hash(
  p_substancia TEXT,
  p_laboratorio TEXT,
  p_produto TEXT,
  p_apresentacao TEXT,
  p_codigo_ggrem TEXT
) RETURNS TEXT AS $$
BEGIN
  RETURN MD5(
    COALESCE(LOWER(TRIM(p_substancia)), '') || '|' ||
    COALESCE(LOWER(TRIM(p_laboratorio)), '') || '|' ||
    COALESCE(LOWER(TRIM(p_produto)), '') || '|' ||
    COALESCE(LOWER(TRIM(p_apresentacao)), '') || '|' ||
    COALESCE(LOWER(TRIM(p_codigo_ggrem)), '')
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 2. Criar tabela de importações
DROP TABLE IF EXISTS importacoes CASCADE;
CREATE TABLE importacoes (
  id SERIAL PRIMARY KEY,
  nome_arquivo TEXT NOT NULL,
  data_importacao TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  total_registros INTEGER NOT NULL DEFAULT 0,
  registros_importados INTEGER NOT NULL DEFAULT 0,
  registros_com_erro INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pendente'
);

-- 3. Criar tabela de medicamentos base
DROP TABLE IF EXISTS medicamentos_base CASCADE;
CREATE TABLE medicamentos_base (
  id SERIAL PRIMARY KEY,
  codigo_ggrem TEXT,
  substancia TEXT NOT NULL,
  laboratorio TEXT NOT NULL,
  produto TEXT NOT NULL,
  apresentacao TEXT,
  registro TEXT,
  ean_1 TEXT,
  classe_terapeutica TEXT,
  tipo_de_produto TEXT,
  regime_de_preco TEXT,
  hash_identificador TEXT UNIQUE NOT NULL
);

-- 4. Criar tabela de histórico de preços
DROP TABLE IF EXISTS precos_historico CASCADE;
CREATE TABLE precos_historico (
  id SERIAL PRIMARY KEY,
  medicamento_id INTEGER NOT NULL REFERENCES medicamentos_base(id),
  importacao_id INTEGER REFERENCES importacoes(id),
  data_publicacao DATE NOT NULL,
  pf_sem_impostos NUMERIC(12,2),
  pf_0 NUMERIC(12,2),
  pf_12 NUMERIC(12,2),
  pf_17 NUMERIC(12,2),
  pf_17_5 NUMERIC(12,2),
  pf_18 NUMERIC(12,2),
  pf_19 NUMERIC(12,2),
  pf_20 NUMERIC(12,2),
  pmc_0 NUMERIC(12,2),
  pmc_12 NUMERIC(12,2),
  pmc_17 NUMERIC(12,2),
  pmc_17_5 NUMERIC(12,2),
  pmc_18 NUMERIC(12,2),
  pmc_19 NUMERIC(12,2),
  pmc_20 NUMERIC(12,2),
  UNIQUE(medicamento_id, data_publicacao)
);

-- 5. Criar função para inserir ou atualizar medicamento com preço
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

-- 6. Configurar políticas de segurança
ALTER TABLE medicamentos_base ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Permitir acesso anônimo a medicamentos_base" ON medicamentos_base
  FOR ALL USING (true);

ALTER TABLE precos_historico ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Permitir acesso anônimo a precos_historico" ON precos_historico
  FOR ALL USING (true);

ALTER TABLE importacoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Permitir acesso anônimo a importacoes" ON importacoes
  FOR ALL USING (true);
