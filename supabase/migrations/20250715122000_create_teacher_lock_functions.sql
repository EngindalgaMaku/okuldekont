-- Drop existing functions safely before creating new ones
DROP FUNCTION IF EXISTS public.check_ogretmen_kilit_durumu(UUID);
DROP FUNCTION IF EXISTS public.unlock_ogretmen_hesabi(UUID);

-- Function to check teacher's lock status
CREATE OR REPLACE FUNCTION check_ogretmen_kilit_durumu(p_ogretmen_id UUID)
RETURNS JSON AS $$
DECLARE
  v_ogretmen RECORD;
  v_kilitlenme_tarihi TIMESTAMP;
  v_yanlis_giris_sayisi INTEGER;
  v_kilitlenme_suresi INTERVAL := INTERVAL '30 minutes';
  v_kilitli BOOLEAN := false;
  v_son_yanlis_giris TIMESTAMP;
BEGIN
  SELECT * INTO v_ogretmen
  FROM public.ogretmenler
  WHERE id = p_ogretmen_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object(
      'basarili', false,
      'mesaj', 'Öğretmen bulunamadı.',
      'kilitli', false
    );
  END IF;
  
  -- Check for failed login attempts in the last 30 minutes
  SELECT
    COUNT(*) as yanlis_giris,
    MAX(kilitlenme_tarihi) as kilit_tarihi,
    MAX(giris_tarihi) as son_deneme
  INTO v_yanlis_giris_sayisi, v_kilitlenme_tarihi, v_son_yanlis_giris
  FROM public.ogretmen_giris_denemeleri
  WHERE ogretmen_id = p_ogretmen_id
    AND giris_tarihi > NOW() - v_kilitlenme_suresi
    AND basarili = false;
  
  -- Determine if the account is currently locked
  IF v_kilitlenme_tarihi IS NOT NULL AND v_kilitlenme_tarihi + v_kilitlenme_suresi > NOW() THEN
    v_kilitli := true;
  END IF;
  
  RETURN json_build_object(
    'basarili', true,
    'kilitli', v_kilitli,
    'kilitlenme_tarihi', v_kilitlenme_tarihi,
    'yanlis_giris_sayisi', COALESCE(v_yanlis_giris_sayisi, 0),
    'son_yanlis_giris', v_son_yanlis_giris,
    'mesaj', CASE
      WHEN v_kilitli THEN 'Hesap kilitli'
      ELSE 'Hesap aktif'
    END
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'basarili', false,
      'mesaj', 'Kilit durumu kontrol edilirken hata oluştu: ' || SQLERRM,
      'kilitli', false
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.check_ogretmen_kilit_durumu(UUID) TO authenticated;

-- Function to unlock a teacher's account
CREATE OR REPLACE FUNCTION unlock_ogretmen_hesabi(p_ogretmen_id UUID)
RETURNS JSON AS $$
DECLARE
  v_ogretmen RECORD;
  v_silinen_kayit_sayisi INTEGER := 0;
BEGIN
  SELECT * INTO v_ogretmen
  FROM public.ogretmenler
  WHERE id = p_ogretmen_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object(
      'basarili', false,
      'mesaj', 'Öğretmen bulunamadı.',
      'silinen_kayit_sayisi', 0
    );
  END IF;
  
  -- Delete failed login attempts and lock records
  DELETE FROM public.ogretmen_giris_denemeleri
  WHERE ogretmen_id = p_ogretmen_id
    AND (basarili = false OR kilitlenme_tarihi IS NOT NULL);
  
  GET DIAGNOSTICS v_silinen_kayit_sayisi = ROW_COUNT;
  
  RETURN json_build_object(
    'basarili', true,
    'mesaj', 'Öğretmen hesabı başarıyla kilidi açıldı.',
    'silinen_kayit_sayisi', v_silinen_kayit_sayisi
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'basarili', false,
      'mesaj', 'Kilit açılırken bir hata oluştu: ' || SQLERRM,
      'silinen_kayit_sayisi', 0
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.unlock_ogretmen_hesabi(UUID) TO authenticated;