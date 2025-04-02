-- Script SQL para criar a tabela de operadoras de saúde

-- Verificar se a tabela insurance_providers já existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_name = 'insurance_providers'
    ) THEN
        -- Criar tabela de operadoras de saúde
        CREATE TABLE insurance_providers (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            name VARCHAR(255) NOT NULL,
            cnpj VARCHAR(18),
            ans_code VARCHAR(50),
            contact_name VARCHAR(255),
            phone VARCHAR(20),
            email VARCHAR(255),
            address TEXT,
            coverage_type VARCHAR(100),
            payment_terms TEXT,
            notes TEXT,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        
        -- Criar índice para melhorar a performance de consultas
        CREATE INDEX idx_insurance_providers_name ON insurance_providers(name);
        CREATE INDEX idx_insurance_providers_cnpj ON insurance_providers(cnpj);
        CREATE INDEX idx_insurance_providers_ans_code ON insurance_providers(ans_code);
        
        -- Criar trigger para atualizar o campo updated_at automaticamente
        CREATE TRIGGER set_updated_at
        BEFORE UPDATE ON insurance_providers
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
        
        RAISE NOTICE 'Tabela insurance_providers criada com sucesso';
    ELSE
        RAISE NOTICE 'A tabela insurance_providers já existe';
    END IF;
END$$;

-- Migrar dados existentes da tabela quotes para a tabela insurance_providers
DO $$
DECLARE
    provider_record RECORD;
    new_provider_id UUID;
BEGIN
    -- Verificar se a tabela insurance_providers existe e se já tem dados
    IF EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_name = 'insurance_providers'
    ) AND (
        SELECT COUNT(*) FROM insurance_providers
    ) = 0 AND EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_name = 'quotes'
    ) THEN
        -- Obter operadoras únicas da tabela quotes
        FOR provider_record IN 
            SELECT DISTINCT insurance_provider FROM quotes WHERE insurance_provider IS NOT NULL
        LOOP
            -- Inserir operadora na nova tabela
            INSERT INTO insurance_providers (name) 
            VALUES (provider_record.insurance_provider)
            RETURNING id INTO new_provider_id;
            
            RAISE NOTICE 'Operadora % migrada com ID %', provider_record.insurance_provider, new_provider_id;
        END LOOP;
        
        RAISE NOTICE 'Dados de operadoras migrados da tabela quotes';
    END IF;
END$$;
