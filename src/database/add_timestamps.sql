-- Script SQL para adicionar as colunas de timestamp à tabela suppliers

-- Verificar e adicionar a coluna created_at se não existir
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'suppliers'
        AND column_name = 'created_at'
    ) THEN
        -- Adicionar coluna created_at à tabela suppliers
        ALTER TABLE suppliers ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
        
        RAISE NOTICE 'Coluna created_at adicionada com sucesso à tabela suppliers';
    ELSE
        RAISE NOTICE 'A coluna created_at já existe na tabela suppliers';
    END IF;
END$$;

-- Verificar e adicionar a coluna updated_at se não existir
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'suppliers'
        AND column_name = 'updated_at'
    ) THEN
        -- Adicionar coluna updated_at à tabela suppliers
        ALTER TABLE suppliers ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
        
        RAISE NOTICE 'Coluna updated_at adicionada com sucesso à tabela suppliers';
    ELSE
        RAISE NOTICE 'A coluna updated_at já existe na tabela suppliers';
    END IF;
END$$;

-- Criar ou substituir a função para atualizar automaticamente o updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar ou substituir o trigger para atualizar automaticamente o updated_at
DROP TRIGGER IF EXISTS set_updated_at ON suppliers;
CREATE TRIGGER set_updated_at
BEFORE UPDATE ON suppliers
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
