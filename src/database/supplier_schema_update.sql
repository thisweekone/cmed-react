-- Verificar se a coluna CNPJ já existe na tabela suppliers
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'suppliers'
        AND column_name = 'cnpj'
    ) THEN
        -- Adicionar coluna CNPJ à tabela suppliers
        ALTER TABLE suppliers ADD COLUMN cnpj VARCHAR(18);
        
        -- Adicionar restrição de unicidade para CNPJ
        ALTER TABLE suppliers ADD CONSTRAINT suppliers_cnpj_unique UNIQUE (cnpj);
    END IF;
    
    -- Adicionar colunas para cidade e estado
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'suppliers'
        AND column_name = 'city'
    ) THEN
        ALTER TABLE suppliers ADD COLUMN city VARCHAR(100);
    END IF;
    
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'suppliers'
        AND column_name = 'state'
    ) THEN
        ALTER TABLE suppliers ADD COLUMN state VARCHAR(2);
    END IF;
    
    -- Adicionar colunas para contato principal
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'suppliers'
        AND column_name = 'main_email'
    ) THEN
        ALTER TABLE suppliers ADD COLUMN main_email VARCHAR(255);
    END IF;
    
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'suppliers'
        AND column_name = 'main_phone'
    ) THEN
        ALTER TABLE suppliers ADD COLUMN main_phone VARCHAR(20);
    END IF;
    
    -- Renomear colunas antigas se existirem
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'suppliers'
        AND column_name = 'email'
    ) THEN
        -- Copiar dados da coluna email para main_email se main_email estiver vazio
        UPDATE suppliers SET main_email = email WHERE main_email IS NULL;
    END IF;
    
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'suppliers'
        AND column_name = 'phone'
    ) THEN
        -- Copiar dados da coluna phone para main_phone se main_phone estiver vazio
        UPDATE suppliers SET main_phone = phone WHERE main_phone IS NULL;
    END IF;
END$$;

-- Criar tabela supplier_contacts se não existir
CREATE TABLE IF NOT EXISTS supplier_contacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    position VARCHAR(100),
    email VARCHAR(255),
    phone VARCHAR(20),
    is_primary BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar índice para busca rápida por supplier_id
CREATE INDEX IF NOT EXISTS idx_supplier_contacts_supplier_id ON supplier_contacts(supplier_id);

-- Criar trigger para atualizar o campo updated_at automaticamente
CREATE OR REPLACE FUNCTION update_supplier_contacts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_supplier_contacts_updated_at ON supplier_contacts;
CREATE TRIGGER set_supplier_contacts_updated_at
BEFORE UPDATE ON supplier_contacts
FOR EACH ROW
EXECUTE FUNCTION update_supplier_contacts_updated_at();

-- Migrar dados existentes para a nova estrutura
DO $$
DECLARE
    supplier_record RECORD;
BEGIN
    -- Verificar se as colunas antigas existem e se a tabela de contatos está vazia
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'suppliers'
        AND column_name IN ('email', 'phone')
    ) AND NOT EXISTS (
        SELECT 1 FROM supplier_contacts LIMIT 1
    ) THEN
        -- Para cada fornecedor, criar um contato principal com os dados existentes
        FOR supplier_record IN SELECT id, name, email, phone FROM suppliers WHERE email IS NOT NULL OR phone IS NOT NULL
        LOOP
            INSERT INTO supplier_contacts (
                supplier_id, 
                name, 
                email, 
                phone, 
                is_primary
            ) VALUES (
                supplier_record.id,
                COALESCE(supplier_record.name, 'Contato Principal'),
                supplier_record.email,
                supplier_record.phone,
                TRUE
            );
        END LOOP;
    END IF;
END$$;
