// Este arquivo contém apenas os scripts SQL para referência.
// Estes scripts precisam ser executados manualmente no SQL Editor do Supabase.

/**
 * Script de criação das tabelas no Supabase
 */
const createTablesScript = `
-- 1. Criar tabela de importações
CREATE TABLE IF NOT EXISTS importacoes (
  id SERIAL PRIMARY KEY,
  nome_arquivo TEXT NOT NULL,
  data_importacao TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  total_registros INTEGER NOT NULL DEFAULT 0,
  registros_importados INTEGER NOT NULL DEFAULT 0,
  registros_com_erro INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pendente'
);

-- 2. Criar tabela de medicamentos base
CREATE TABLE IF NOT EXISTS medicamentos_base (
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

-- 3. Criar tabela de histórico de preços
CREATE TABLE IF NOT EXISTS precos_historico (
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

-- 4. Criar índices para melhorar a performance das consultas
CREATE INDEX IF NOT EXISTS idx_medicamentos_base_substancia ON medicamentos_base(substancia);
CREATE INDEX IF NOT EXISTS idx_medicamentos_base_produto ON medicamentos_base(produto);
CREATE INDEX IF NOT EXISTS idx_medicamentos_base_laboratorio ON medicamentos_base(laboratorio);
CREATE INDEX IF NOT EXISTS idx_precos_historico_data ON precos_historico(data_publicacao);
CREATE INDEX IF NOT EXISTS idx_precos_historico_medicamento_id ON precos_historico(medicamento_id);
`;

/**
 * Script de criação da função de hash
 */
const hashFunctionScript = `
-- Função para gerar hash identificador do medicamento
CREATE OR REPLACE FUNCTION generate_medicamento_hash(
  p_substancia TEXT,
  p_laboratorio TEXT,
  p_produto TEXT,
  p_apresentacao TEXT,
  p_codigo_ggrem TEXT
) RETURNS TEXT AS $$
BEGIN
  RETURN md5(
    COALESCE(LOWER(p_substancia), '') || '|' ||
    COALESCE(LOWER(p_laboratorio), '') || '|' ||
    COALESCE(LOWER(p_produto), '') || '|' ||
    COALESCE(LOWER(p_apresentacao), '') || '|' ||
    COALESCE(LOWER(p_codigo_ggrem), '')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
`;

/**
 * Script de criação da função de upsert de medicamentos
 */
const upsertFunctionScript = `
-- Função para inserir ou atualizar medicamento com preço
CREATE OR REPLACE FUNCTION upsert_medicamento_com_preco(
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
  p_data_publicacao DATE,
  p_pf_sem_impostos NUMERIC,
  p_importacao_id INTEGER
) RETURNS INTEGER AS $$
DECLARE
  v_hash TEXT;
  v_medicamento_id INTEGER;
BEGIN
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
    v_medicamento_id, p_importacao_id, p_data_publicacao, p_pf_sem_impostos
  )
  ON CONFLICT (medicamento_id, data_publicacao) 
  DO UPDATE SET
    pf_sem_impostos = p_pf_sem_impostos,
    importacao_id = p_importacao_id;
    
  RETURN v_medicamento_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
`;

/**
 * Script para configurar as políticas de segurança (RLS)
 */
const securityPoliciesScript = `
-- Habilitar acesso à tabela de medicamentos_base via API
ALTER TABLE medicamentos_base ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Permitir acesso anônimo a medicamentos_base" ON medicamentos_base
  FOR ALL USING (true);

-- Habilitar acesso à tabela de precos_historico via API
ALTER TABLE precos_historico ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Permitir acesso anônimo a precos_historico" ON precos_historico
  FOR ALL USING (true);

-- Habilitar acesso à tabela de importacoes via API
ALTER TABLE importacoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Permitir acesso anônimo a importacoes" ON importacoes
  FOR ALL USING (true);
`;

// Estamos exportando apenas constantes com os scripts SQL
// Estes scripts não serão executados automaticamente
// É necessário copiar e colar no SQL Editor do Supabase
export const sqlScripts = {
  createTablesScript,
  hashFunctionScript,
  upsertFunctionScript, 
  securityPoliciesScript
};

export default sqlScripts;
