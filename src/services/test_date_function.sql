-- Função para testar a conversão de datas
CREATE OR REPLACE FUNCTION test_date_conversion(input_date TEXT)
RETURNS JSON AS $$
DECLARE
  v_date DATE;
  v_result JSON;
BEGIN
  BEGIN
    -- Tentativa de conversão direta
    v_date := input_date::DATE;
    v_result = json_build_object(
      'success', true,
      'input', input_date,
      'converted_date', v_date,
      'input_type', pg_typeof(input_date)::TEXT,
      'output_type', pg_typeof(v_date)::TEXT
    );
  EXCEPTION WHEN OTHERS THEN
    BEGIN
      -- Tentar converter assumindo formato DD/MM/YYYY
      v_date := TO_DATE(input_date, 'DD/MM/YYYY');
      v_result = json_build_object(
        'success', true,
        'input', input_date,
        'converted_date', v_date,
        'conversion_method', 'DD/MM/YYYY',
        'input_type', pg_typeof(input_date)::TEXT,
        'output_type', pg_typeof(v_date)::TEXT
      );
    EXCEPTION WHEN OTHERS THEN
      BEGIN
        -- Tentar converter assumindo formato MM/DD/YYYY
        v_date := TO_DATE(input_date, 'MM/DD/YYYY');
        v_result = json_build_object(
          'success', true,
          'input', input_date,
          'converted_date', v_date,
          'conversion_method', 'MM/DD/YYYY',
          'input_type', pg_typeof(input_date)::TEXT,
          'output_type', pg_typeof(v_date)::TEXT
        );
      EXCEPTION WHEN OTHERS THEN
        v_result = json_build_object(
          'success', false,
          'input', input_date,
          'error', SQLERRM,
          'input_type', pg_typeof(input_date)::TEXT
        );
      END;
    END;
  END;
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
