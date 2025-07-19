CREATE OR REPLACE FUNCTION get_all_alan_stats()
RETURNS TABLE(
    id UUID,
    ad TEXT,
    aciklama TEXT,
    aktif BOOLEAN,
    ogretmen_sayisi BIGINT,
    ogrenci_sayisi BIGINT,
    isletme_sayisi BIGINT
) AS $$
BEGIN
    RETURN QUERY
    WITH alan_ogrencileri AS (
        SELECT
            a.id AS alan_id,
            o.id AS ogrenci_id
        FROM
            alanlar a
        JOIN
            ogrenciler o ON a.id = o.alan_id
    ),
    alan_isletmeleri AS (
        SELECT
            ao.alan_id,
            s.isletme_id
        FROM
            alan_ogrencileri ao
        JOIN
            stajlar s ON ao.ogrenci_id = s.ogrenci_id
    )
    SELECT
        a.id,
        a.ad,
        a.aciklama,
        a.aktif,
        (SELECT COUNT(*) FROM ogretmenler o WHERE o.alan_id = a.id) AS ogretmen_sayisi,
        (SELECT COUNT(*) FROM ogrenciler o WHERE o.alan_id = a.id) AS ogrenci_sayisi,
        (SELECT COUNT(DISTINCT ai.isletme_id) FROM alan_isletmeleri ai WHERE ai.alan_id = a.id) AS isletme_sayisi
    FROM
        alanlar a
    ORDER BY
        a.ad;
END;
$$ LANGUAGE plpgsql;