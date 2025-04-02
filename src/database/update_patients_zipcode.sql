-- Script para atualizar a estrutura de endereço na tabela de pacientes existente

-- Verificar se a tabela patients existe
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_name = 'patients'
    ) THEN
        -- Verificar se a coluna address existe
        IF EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_name = 'patients' AND column_name = 'address'
        ) THEN
            -- Backup do endereço atual antes de modificar a estrutura
            ALTER TABLE patients ADD COLUMN IF NOT EXISTS address_backup TEXT;
            
            UPDATE patients SET 
                address_backup = address
            WHERE address IS NOT NULL;
            
            RAISE NOTICE 'Backup do campo address realizado com sucesso';
        END IF;
        
        -- Verificar se a coluna delivery_address existe
        IF EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_name = 'patients' AND column_name = 'delivery_address'
        ) THEN
            -- Backup do endereço de entrega
            ALTER TABLE patients ADD COLUMN IF NOT EXISTS delivery_address_backup TEXT;
            
            UPDATE patients SET 
                delivery_address_backup = delivery_address
            WHERE delivery_address IS NOT NULL;
            
            RAISE NOTICE 'Backup do campo delivery_address realizado com sucesso';
        END IF;
        
        -- Adicionar campo para controlar se o paciente tem endereço de entrega diferente
        ALTER TABLE patients ADD COLUMN IF NOT EXISTS has_delivery_address BOOLEAN DEFAULT FALSE;
        
        -- Adicionar novos campos de endereço principal
        ALTER TABLE patients ADD COLUMN IF NOT EXISTS zipcode VARCHAR(9);
        ALTER TABLE patients ADD COLUMN IF NOT EXISTS street VARCHAR(255);
        ALTER TABLE patients ADD COLUMN IF NOT EXISTS street_number VARCHAR(20);
        ALTER TABLE patients ADD COLUMN IF NOT EXISTS complement VARCHAR(100);
        ALTER TABLE patients ADD COLUMN IF NOT EXISTS neighborhood VARCHAR(100);
        ALTER TABLE patients ADD COLUMN IF NOT EXISTS city VARCHAR(100);
        ALTER TABLE patients ADD COLUMN IF NOT EXISTS state VARCHAR(2);
        
        -- Adicionar novos campos de endereço de entrega
        ALTER TABLE patients ADD COLUMN IF NOT EXISTS delivery_zipcode VARCHAR(9);
        ALTER TABLE patients ADD COLUMN IF NOT EXISTS delivery_street VARCHAR(255);
        ALTER TABLE patients ADD COLUMN IF NOT EXISTS delivery_street_number VARCHAR(20);
        ALTER TABLE patients ADD COLUMN IF NOT EXISTS delivery_complement VARCHAR(100);
        ALTER TABLE patients ADD COLUMN IF NOT EXISTS delivery_neighborhood VARCHAR(100);
        ALTER TABLE patients ADD COLUMN IF NOT EXISTS delivery_city VARCHAR(100);
        ALTER TABLE patients ADD COLUMN IF NOT EXISTS delivery_state VARCHAR(2);
        
        -- Criar índices para os novos campos
        CREATE INDEX IF NOT EXISTS idx_patients_zipcode ON patients(zipcode);
        CREATE INDEX IF NOT EXISTS idx_patients_city ON patients(city);
        CREATE INDEX IF NOT EXISTS idx_patients_state ON patients(state);
        CREATE INDEX IF NOT EXISTS idx_patients_delivery_city ON patients(delivery_city);
        CREATE INDEX IF NOT EXISTS idx_patients_delivery_state ON patients(delivery_state);
        
        RAISE NOTICE 'Campos de endereço atualizados na tabela patients';
        
        -- Verificar se devemos remover as colunas antigas
        -- Nota: Isso é opcional e deve ser feito apenas quando a migração estiver completa
        /*
        IF EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_name = 'patients' AND column_name = 'address'
        ) THEN
            ALTER TABLE patients DROP COLUMN address;
            RAISE NOTICE 'Coluna address removida';
        END IF;
        
        IF EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_name = 'patients' AND column_name = 'delivery_address'
        ) THEN
            ALTER TABLE patients DROP COLUMN delivery_address;
            RAISE NOTICE 'Coluna delivery_address removida';
        END IF;
        */
    ELSE
        RAISE NOTICE 'A tabela patients não existe';
    END IF;
END$$;
