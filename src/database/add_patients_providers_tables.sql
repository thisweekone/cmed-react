-- Script para criar as tabelas de pacientes e operadoras de saúde
-- e modificar a estrutura de orçamentos para suportar múltiplos medicamentos

-- Criar tabela de operadoras de saúde
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_name = 'insurance_providers'
    ) THEN
        CREATE TABLE insurance_providers (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            name VARCHAR(255) NOT NULL,
            code VARCHAR(50),
            contact_name VARCHAR(255),
            contact_phone VARCHAR(50),
            contact_email VARCHAR(255),
            address TEXT,
            notes TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        -- Trigger para atualizar o campo updated_at
        CREATE TRIGGER update_insurance_providers_updated_at
        BEFORE UPDATE ON insurance_providers
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
        
        RAISE NOTICE 'Tabela insurance_providers criada com sucesso';
    ELSE
        RAISE NOTICE 'A tabela insurance_providers já existe';
    END IF;
END$$;

-- Criar tabela de pacientes
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_name = 'patients'
    ) THEN
        CREATE TABLE patients (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            name VARCHAR(255) NOT NULL,
            birth_date DATE,
            gender VARCHAR(20),
            document VARCHAR(50),
            phone VARCHAR(50),
            email VARCHAR(255),
            address TEXT,
            insurance_provider_id UUID REFERENCES insurance_providers(id),
            notes TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        -- Trigger para atualizar o campo updated_at
        CREATE TRIGGER update_patients_updated_at
        BEFORE UPDATE ON patients
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
        
        RAISE NOTICE 'Tabela patients criada com sucesso';
    ELSE
        RAISE NOTICE 'A tabela patients já existe';
    END IF;
END$$;

-- Criar tabela de itens de orçamento
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_name = 'quote_items'
    ) THEN
        CREATE TABLE quote_items (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            quote_id UUID NOT NULL,
            medicine_id UUID NOT NULL REFERENCES medicamentos_base(id),
            supplier_id UUID NOT NULL REFERENCES suppliers(id),
            quantity INTEGER NOT NULL DEFAULT 1,
            unit_price DECIMAL(10, 2) NOT NULL,
            margin_percentage DECIMAL(5, 2) NOT NULL DEFAULT 20,
            final_price DECIMAL(10, 2) NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            FOREIGN KEY (quote_id) REFERENCES quotes(id) ON DELETE CASCADE
        );

        -- Trigger para atualizar o campo updated_at
        CREATE TRIGGER update_quote_items_updated_at
        BEFORE UPDATE ON quote_items
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
        
        RAISE NOTICE 'Tabela quote_items criada com sucesso';
    ELSE
        RAISE NOTICE 'A tabela quote_items já existe';
    END IF;
END$$;

-- Modificar a tabela de orçamentos
DO $$
BEGIN
    -- Verificar se a coluna patient_id já existe
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'quotes' AND column_name = 'patient_id'
    ) THEN
        -- Adicionar coluna patient_id
        ALTER TABLE quotes ADD COLUMN patient_id UUID REFERENCES patients(id);
        RAISE NOTICE 'Coluna patient_id adicionada à tabela quotes';
    ELSE
        RAISE NOTICE 'A coluna patient_id já existe na tabela quotes';
    END IF;

    -- Verificar se a coluna total_price já existe
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'quotes' AND column_name = 'total_price'
    ) THEN
        -- Adicionar coluna total_price
        ALTER TABLE quotes ADD COLUMN total_price DECIMAL(10, 2);
        RAISE NOTICE 'Coluna total_price adicionada à tabela quotes';
    ELSE
        RAISE NOTICE 'A coluna total_price já existe na tabela quotes';
    END IF;

    -- Verificar se a coluna insurance_provider_id já existe
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'quotes' AND column_name = 'insurance_provider_id'
    ) THEN
        -- Adicionar coluna insurance_provider_id
        ALTER TABLE quotes ADD COLUMN insurance_provider_id UUID REFERENCES insurance_providers(id);
        RAISE NOTICE 'Coluna insurance_provider_id adicionada à tabela quotes';
    ELSE
        RAISE NOTICE 'A coluna insurance_provider_id já existe na tabela quotes';
    END IF;
END$$;

-- Migrar dados existentes (opcional)
DO $$
DECLARE
    quote_record RECORD;
BEGIN
    -- Verificar se existem orçamentos antigos para migrar
    IF EXISTS (
        SELECT 1
        FROM quotes
        WHERE medicine_id IS NOT NULL AND supplier_id IS NOT NULL
    ) THEN
        -- Migrar orçamentos existentes para o novo formato
        FOR quote_record IN 
            SELECT id, medicine_id, supplier_id, price
            FROM quotes
            WHERE medicine_id IS NOT NULL AND supplier_id IS NOT NULL
        LOOP
            -- Inserir na tabela quote_items
            INSERT INTO quote_items (
                quote_id, 
                medicine_id, 
                supplier_id, 
                quantity, 
                unit_price, 
                margin_percentage, 
                final_price
            )
            VALUES (
                quote_record.id,
                quote_record.medicine_id,
                quote_record.supplier_id,
                1,
                quote_record.price,
                20,
                quote_record.price
            );
            
            -- Atualizar o total_price na tabela quotes
            UPDATE quotes
            SET total_price = quote_record.price
            WHERE id = quote_record.id;
        END LOOP;
        
        RAISE NOTICE 'Dados migrados com sucesso para o novo formato';
    ELSE
        RAISE NOTICE 'Não há dados para migrar';
    END IF;
END$$;
