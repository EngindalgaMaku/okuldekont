-- Function to create a new "alan"
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

-- Function to update an existing "alan"
CREATE OR REPLACE FUNCTION update_alan(p_id uuid, p_ad text, p_aciklama text, p_aktif boolean)
RETURNS void
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.alanlar
  SET
    ad = p_ad,
    aciklama = p_aciklama,
    aktif = p_aktif
  WHERE id = p_id;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION public.update_alan(uuid, text, text, boolean) TO authenticated;

-- Function to delete an "alan"
CREATE OR REPLACE FUNCTION delete_alan(p_id uuid)
RETURNS void
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM public.alanlar WHERE id = p_id;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION public.delete_alan(uuid) TO authenticated;

-- Function to toggle the active status of an "alan"
CREATE OR REPLACE FUNCTION toggle_alan_aktif(p_id uuid)
RETURNS void
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.alanlar
  SET aktif = NOT aktif
  WHERE id = p_id;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION public.toggle_alan_aktif(uuid) TO authenticated;