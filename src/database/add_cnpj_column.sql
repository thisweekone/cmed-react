-- Script SQL para adicionar e configurar a coluna CNPJ na tabela de fornecedores

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
        
        RAISE NOTICE 'Coluna CNPJ adicionada com sucesso à tabela suppliers';
    ELSE
        RAISE NOTICE 'A coluna CNPJ já existe na tabela suppliers';
    END IF;
END$$;

-- Verificar se existem outras colunas necessárias
DO $$
BEGIN
    -- Verificar e adicionar coluna zip_code se não existir
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'suppliers'
        AND column_name = 'zip_code'
    ) THEN
        ALTER TABLE suppliers ADD COLUMN zip_code VARCHAR(10);
        RAISE NOTICE 'Coluna zip_code adicionada com sucesso à tabela suppliers';
    END IF;
    
    -- Verificar e adicionar colunas para cidade e estado se não existirem
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'suppliers'
        AND column_name = 'city'
    ) THEN
        ALTER TABLE suppliers ADD COLUMN city VARCHAR(100);
        RAISE NOTICE 'Coluna city adicionada com sucesso à tabela suppliers';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'suppliers'
        AND column_name = 'state'
    ) THEN
        ALTER TABLE suppliers ADD COLUMN state VARCHAR(2);
        RAISE NOTICE 'Coluna state adicionada com sucesso à tabela suppliers';
    END IF;
    
    -- Verificar e adicionar colunas para número e complemento se não existirem
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'suppliers'
        AND column_name = 'number'
    ) THEN
        ALTER TABLE suppliers ADD COLUMN number VARCHAR(20);
        RAISE NOTICE 'Coluna number adicionada com sucesso à tabela suppliers';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'suppliers'
        AND column_name = 'complement'
    ) THEN
        ALTER TABLE suppliers ADD COLUMN complement VARCHAR(100);
        RAISE NOTICE 'Coluna complement adicionada com sucesso à tabela suppliers';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'suppliers'
        AND column_name = 'district'
    ) THEN
        ALTER TABLE suppliers ADD COLUMN district VARCHAR(100);
        RAISE NOTICE 'Coluna district adicionada com sucesso à tabela suppliers';
    END IF;
    
    -- Verificar e adicionar colunas para contato principal
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'suppliers'
        AND column_name = 'main_email'
    ) THEN
        -- Se a coluna email existir, copiar os dados para main_email
        IF EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_name = 'suppliers'
            AND column_name = 'email'
        ) THEN
            ALTER TABLE suppliers ADD COLUMN main_email VARCHAR(255);
            UPDATE suppliers SET main_email = email WHERE email IS NOT NULL;
            RAISE NOTICE 'Coluna main_email adicionada e dados migrados da coluna email';
        ELSE
            ALTER TABLE suppliers ADD COLUMN main_email VARCHAR(255);
            RAISE NOTICE 'Coluna main_email adicionada com sucesso à tabela suppliers';
        END IF;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'suppliers'
        AND column_name = 'main_phone'
    ) THEN
        -- Se a coluna phone existir, copiar os dados para main_phone
        IF EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_name = 'suppliers'
            AND column_name = 'phone'
        ) THEN
            ALTER TABLE suppliers ADD COLUMN main_phone VARCHAR(20);
            UPDATE suppliers SET main_phone = phone WHERE phone IS NOT NULL;
            RAISE NOTICE 'Coluna main_phone adicionada e dados migrados da coluna phone';
        ELSE
            ALTER TABLE suppliers ADD COLUMN main_phone VARCHAR(20);
            RAISE NOTICE 'Coluna main_phone adicionada com sucesso à tabela suppliers';
        END IF;
    END IF;
    
    -- Verificar e adicionar coluna website se não existir
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'suppliers'
        AND column_name = 'website'
    ) THEN
        ALTER TABLE suppliers ADD COLUMN website VARCHAR(255);
        RAISE NOTICE 'Coluna website adicionada com sucesso à tabela suppliers';
    END IF;
END$$;

-- Verificar se a tabela supplier_contacts existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_name = 'supplier_contacts'
    ) THEN
        -- Criar tabela de contatos de fornecedores
        CREATE TABLE supplier_contacts (
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
        CREATE INDEX idx_supplier_contacts_supplier_id ON supplier_contacts(supplier_id);
        
        RAISE NOTICE 'Tabela supplier_contacts criada com sucesso';
    ELSE
        RAISE NOTICE 'A tabela supplier_contacts já existe';
    END IF;
END$$;

-- Criar ou substituir a função de trigger para atualizar o campo updated_at
CREATE OR REPLACE FUNCTION update_supplier_contacts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar o trigger se não existir
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'set_supplier_contacts_updated_at'
    ) THEN
        DROP TRIGGER IF EXISTS set_supplier_contacts_updated_at ON supplier_contacts;
        CREATE TRIGGER set_supplier_contacts_updated_at
        BEFORE UPDATE ON supplier_contacts
        FOR EACH ROW
        EXECUTE FUNCTION update_supplier_contacts_updated_at();
        
        RAISE NOTICE 'Trigger set_supplier_contacts_updated_at criado com sucesso';
    END IF;
END$$;

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
        FOR supplier_record IN 
            SELECT id, name, email, phone 
            FROM suppliers 
            WHERE email IS NOT NULL OR phone IS NOT NULL
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
        
        RAISE NOTICE 'Dados migrados com sucesso para a tabela supplier_contacts';
    END IF;
END$$;
