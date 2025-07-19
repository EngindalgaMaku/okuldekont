CREATE OR REPLACE FUNCTION get_alan_stats()
RETURNS TABLE (
  id uuid,
  ad text,
  aciklama text,
  aktif boolean,
  ogretmen_sayisi bigint,
  ogrenci_sayisi bigint,
  isletme_sayisi bigint
)
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    a.id,
    a.ad,
    a.aciklama,
    a.aktif,
    (SELECT COUNT(*) FROM public.ogretmenler t WHERE t.alan_id = a.id) AS ogretmen_sayisi,
    (SELECT COUNT(*) FROM public.ogrenciler s WHERE s.alan_id = a.id) AS ogrenci_sayisi,
    (
      SELECT COUNT(isletme_id) FROM (
        SELECT ia.isletme_id FROM public.isletme_alanlar ia WHERE ia.alan_id = a.id
        UNION
        SELECT s.isletme_id FROM public.stajlar s JOIN public.ogrenciler o ON s.ogrenci_id = o.id WHERE o.alan_id = a.id AND s.isletme_id IS NOT NULL
      ) as distinct_isletmeler
    ) AS isletme_sayisi
  FROM
    public.alanlar a
  ORDER BY
    a.ad;
END;
$$ LANGUAGE plpgsql;

-- Grant execution rights to the authenticated role
GRANT EXECUTE ON FUNCTION public.get_alan_stats() TO authenticated;