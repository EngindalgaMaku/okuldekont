CREATE OR REPLACE FUNCTION get_isletmeler_for_alan(p_alan_id uuid)
RETURNS TABLE (
  id uuid,
  ad text,
  telefon text
)
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH alan_isletmeleri AS (
    -- Doğrudan alana bağlı işletmeler
    SELECT ia.isletme_id
    FROM public.isletme_alanlar ia
    WHERE ia.alan_id = p_alan_id

    UNION

    -- Alandaki öğrencilerin staj yaptığı işletmeler
    SELECT s.isletme_id
    FROM public.stajlar s
    JOIN public.ogrenciler o ON s.ogrenci_id = o.id
    WHERE o.alan_id = p_alan_id AND s.isletme_id IS NOT NULL
  )
  SELECT
    i.id,
    i.ad,
    i.telefon
  FROM public.isletmeler i
  WHERE i.id IN (SELECT isletme_id FROM alan_isletmeleri)
  ORDER BY i.ad;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION public.get_isletmeler_for_alan(uuid) TO authenticated;