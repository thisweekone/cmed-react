-- Script SQL para adicionar as colunas notes e address à tabela suppliers

-- Verificar se a coluna notes já existe na tabela suppliers
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'suppliers'
        AND column_name = 'notes'
    ) THEN
        -- Adicionar coluna notes à tabela suppliers
        ALTER TABLE suppliers ADD COLUMN notes TEXT;
        
        RAISE NOTICE 'Coluna notes adicionada com sucesso à tabela suppliers';
    ELSE
        RAISE NOTICE 'A coluna notes já existe na tabela suppliers';
    END IF;
END$$;

-- Verificar se a coluna address já existe na tabela suppliers
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'suppliers'
        AND column_name = 'address'
    ) THEN
        -- Adicionar coluna address à tabela suppliers
        ALTER TABLE suppliers ADD COLUMN address VARCHAR(255);
        
        RAISE NOTICE 'Coluna address adicionada com sucesso à tabela suppliers';
    ELSE
        RAISE NOTICE 'A coluna address já existe na tabela suppliers';
    END IF;
END$$;
