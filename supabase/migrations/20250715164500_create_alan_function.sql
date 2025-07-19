CREATE OR REPLACE FUNCTION create_alan(
  ad TEXT,
  aciklama TEXT,
  aktif BOOLEAN
)
RETURNS uuid
SECURITY DEFINER
AS $$
DECLARE
  new_alan_id uuid;
BEGIN
  INSERT INTO public.alanlar (ad, aciklama, aktif)
  VALUES (ad, aciklama, aktif)
  RETURNING id INTO new_alan_id;
  
  RETURN new_alan_id;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION public.create_alan(TEXT, TEXT, BOOLEAN) TO authenticated;