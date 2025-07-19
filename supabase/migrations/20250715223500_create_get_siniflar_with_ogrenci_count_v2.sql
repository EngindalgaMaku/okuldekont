CREATE OR REPLACE FUNCTION get_siniflar_with_ogrenci_count_v2(p_alan_id UUID)
RETURNS TABLE(id UUID, ad TEXT, ogrenci_sayisi BIGINT) AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.id,
    s.ad,
    COUNT(o.id) AS ogrenci_sayisi
  FROM
    siniflar s
  LEFT JOIN
    ogrenciler o ON s.id = o.sinif_id
  WHERE
    s.alan_id = p_alan_id
  GROUP BY
    s.id, s.ad
  ORDER BY
    s.ad;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.get_siniflar_with_ogrenci_count_v2(UUID) TO authenticated;