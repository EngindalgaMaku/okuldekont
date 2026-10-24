CREATE OR REPLACE FUNCTION get_gorev_belgeleri_detayli(
    p_status_filter TEXT,
    p_alan_id_filter UUID,
    p_search_term TEXT,
    p_limit INT,
    p_offset INT
)
RETURNS TABLE (
    id UUID,
    hafta TEXT,
    durum TEXT,
    created_at TIMESTAMPTZ,
    ogretmen_ad TEXT,
    ogretmen_soyad TEXT,
    total_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    WITH filtered_belgeler AS (
        SELECT
            gb.id,
            gb.hafta,
            gb.durum,
            gb.created_at,
            o.ad AS ogretmen_ad,
            o.soyad AS ogretmen_soyad
        FROM
            public.gorev_belgeleri gb
        JOIN
            public.ogretmenler o ON gb.ogretmen_id = o.id
        WHERE
            (p_status_filter = 'all' OR gb.durum = p_status_filter)
        AND
            (p_alan_id_filter IS NULL OR o.alan_id = p_alan_id_filter)
        AND
            (p_search_term = '' OR (o.ad || ' ' || o.soyad) ILIKE '%' || p_search_term || '%' OR gb.hafta ILIKE '%' || p_search_term || '%')
    )
    SELECT
        fb.id,
        fb.hafta,
        fb.durum,
        fb.created_at,
        fb.ogretmen_ad,
        fb.ogretmen_soyad,
        (SELECT COUNT(*) FROM filtered_belgeler) AS total_count
    FROM
        filtered_belgeler fb
    ORDER BY
        fb.created_at DESC
    LIMIT
        p_limit
    OFFSET
        p_offset;
END;
$$ LANGUAGE plpgsql;