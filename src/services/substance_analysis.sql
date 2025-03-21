-- Função para verificar e corrigir os preços
create or replace function check_and_fix_prices()
returns void as $$
begin
    -- Primeiro, vamos verificar se há preços inválidos
    raise notice 'Verificando preços inválidos...';
    
    -- Atualizar valores nulos para 0
    update medicamentos_base
    set pf_sem_impostos = 0
    where pf_sem_impostos is null;
    
    -- Converter strings vazias para 0
    update medicamentos_base
    set pf_sem_impostos = 0
    where pf_sem_impostos = '';
    
    -- Converter valores textuais para números
    update medicamentos_base
    set pf_sem_impostos = replace(replace(pf_sem_impostos, 'R$', ''), ',', '.')::numeric
    where pf_sem_impostos ~ '[^0-9\.]';
    
    -- Garantir que a coluna seja do tipo numeric
    alter table medicamentos_base 
    alter column pf_sem_impostos type numeric using (pf_sem_impostos::numeric);
    
    -- Criar índice para melhorar performance
    drop index if exists idx_medicamentos_substancia;
    create index idx_medicamentos_substancia on medicamentos_base(substancia);
    
    -- Criar índice para preços
    drop index if exists idx_medicamentos_precos;
    create index idx_medicamentos_precos on medicamentos_base(pf_sem_impostos);
    
    raise notice 'Correção de preços concluída!';
end;
$$ language plpgsql;

-- Função para analisar uma substância
create or replace function analyze_substance(p_substance text)
returns table (
    mean numeric,
    median numeric,
    min numeric,
    max numeric,
    count bigint
) as $$
begin
    return query
    with latest_prices as (
        -- Pega o preço mais recente de cada medicamento
        select distinct on (m.id)
            m.id,
            m.substancia,
            m.produto,
            m.apresentacao,
            m.tipo_de_produto,
            ph.pf_sem_impostos,
            ph.data_atualizacao
        from medicamentos_base m
        left join precos_historico ph on ph.medicamento_id = m.id
        where m.substancia = p_substance
        order by m.id, ph.data_atualizacao desc
    ),
    price_stats as (
        select 
            pf_sem_impostos,
            count(*) over() as total_count
        from latest_prices
        where pf_sem_impostos is not null
        and pf_sem_impostos > 0
        order by pf_sem_impostos
    )
    select
        avg(pf_sem_impostos)::numeric as mean,
        percentile_cont(0.5) within group (order by pf_sem_impostos)::numeric as median,
        min(pf_sem_impostos)::numeric as min,
        max(pf_sem_impostos)::numeric as max,
        count(*)::bigint as count
    from price_stats;
end;
$$ language plpgsql;

-- Função para analisar por tipo
create or replace function analyze_substance_by_type(p_substance text)
returns table (
    tipo text,
    mean numeric,
    median numeric,
    min numeric,
    max numeric,
    count bigint
) as $$
begin
    return query
    with latest_prices as (
        -- Pega o preço mais recente de cada medicamento
        select distinct on (m.id)
            m.id,
            m.substancia,
            m.produto,
            m.apresentacao,
            m.tipo_de_produto,
            ph.pf_sem_impostos,
            ph.data_atualizacao
        from medicamentos_base m
        left join precos_historico ph on ph.medicamento_id = m.id
        where m.substancia = p_substance
        order by m.id, ph.data_atualizacao desc
    )
    select
        coalesce(tipo_de_produto, 'Não especificado') as tipo,
        avg(pf_sem_impostos)::numeric as mean,
        percentile_cont(0.5) within group (order by pf_sem_impostos)::numeric as median,
        min(pf_sem_impostos)::numeric as min,
        max(pf_sem_impostos)::numeric as max,
        count(*)::bigint
    from latest_prices
    where pf_sem_impostos is not null
    and pf_sem_impostos > 0
    group by tipo_de_produto;
end;
$$ language plpgsql;

-- Função para analisar por apresentação
create or replace function analyze_substance_by_presentation(p_substance text)
returns table (
    apresentacao text,
    mean numeric,
    median numeric,
    min numeric,
    max numeric,
    count bigint,
    min_product text,
    max_product text,
    data_atualizacao timestamp
) as $$
begin
    return query
    with latest_prices as (
        -- Pega o preço mais recente de cada medicamento
        select distinct on (m.id)
            m.id,
            m.substancia,
            m.produto,
            m.apresentacao,
            m.tipo_de_produto,
            ph.pf_sem_impostos,
            ph.data_atualizacao
        from medicamentos_base m
        left join precos_historico ph on ph.medicamento_id = m.id
        where m.substancia = p_substance
        order by m.id, ph.data_atualizacao desc
    ),
    presentation_stats as (
        select
            apresentacao,
            pf_sem_impostos,
            produto,
            data_atualizacao,
            first_value(produto) over (partition by apresentacao order by pf_sem_impostos) as min_prod,
            first_value(produto) over (partition by apresentacao order by pf_sem_impostos desc) as max_prod
        from latest_prices
        where pf_sem_impostos is not null
        and pf_sem_impostos > 0
    )
    select
        coalesce(apresentacao, 'Não especificada') as apresentacao,
        avg(pf_sem_impostos)::numeric as mean,
        percentile_cont(0.5) within group (order by pf_sem_impostos)::numeric as median,
        min(pf_sem_impostos)::numeric as min,
        max(pf_sem_impostos)::numeric as max,
        count(*)::bigint,
        min(min_prod) as min_product,
        min(max_prod) as max_product,
        max(data_atualizacao) as data_atualizacao
    from presentation_stats
    group by apresentacao;
