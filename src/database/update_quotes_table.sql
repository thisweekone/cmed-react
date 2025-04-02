-- Script SQL para atualizar a tabela de orçamentos (quotes) para usar referências às novas tabelas

-- Primeiro, adicionar as colunas para as novas referências
DO $$
BEGIN
    -- Adicionar coluna patient_id se não existir
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'quotes'
        AND column_name = 'patient_id'
    ) THEN
        ALTER TABLE quotes ADD COLUMN patient_id UUID REFERENCES patients(id);
        RAISE NOTICE 'Coluna patient_id adicionada à tabela quotes';
    ELSE
        RAISE NOTICE 'A coluna patient_id já existe na tabela quotes';
    END IF;

    -- Adicionar coluna insurance_provider_id se não existir
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'quotes'
        AND column_name = 'insurance_provider_id'
    ) THEN
        ALTER TABLE quotes ADD COLUMN insurance_provider_id UUID REFERENCES insurance_providers(id);
        RAISE NOTICE 'Coluna insurance_provider_id adicionada à tabela quotes';
    ELSE
        RAISE NOTICE 'A coluna insurance_provider_id já existe na tabela quotes';
    END IF;
END$$;

-- Migrar dados existentes para as novas colunas
DO $$
DECLARE
    quote_record RECORD;
    patient_id_var UUID;
    provider_id_var UUID;
BEGIN
    -- Verificar se as tabelas existem
    IF EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_name = 'quotes'
    ) AND EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_name = 'patients'
    ) AND EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_name = 'insurance_providers'
    ) THEN
        -- Atualizar cada registro na tabela quotes
        FOR quote_record IN 
            SELECT id, patient_name, insurance_provider 
            FROM quotes 
            WHERE (quotes.patient_id IS NULL OR quotes.insurance_provider_id IS NULL)
              AND (patient_name IS NOT NULL OR insurance_provider IS NOT NULL)
        LOOP
            -- Buscar ID do paciente
            IF quote_record.patient_name IS NOT NULL THEN
                SELECT id INTO patient_id_var 
                FROM patients 
                WHERE name = quote_record.patient_name 
                LIMIT 1;
                
                IF patient_id_var IS NOT NULL THEN
                    UPDATE quotes 
                    SET patient_id = patient_id_var 
                    WHERE id = quote_record.id;
                END IF;
            END IF;
            
            -- Buscar ID da operadora
            IF quote_record.insurance_provider IS NOT NULL THEN
                SELECT id INTO provider_id_var 
                FROM insurance_providers 
                WHERE name = quote_record.insurance_provider 
                LIMIT 1;
                
                IF provider_id_var IS NOT NULL THEN
                    UPDATE quotes 
                    SET insurance_provider_id = provider_id_var 
                    WHERE id = quote_record.id;
                END IF;
            END IF;
        END LOOP;
        
        RAISE NOTICE 'Dados migrados para as novas colunas de referência na tabela quotes';
    END IF;
END$$;

-- Adicionar margem de lucro à tabela quotes
DO $$
BEGIN
    -- Adicionar coluna profit_margin se não existir
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'quotes'
        AND column_name = 'profit_margin'
    ) THEN
        ALTER TABLE quotes ADD COLUMN profit_margin DECIMAL(5, 2) DEFAULT 20.00;
        RAISE NOTICE 'Coluna profit_margin adicionada à tabela quotes';
    ELSE
        RAISE NOTICE 'A coluna profit_margin já existe na tabela quotes';
    END IF;

    -- Adicionar coluna supplier_price se não existir
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'quotes'
        AND column_name = 'supplier_price'
    ) THEN
        ALTER TABLE quotes ADD COLUMN supplier_price DECIMAL(10, 2);
        RAISE NOTICE 'Coluna supplier_price adicionada à tabela quotes';
    ELSE
        RAISE NOTICE 'A coluna supplier_price já existe na tabela quotes';
    END IF;
END$$;

-- Preencher a coluna supplier_price com base nos dados existentes
DO $$
BEGIN
    -- Atualizar supplier_price para orçamentos existentes
    UPDATE quotes q
    SET supplier_price = ms.last_quote_price
    FROM medicine_suppliers ms
    WHERE q.medicine_id = ms.medicine_id 
      AND q.supplier_id = ms.supplier_id
      AND q.supplier_price IS NULL
      AND ms.last_quote_price IS NOT NULL;
    
    RAISE NOTICE 'Coluna supplier_price preenchida com base nos dados existentes';
END$$;
