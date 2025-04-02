-- Script SQL para criar a função de estatísticas de preço

-- Criar função para calcular estatísticas de preço
CREATE OR REPLACE FUNCTION get_price_statistics(ms_id TEXT)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    -- Verificar se o ID é válido
    IF ms_id IS NULL OR ms_id = '' THEN
        RETURN json_build_object(
            'count', 0,
            'average', 0,
            'min', 0,
            'max', 0,
            'latest', 0,
            'variation', 0
        );
    END IF;

    -- Calcular estatísticas
    SELECT json_build_object(
        'count', COUNT(price),
        'average', COALESCE(AVG(price), 0),
        'min', COALESCE(MIN(price), 0),
        'max', COALESCE(MAX(price), 0),
        'latest', COALESCE((SELECT price FROM price_history WHERE medicine_supplier_id = ms_id ORDER BY quote_date DESC LIMIT 1), 0),
        'variation', CASE 
            WHEN COUNT(price) >= 2 THEN
                COALESCE(
                    (
                        (SELECT price FROM price_history WHERE medicine_supplier_id = ms_id ORDER BY quote_date DESC LIMIT 1) - 
                        (SELECT price FROM price_history WHERE medicine_supplier_id = ms_id ORDER BY quote_date ASC LIMIT 1)
                    ) / NULLIF((SELECT price FROM price_history WHERE medicine_supplier_id = ms_id ORDER BY quote_date ASC LIMIT 1), 0) * 100,
                    0
                )
            ELSE 0
        END
    ) INTO result
    FROM price_history
    WHERE medicine_supplier_id = ms_id;

    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Conceder permissões para a função
GRANT EXECUTE ON FUNCTION get_price_statistics(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_price_statistics(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION get_price_statistics(TEXT) TO service_role;