end;
$$ language plpgsql;

-- Primeiro removemos a função existente
DROP FUNCTION IF EXISTS get_substance_vector_analysis(text);

-- Agora criamos a nova função
CREATE OR REPLACE FUNCTION get_substance_vector_analysis(p_substance text)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
    result jsonb;
BEGIN
    WITH base_data AS (
        SELECT 
            m.*,
            EXTRACT(YEAR FROM CURRENT_DATE) as ano,
            EXTRACT(MONTH FROM CURRENT_DATE) as mes
        FROM medicamentos_base m
        WHERE LOWER(substancia) ILIKE LOWER('%' || p_substance || '%')
    ),
    
    price_stats AS (
        SELECT 
            COUNT(*) as total_registros,
            AVG(pf_sem_impostos) as preco_medio,
            PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY pf_sem_impostos) as preco_mediano,
            MIN(pf_sem_impostos) as preco_minimo,
            MAX(pf_sem_impostos) as preco_maximo,
            STDDEV(pf_sem_impostos) as desvio_padrao
        FROM base_data
    ),
    
    presentation_stats AS (
        SELECT 
            apresentacao,
            COUNT(*) as quantidade,
            AVG(pf_sem_impostos) as preco_medio,
            MIN(pf_sem_impostos) as preco_minimo,
            MAX(pf_sem_impostos) as preco_maximo,
            STDDEV(pf_sem_impostos) as desvio_padrao
        FROM base_data
        GROUP BY apresentacao
    ),
    
    manufacturer_stats AS (
        SELECT 
            laboratorio,
            COUNT(*) as quantidade_produtos,
            AVG(pf_sem_impostos) as preco_medio,
            MIN(pf_sem_impostos) as preco_minimo,
            MAX(pf_sem_impostos) as preco_maximo
        FROM base_data
        GROUP BY laboratorio
    ),
    
    type_stats AS (
        SELECT 
            tipo_de_produto,
            COUNT(*) as quantidade,
            AVG(pf_sem_impostos) as preco_medio,
            MIN(pf_sem_impostos) as preco_minimo,
            MAX(pf_sem_impostos) as preco_maximo
        FROM base_data
        GROUP BY tipo_de_produto
    )
    
    SELECT jsonb_build_object(
        'substance', p_substance,
        'general_stats', (
            SELECT jsonb_build_object(
                'total_registros', total_registros,
                'preco_medio', ROUND(preco_medio::numeric, 2),
                'preco_mediano', ROUND(preco_mediano::numeric, 2),
                'preco_minimo', ROUND(preco_minimo::numeric, 2),
                'preco_maximo', ROUND(preco_maximo::numeric, 2),
                'desvio_padrao', ROUND(desvio_padrao::numeric, 2)
            )
            FROM price_stats
        ),
        'presentations', (
            SELECT jsonb_agg(
                jsonb_build_object(
                    'apresentacao', apresentacao,
                    'quantidade', quantidade,
                    'preco_medio', ROUND(preco_medio::numeric, 2),
                    'preco_minimo', ROUND(preco_minimo::numeric, 2),
                    'preco_maximo', ROUND(preco_maximo::numeric, 2),
                    'desvio_padrao', ROUND(desvio_padrao::numeric, 2)
                )
                ORDER BY quantidade DESC
            )
            FROM presentation_stats
        ),
        'manufacturers', (
            SELECT jsonb_agg(
                jsonb_build_object(
                    'laboratorio', laboratorio,
                    'quantidade_produtos', quantidade_produtos,
                    'preco_medio', ROUND(preco_medio::numeric, 2),
                    'preco_minimo', ROUND(preco_minimo::numeric, 2),
                    'preco_maximo', ROUND(preco_maximo::numeric, 2)
                )
                ORDER BY quantidade_produtos DESC
            )
            FROM manufacturer_stats
        ),
        'types', (
            SELECT jsonb_agg(
                jsonb_build_object(
                    'tipo', tipo_de_produto,
                    'quantidade', quantidade,
                    'preco_medio', ROUND(preco_medio::numeric, 2),
                    'preco_minimo', ROUND(preco_minimo::numeric, 2),
                    'preco_maximo', ROUND(preco_maximo::numeric, 2)
                )
                ORDER BY quantidade DESC
            )
            FROM type_stats
        )
    ) INTO result;
    
    RETURN result;
END;
$$;

-- Função para buscar substâncias únicas
CREATE OR REPLACE FUNCTION get_unique_substances()
RETURNS TABLE (substancia text) AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT m.substancia
    FROM medicamentos_base m
    WHERE m.substancia IS NOT NULL
      AND m.substancia != ''
      AND m.substancia != '-'
      AND m.substancia != 'NI/NC'
      AND m.substancia != 'NC/NI'
    ORDER BY m.substancia;
END;
$$ LANGUAGE plpgsql;
