-- Script SQL para criar a tabela de pacientes

-- Verificar se a tabela patients já existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_name = 'patients'
    ) THEN
        -- Criar tabela de pacientes
        CREATE TABLE patients (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            name VARCHAR(255) NOT NULL,
            cpf VARCHAR(14),
            birth_date DATE,
            gender VARCHAR(20),
            phone VARCHAR(20),
            email VARCHAR(255),
            
            -- Campos de endereço principal
            zipCode VARCHAR(9),
            street VARCHAR(255),
            street_number VARCHAR(20),
            complement VARCHAR(100),
            neighborhood VARCHAR(100),
            city VARCHAR(100),
            state VARCHAR(2),
            
            -- Flag e campos de endereço de entrega
            has_delivery_address BOOLEAN DEFAULT FALSE,
            delivery_zipCode VARCHAR(9),
            delivery_street VARCHAR(255),
            delivery_street_number VARCHAR(20),
            delivery_complement VARCHAR(100),
            delivery_neighborhood VARCHAR(100),
            delivery_city VARCHAR(100),
            delivery_state VARCHAR(2),
            
            insurance_provider_id UUID,
            insurance_card_number VARCHAR(50),
            notes TEXT,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        
        -- Criar índice para melhorar a performance de consultas
        CREATE INDEX idx_patients_name ON patients(name);
        CREATE INDEX idx_patients_cpf ON patients(cpf);
        CREATE INDEX idx_patients_insurance_provider_id ON patients(insurance_provider_id);
        CREATE INDEX idx_patients_zipCode ON patients(zipCode);
        CREATE INDEX idx_patients_city ON patients(city);
        CREATE INDEX idx_patients_state ON patients(state);
        CREATE INDEX idx_patients_delivery_city ON patients(delivery_city);
        CREATE INDEX idx_patients_delivery_state ON patients(delivery_state);
        
        -- Criar trigger para atualizar o campo updated_at automaticamente
        CREATE TRIGGER set_updated_at
        BEFORE UPDATE ON patients
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
        
        RAISE NOTICE 'Tabela patients criada com sucesso';
    ELSE
        RAISE NOTICE 'A tabela patients já existe';
    END IF;
END$$;

-- Criar tabela de contatos do paciente
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_name = 'patient_contacts'
    ) THEN
        -- Criar tabela de contatos
        CREATE TABLE patient_contacts (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
            name VARCHAR(255) NOT NULL,
            relationship VARCHAR(100),
            phone VARCHAR(20),
            email VARCHAR(255),
            notes TEXT,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        
        -- Criar índice para melhorar a performance de consultas
        CREATE INDEX idx_patient_contacts_patient_id ON patient_contacts(patient_id);
        CREATE INDEX idx_patient_contacts_name ON patient_contacts(name);
        
        -- Criar trigger para atualizar o campo updated_at automaticamente
        CREATE TRIGGER set_updated_at
        BEFORE UPDATE ON patient_contacts
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
        
        RAISE NOTICE 'Tabela patient_contacts criada com sucesso';
    ELSE
        RAISE NOTICE 'A tabela patient_contacts já existe';
    END IF;
END$$;

-- Migrar dados existentes da tabela quotes para a tabela patients
DO $$
DECLARE
    patient_record RECORD;
    new_patient_id UUID;
BEGIN
    -- Verificar se a tabela patients existe e se já tem dados
    IF EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_name = 'patients'
    ) AND (
        SELECT COUNT(*) FROM patients
    ) = 0 AND EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_name = 'quotes'
    ) THEN
        -- Obter pacientes únicos da tabela quotes
        FOR patient_record IN 
            SELECT DISTINCT patient_name FROM quotes WHERE patient_name IS NOT NULL
        LOOP
            -- Inserir paciente na nova tabela
            INSERT INTO patients (name) 
            VALUES (patient_record.patient_name)
            RETURNING id INTO new_patient_id;
            
            -- Atualizar referências na tabela quotes
            UPDATE quotes 
            SET patient_id = new_patient_id
            WHERE patient_name = patient_record.patient_name;
            
            RAISE NOTICE 'Paciente migrado: %', patient_record.patient_name;
        END LOOP;
        
        RAISE NOTICE 'Migração de pacientes concluída';
    ELSE
        RAISE NOTICE 'Não foi necessário migrar pacientes';
    END IF;
END$$;
