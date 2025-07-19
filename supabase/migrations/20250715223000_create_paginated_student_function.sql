CREATE OR REPLACE FUNCTION get_ogrenciler_for_alan_paginated(
    p_alan_id uuid,
    p_page_size integer,
    p_offset integer,
    p_sinif_filter text DEFAULT NULL,
    p_staj_filter text DEFAULT NULL -- 'var' or 'yok'
)
RETURNS TABLE(
    id uuid,
    ad text,
    soyad text,
    no text,
    sinif text,
    isletme_adi text,
    koordinator_ogretmen text,
    staj_durumu text,
    baslama_tarihi date,
    bitis_tarihi date,
    total_count bigint
) AS $$
BEGIN
    RETURN QUERY
    WITH filtered_ogrenciler AS (
        SELECT o.id
        FROM ogrenciler o
        LEFT JOIN stajlar s ON o.id = s.ogrenci_id AND s.durum = 'aktif'
        WHERE o.alan_id = p_alan_id
          AND (p_sinif_filter IS NULL OR o.sinif = p_sinif_filter)
          AND (
                (p_staj_filter IS NULL) OR
                (p_staj_filter = 'var' AND s.id IS NOT NULL) OR
                (p_staj_filter = 'yok' AND s.id IS NULL)
              )
    )
    SELECT
        o.id,
        o.ad,
        o.soyad,
        o.no,
        o.sinif,
        i.ad AS isletme_adi,
        t.ad || ' ' || t.soyad AS koordinator_ogretmen,
        CASE WHEN s.id IS NOT NULL THEN 'aktif' ELSE 'isletmesi_yok' END AS staj_durumu,
        s.baslangic_tarihi,
        s.bitis_tarihi,
        (SELECT count(*) FROM filtered_ogrenciler) AS total_count
    FROM ogrenciler o
    LEFT JOIN stajlar s ON o.id = s.ogrenci_id AND s.durum = 'aktif'
    LEFT JOIN isletmeler i ON s.isletme_id = i.id
    LEFT JOIN ogretmenler t ON s.ogretmen_id = t.id
    WHERE o.id IN (SELECT * FROM filtered_ogrenciler)
    ORDER BY o.ad, o.soyad
    LIMIT p_page_size
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;