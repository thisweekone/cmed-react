-- Funções para gerenciar orçamentos com múltiplos itens

-- Função para criar um orçamento com seus itens em uma única transação
CREATE OR REPLACE FUNCTION create_quote_with_items(
    quote_data JSONB,
    items_data JSONB
) RETURNS JSONB AS $$
DECLARE
    new_quote_id UUID;
    new_quote JSONB;
    item JSONB;
    total_price DECIMAL(10, 2) := 0;
BEGIN
    -- Inserir o orçamento principal
    INSERT INTO quotes (
        patient_id,
        insurance_provider_id,
        status,
        notes,
        created_at,
        updated_at
    )
    VALUES (
        (quote_data->>'patient_id')::UUID,
        (quote_data->>'insurance_provider_id')::UUID,
        COALESCE(quote_data->>'status', 'pendente'),
        quote_data->>'notes',
        NOW(),
        NOW()
    )
    RETURNING id INTO new_quote_id;
    
    -- Inserir cada item do orçamento
    FOR item IN SELECT * FROM jsonb_array_elements(items_data)
    LOOP
        -- Calcular o preço final para cada item
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
            new_quote_id,
            (item->>'medicine_id')::UUID,
            (item->>'supplier_id')::UUID,
            COALESCE((item->>'quantity')::INTEGER, 1),
            (item->>'unit_price')::DECIMAL(10, 2),
            COALESCE((item->>'margin_percentage')::DECIMAL(5, 2), 20),
            (item->>'final_price')::DECIMAL(10, 2)
        );
        
        -- Somar ao preço total
        total_price := total_price + ((item->>'final_price')::DECIMAL(10, 2) * COALESCE((item->>'quantity')::INTEGER, 1));
    END LOOP;
    
    -- Atualizar o preço total do orçamento
    UPDATE quotes
    SET total_price = total_price
    WHERE id = new_quote_id;
    
    -- Retornar o orçamento criado com seus itens
    SELECT jsonb_build_object(
        'id', q.id,
        'patient_id', q.patient_id,
        'insurance_provider_id', q.insurance_provider_id,
        'status', q.status,
        'total_price', q.total_price,
        'notes', q.notes,
        'created_at', q.created_at,
        'updated_at', q.updated_at,
        'items', (
            SELECT jsonb_agg(
                jsonb_build_object(
                    'id', qi.id,
                    'medicine_id', qi.medicine_id,
                    'supplier_id', qi.supplier_id,
                    'quantity', qi.quantity,
                    'unit_price', qi.unit_price,
                    'margin_percentage', qi.margin_percentage,
                    'final_price', qi.final_price
                )
            )
            FROM quote_items qi
            WHERE qi.quote_id = q.id
        )
    ) INTO new_quote
    FROM quotes q
    WHERE q.id = new_quote_id;
    
    RETURN new_quote;
END;
$$ LANGUAGE plpgsql;

-- Função para atualizar um orçamento com seus itens em uma única transação
CREATE OR REPLACE FUNCTION update_quote_with_items(
    quote_id UUID,
    quote_data JSONB,
    items_data JSONB
) RETURNS JSONB AS $$
DECLARE
    updated_quote JSONB;
    item JSONB;
    total_price DECIMAL(10, 2) := 0;
BEGIN
    -- Atualizar o orçamento principal
    UPDATE quotes
    SET
        patient_id = COALESCE((quote_data->>'patient_id')::UUID, patient_id),
        insurance_provider_id = COALESCE((quote_data->>'insurance_provider_id')::UUID, insurance_provider_id),
        status = COALESCE(quote_data->>'status', status),
        notes = COALESCE(quote_data->>'notes', notes),
        updated_at = NOW()
    WHERE id = quote_id;
    
    -- Remover todos os itens existentes
    DELETE FROM quote_items
    WHERE quote_id = quote_id;
    
    -- Inserir os novos itens do orçamento
    FOR item IN SELECT * FROM jsonb_array_elements(items_data)
    LOOP
        -- Inserir cada item
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
            quote_id,
            (item->>'medicine_id')::UUID,
            (item->>'supplier_id')::UUID,
            COALESCE((item->>'quantity')::INTEGER, 1),
            (item->>'unit_price')::DECIMAL(10, 2),
            COALESCE((item->>'margin_percentage')::DECIMAL(5, 2), 20),
            (item->>'final_price')::DECIMAL(10, 2)
        );
        
        -- Somar ao preço total
        total_price := total_price + ((item->>'final_price')::DECIMAL(10, 2) * COALESCE((item->>'quantity')::INTEGER, 1));
    END LOOP;
    
    -- Atualizar o preço total do orçamento
    UPDATE quotes
    SET total_price = total_price
    WHERE id = quote_id;
    
    -- Retornar o orçamento atualizado com seus itens
    SELECT jsonb_build_object(
        'id', q.id,
        'patient_id', q.patient_id,
        'insurance_provider_id', q.insurance_provider_id,
        'status', q.status,
        'total_price', q.total_price,
        'notes', q.notes,
        'created_at', q.created_at,
        'updated_at', q.updated_at,
        'items', (
            SELECT jsonb_agg(
                jsonb_build_object(
                    'id', qi.id,
                    'medicine_id', qi.medicine_id,
                    'supplier_id', qi.supplier_id,
                    'quantity', qi.quantity,
                    'unit_price', qi.unit_price,
                    'margin_percentage', qi.margin_percentage,
                    'final_price', qi.final_price
                )
            )
            FROM quote_items qi
            WHERE qi.quote_id = q.id
        )
    ) INTO updated_quote
    FROM quotes q
    WHERE q.id = quote_id;
    
    RETURN updated_quote;
END;
$$ LANGUAGE plpgsql;
