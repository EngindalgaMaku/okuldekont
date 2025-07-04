-- Önce eski fonksiyonları sil
DROP FUNCTION IF EXISTS check_isletme_pin_giris(uuid,text,text,text);
DROP FUNCTION IF EXISTS check_ogretmen_pin_giris(uuid,text,text,text);

-- İşletme PIN kontrolü için fonksiyon
CREATE OR REPLACE FUNCTION check_isletme_pin_giris(
  p_isletme_id UUID,
  p_girilen_pin TEXT,
  p_ip_adresi TEXT,
  p_user_agent TEXT
) RETURNS JSON AS $$
DECLARE
  v_isletme RECORD;
  v_yanlis_giris_sayisi INTEGER;
  v_kilitlenme_suresi INTERVAL := INTERVAL '30 minutes';
  v_son_giris_denemesi TIMESTAMP;
  v_kilitlenme_tarihi TIMESTAMP;
BEGIN
  -- İşletmeyi bul
  SELECT * INTO v_isletme
  FROM isletmeler
  WHERE id = p_isletme_id;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'basarili', false,
      'mesaj', 'İşletme bulunamadı.',
      'kilitli', false
    );
  END IF;

  -- Son giriş denemesini ve yanlış giriş sayısını kontrol et
  SELECT 
    COUNT(*) as yanlis_giris,
    MAX(giris_tarihi) as son_deneme,
    MAX(CASE WHEN kilitlenme_tarihi IS NOT NULL THEN kilitlenme_tarihi END) as kilit_tarihi
  INTO v_yanlis_giris_sayisi, v_son_giris_denemesi, v_kilitlenme_tarihi
  FROM isletme_giris_denemeleri
  WHERE isletme_id = p_isletme_id
    AND giris_tarihi > NOW() - v_kilitlenme_suresi
    AND basarili = false;

  -- Hesap kilitli mi kontrol et
  IF v_kilitlenme_tarihi IS NOT NULL AND v_kilitlenme_tarihi + v_kilitlenme_suresi > NOW() THEN
    RETURN json_build_object(
      'basarili', false,
      'mesaj', 'Hesabınız kilitlendi. Lütfen daha sonra tekrar deneyin.',
      'kilitli', true,
      'kilitlenme_tarihi', v_kilitlenme_tarihi
    );
  END IF;

  -- PIN doğru mu kontrol et
  IF v_isletme.pin = p_girilen_pin THEN
    -- Başarılı giriş kaydı
    INSERT INTO isletme_giris_denemeleri (
      isletme_id,
      giris_tarihi,
      ip_adresi,
      user_agent,
      basarili
    ) VALUES (
      p_isletme_id,
      NOW(),
      p_ip_adresi,
      p_user_agent,
      true
    );

    RETURN json_build_object(
      'basarili', true,
      'mesaj', 'Giriş başarılı.',
      'kilitli', false
    );
  ELSE
    -- Başarısız giriş kaydı
    INSERT INTO isletme_giris_denemeleri (
      isletme_id,
      giris_tarihi,
      ip_adresi,
      user_agent,
      basarili,
      kilitlenme_tarihi
    ) VALUES (
      p_isletme_id,
      NOW(),
      p_ip_adresi,
      p_user_agent,
      false,
      CASE 
        WHEN v_yanlis_giris_sayisi >= 4 THEN NOW()
        ELSE NULL
      END
    );

    RETURN json_build_object(
      'basarili', false,
      'mesaj', CASE 
        WHEN v_yanlis_giris_sayisi >= 4 THEN 'Çok fazla başarısız deneme. Hesabınız kilitlendi.'
        ELSE 'Yanlış PIN kodu. Kalan deneme hakkı: ' || (5 - v_yanlis_giris_sayisi)::TEXT
      END,
      'kilitli', v_yanlis_giris_sayisi >= 4,
      'kilitlenme_tarihi', CASE 
        WHEN v_yanlis_giris_sayisi >= 4 THEN NOW()
        ELSE NULL
      END
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Öğretmen PIN kontrolü için fonksiyon
CREATE OR REPLACE FUNCTION check_ogretmen_pin_giris(
  p_ogretmen_id UUID,
  p_girilen_pin TEXT,
  p_ip_adresi TEXT,
  p_user_agent TEXT
) RETURNS JSON AS $$
DECLARE
  v_ogretmen RECORD;
  v_yanlis_giris_sayisi INTEGER;
  v_kilitlenme_suresi INTERVAL := INTERVAL '30 minutes';
  v_son_giris_denemesi TIMESTAMP;
  v_kilitlenme_tarihi TIMESTAMP;
BEGIN
  -- Öğretmeni bul
  SELECT * INTO v_ogretmen
  FROM ogretmenler
  WHERE id = p_ogretmen_id;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'basarili', false,
      'mesaj', 'Öğretmen bulunamadı.',
      'kilitli', false
    );
  END IF;

  -- Son giriş denemesini ve yanlış giriş sayısını kontrol et
  SELECT 
    COUNT(*) as yanlis_giris,
    MAX(giris_tarihi) as son_deneme,
    MAX(CASE WHEN kilitlenme_tarihi IS NOT NULL THEN kilitlenme_tarihi END) as kilit_tarihi
  INTO v_yanlis_giris_sayisi, v_son_giris_denemesi, v_kilitlenme_tarihi
  FROM ogretmen_giris_denemeleri
  WHERE ogretmen_id = p_ogretmen_id
    AND giris_tarihi > NOW() - v_kilitlenme_suresi
    AND basarili = false;

  -- Hesap kilitli mi kontrol et
  IF v_kilitlenme_tarihi IS NOT NULL AND v_kilitlenme_tarihi + v_kilitlenme_suresi > NOW() THEN
    RETURN json_build_object(
      'basarili', false,
      'mesaj', 'Hesabınız kilitlendi. Lütfen daha sonra tekrar deneyin.',
      'kilitli', true,
      'kilitlenme_tarihi', v_kilitlenme_tarihi
    );
  END IF;

  -- PIN doğru mu kontrol et
  IF v_ogretmen.pin = p_girilen_pin THEN
    -- Başarılı giriş kaydı
    INSERT INTO ogretmen_giris_denemeleri (
      ogretmen_id,
      giris_tarihi,
      ip_adresi,
      user_agent,
      basarili
    ) VALUES (
      p_ogretmen_id,
      NOW(),
      p_ip_adresi,
      p_user_agent,
      true
    );

    RETURN json_build_object(
      'basarili', true,
      'mesaj', 'Giriş başarılı.',
      'kilitli', false
    );
  ELSE
    -- Başarısız giriş kaydı
    INSERT INTO ogretmen_giris_denemeleri (
      ogretmen_id,
      giris_tarihi,
      ip_adresi,
      user_agent,
      basarili,
      kilitlenme_tarihi
    ) VALUES (
      p_ogretmen_id,
      NOW(),
      p_ip_adresi,
      p_user_agent,
      false,
      CASE 
        WHEN v_yanlis_giris_sayisi >= 4 THEN NOW()
        ELSE NULL
      END
    );

    RETURN json_build_object(
      'basarili', false,
      'mesaj', CASE 
        WHEN v_yanlis_giris_sayisi >= 4 THEN 'Çok fazla başarısız deneme. Hesabınız kilitlendi.'
        ELSE 'Yanlış PIN kodu. Kalan deneme hakkı: ' || (5 - v_yanlis_giris_sayisi)::TEXT
      END,
      'kilitli', v_yanlis_giris_sayisi >= 4,
      'kilitlenme_tarihi', CASE 
        WHEN v_yanlis_giris_sayisi >= 4 THEN NOW()
        ELSE NULL
      END
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 