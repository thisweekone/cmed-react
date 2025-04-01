-- Script SQL para criar a tabela de histórico de preços

-- Verificar se a tabela price_history já existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_name = 'price_history'
    ) THEN
        -- Criar tabela de histórico de preços
        CREATE TABLE price_history (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            medicine_supplier_id UUID NOT NULL REFERENCES medicine_suppliers(id) ON DELETE CASCADE,
            price DECIMAL(10, 2) NOT NULL,
            quote_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            notes TEXT,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        
        -- Criar índice para melhorar a performance de consultas
        CREATE INDEX idx_price_history_medicine_supplier_id ON price_history(medicine_supplier_id);
        CREATE INDEX idx_price_history_quote_date ON price_history(quote_date);
        
        -- Criar trigger para atualizar o campo updated_at automaticamente
        CREATE TRIGGER set_updated_at
        BEFORE UPDATE ON price_history
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
        
        RAISE NOTICE 'Tabela price_history criada com sucesso';
    ELSE
        RAISE NOTICE 'A tabela price_history já existe';
    END IF;
END$$;

-- Migrar dados existentes para a tabela de histórico
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_name = 'price_history'
    ) AND (
        SELECT COUNT(*) FROM price_history
    ) = 0 THEN
        -- Inserir dados existentes na tabela de histórico
        INSERT INTO price_history (medicine_supplier_id, price, quote_date, created_at, updated_at)
        SELECT 
            id, 
            last_quote_price, 
            last_quote_date, 
            NOW(), 
            NOW()
        FROM medicine_suppliers
        WHERE last_quote_price IS NOT NULL AND last_quote_date IS NOT NULL;
        
        RAISE NOTICE 'Dados existentes migrados para a tabela price_history';
    END IF;
END$$;
