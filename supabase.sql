-- Tabela de importações
CREATE TABLE importacoes (
  id SERIAL PRIMARY KEY,
  nome_arquivo TEXT NOT NULL,
  data_importacao TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  total_registros INTEGER DEFAULT 0,
  registros_importados INTEGER DEFAULT 0,
  registros_com_erro INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pendente' CHECK (status IN ('pendente', 'completo', 'parcial', 'erro'))
);

-- Tabela de medicamentos
CREATE TABLE medicamentos (
  id SERIAL PRIMARY KEY,
  substancia TEXT NOT NULL,
  laboratorio TEXT NOT NULL,
  produto TEXT NOT NULL,
  apresentacao TEXT,
  codigo_ggrem TEXT,
  registro TEXT,
  ean_1 TEXT,
  classe_terapeutica TEXT,
  tipo_de_produto TEXT NOT NULL,
  regime_de_preco TEXT NOT NULL,
  pf_sem_impostos DECIMAL(10, 2),
  data_publicacao DATE NOT NULL,
  importacao_id INTEGER REFERENCES importacoes(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Índices para melhorar performance de consultas
CREATE INDEX idx_medicamentos_substancia ON medicamentos (substancia);
CREATE INDEX idx_medicamentos_laboratorio ON medicamentos (laboratorio);
CREATE INDEX idx_medicamentos_produto ON medicamentos (produto);
CREATE INDEX idx_medicamentos_importacao_id ON medicamentos (importacao_id);

-- Políticas de segurança RLS (Row Level Security)
-- Active Row Level Security
ALTER TABLE importacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE medicamentos ENABLE ROW LEVEL SECURITY;

-- Criar políticas para acesso anônimo para este exemplo
-- Em produção você deve definir políticas baseadas em autenticação
CREATE POLICY "Permitir acesso anônimo a importacoes" ON importacoes
  FOR ALL USING (true);

CREATE POLICY "Permitir acesso anônimo a medicamentos" ON medicamentos
  FOR ALL USING (true);
