-- Script para adicionar chaves estrangeiras e relacionamentos entre tabelas

-- Adicionar chave estrangeira na tabela patients para insurance_providers
DO $$
BEGIN
    -- Verificar se a coluna insurance_provider_id existe na tabela patients
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'patients' AND column_name = 'insurance_provider_id'
    ) THEN
        -- Verificar se a restrição de chave estrangeira já existe
        IF NOT EXISTS (
            SELECT 1
            FROM information_schema.table_constraints tc
            JOIN information_schema.constraint_column_usage ccu 
            ON tc.constraint_name = ccu.constraint_name
            WHERE tc.constraint_type = 'FOREIGN KEY' 
            AND tc.table_name = 'patients' 
            AND ccu.column_name = 'insurance_provider_id'
        ) THEN
            -- Adicionar a chave estrangeira
            ALTER TABLE patients 
            ADD CONSTRAINT fk_patients_insurance_provider 
            FOREIGN KEY (insurance_provider_id) 
            REFERENCES insurance_providers(id) 
            ON DELETE SET NULL;
            
            RAISE NOTICE 'Chave estrangeira adicionada entre patients e insurance_providers';
        ELSE
            RAISE NOTICE 'A chave estrangeira entre patients e insurance_providers já existe';
        END IF;
    ELSE
        RAISE NOTICE 'A coluna insurance_provider_id não existe na tabela patients';
    END IF;
END
$$;

-- Adicionar chave estrangeira na tabela quotes para patients
DO $$
BEGIN
    -- Verificar se a coluna patient_id existe na tabela quotes
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'quotes' AND column_name = 'patient_id'
    ) THEN
        -- Verificar se a restrição de chave estrangeira já existe
        IF NOT EXISTS (
            SELECT 1
            FROM information_schema.table_constraints tc
            JOIN information_schema.constraint_column_usage ccu 
            ON tc.constraint_name = ccu.constraint_name
            WHERE tc.constraint_type = 'FOREIGN KEY' 
            AND tc.table_name = 'quotes' 
            AND ccu.column_name = 'patient_id'
        ) THEN
            -- Adicionar a chave estrangeira
            ALTER TABLE quotes 
            ADD CONSTRAINT fk_quotes_patient 
            FOREIGN KEY (patient_id) 
            REFERENCES patients(id) 
            ON DELETE CASCADE;
            
            RAISE NOTICE 'Chave estrangeira adicionada entre quotes e patients';
        ELSE
            RAISE NOTICE 'A chave estrangeira entre quotes e patients já existe';
        END IF;
    ELSE
        RAISE NOTICE 'A coluna patient_id não existe na tabela quotes';
    END IF;
END
$$;

-- Adicionar chave estrangeira na tabela quotes para insurance_providers
DO $$
BEGIN
    -- Verificar se a coluna insurance_provider_id existe na tabela quotes
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'quotes' AND column_name = 'insurance_provider_id'
    ) THEN
        -- Verificar se a restrição de chave estrangeira já existe
        IF NOT EXISTS (
            SELECT 1
            FROM information_schema.table_constraints tc
            JOIN information_schema.constraint_column_usage ccu 
            ON tc.constraint_name = ccu.constraint_name
            WHERE tc.constraint_type = 'FOREIGN KEY' 
            AND tc.table_name = 'quotes' 
            AND ccu.column_name = 'insurance_provider_id'
        ) THEN
            -- Adicionar a chave estrangeira
            ALTER TABLE quotes 
            ADD CONSTRAINT fk_quotes_insurance_provider 
            FOREIGN KEY (insurance_provider_id) 
            REFERENCES insurance_providers(id) 
            ON DELETE SET NULL;
            
            RAISE NOTICE 'Chave estrangeira adicionada entre quotes e insurance_providers';
        ELSE
            RAISE NOTICE 'A chave estrangeira entre quotes e insurance_providers já existe';
        END IF;
    ELSE
        RAISE NOTICE 'A coluna insurance_provider_id não existe na tabela quotes';
    END IF;
END
$$;

-- Verificar se existe a tabela quote_items e adicionar chaves estrangeiras
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_name = 'quote_items'
    ) THEN
        -- Verificar se a coluna quote_id existe na tabela quote_items
        IF EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_name = 'quote_items' AND column_name = 'quote_id'
        ) THEN
            -- Verificar se a restrição de chave estrangeira já existe
            IF NOT EXISTS (
                SELECT 1
                FROM information_schema.table_constraints tc
                JOIN information_schema.constraint_column_usage ccu 
                ON tc.constraint_name = ccu.constraint_name
                WHERE tc.constraint_type = 'FOREIGN KEY' 
                AND tc.table_name = 'quote_items' 
                AND ccu.column_name = 'quote_id'
            ) THEN
                -- Adicionar a chave estrangeira
                ALTER TABLE quote_items 
                ADD CONSTRAINT fk_quote_items_quote 
                FOREIGN KEY (quote_id) 
                REFERENCES quotes(id) 
                ON DELETE CASCADE;
                
                RAISE NOTICE 'Chave estrangeira adicionada entre quote_items e quotes';
            ELSE
                RAISE NOTICE 'A chave estrangeira entre quote_items e quotes já existe';
            END IF;
        ELSE
            RAISE NOTICE 'A coluna quote_id não existe na tabela quote_items';
        END IF;
    ELSE
        RAISE NOTICE 'A tabela quote_items não existe';
    END IF;
END
$$;

-- Adicionar chave estrangeira na tabela patient_contacts para patients
DO $$
BEGIN
    -- Verificar se a tabela patient_contacts existe
    IF EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_name = 'patient_contacts'
    ) THEN
        -- Verificar se a coluna patient_id existe na tabela patient_contacts
        IF EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_name = 'patient_contacts' AND column_name = 'patient_id'
        ) THEN
            -- Verificar se a restrição de chave estrangeira já existe
            IF NOT EXISTS (
                SELECT 1
                FROM information_schema.table_constraints tc
                JOIN information_schema.constraint_column_usage ccu 
                ON tc.constraint_name = ccu.constraint_name
                WHERE tc.constraint_type = 'FOREIGN KEY' 
                AND tc.table_name = 'patient_contacts' 
                AND ccu.column_name = 'patient_id'
            ) THEN
                -- Adicionar a chave estrangeira
                ALTER TABLE patient_contacts 
                ADD CONSTRAINT fk_patient_contacts_patient 
                FOREIGN KEY (patient_id) 
                REFERENCES patients(id) 
                ON DELETE CASCADE;
                
                RAISE NOTICE 'Chave estrangeira adicionada entre patient_contacts e patients';
            ELSE
                RAISE NOTICE 'A chave estrangeira entre patient_contacts e patients já existe';
            END IF;
        ELSE
            RAISE NOTICE 'A coluna patient_id não existe na tabela patient_contacts';
        END IF;
    ELSE
        RAISE NOTICE 'A tabela patient_contacts não existe';
    END IF;
END
$$;

-- Atualizar o cache de relacionamentos do PostgREST
NOTIFY pgrst, 'reload schema';
