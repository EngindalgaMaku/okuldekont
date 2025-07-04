-- Eski fonksiyonları temizle
DROP FUNCTION IF EXISTS check_isletme_pin_giris(bigint, text, text, text);
DROP FUNCTION IF EXISTS check_isletme_pin_giris(uuid, text, text, text);
DROP FUNCTION IF EXISTS check_ogretmen_pin_giris(bigint, text, text, text);
DROP FUNCTION IF EXISTS check_ogretmen_pin_giris(uuid, text, text, text);

-- Eski politikaları temizle
DROP POLICY IF EXISTS admin_isletme_giris_denemeleri ON isletme_giris_denemeleri;
DROP POLICY IF EXISTS admin_ogretmen_giris_denemeleri ON ogretmen_giris_denemeleri;
DROP POLICY IF EXISTS isletme_kendi_giris_denemeleri ON isletme_giris_denemeleri;
DROP POLICY IF EXISTS ogretmen_kendi_giris_denemeleri ON ogretmen_giris_denemeleri;
DROP POLICY IF EXISTS fonksiyon_isletme_giris_denemeleri ON isletme_giris_denemeleri;
DROP POLICY IF EXISTS fonksiyon_ogretmen_giris_denemeleri ON ogretmen_giris_denemeleri;

-- Tabloları temizle
DROP TABLE IF EXISTS isletme_giris_denemeleri CASCADE;
DROP TABLE IF EXISTS ogretmen_giris_denemeleri CASCADE;
DROP TABLE IF EXISTS admin_kullanicilar CASCADE;

-- 1. Admin kullanıcılar tablosunu oluştur
CREATE TABLE admin_kullanicilar (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    ad TEXT NOT NULL,
    soyad TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    aktif BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Admin kullanıcılar için RLS
ALTER TABLE admin_kullanicilar ENABLE ROW LEVEL SECURITY;

CREATE POLICY admin_kullanicilar_policy ON admin_kullanicilar
    FOR ALL
    TO authenticated
    USING (auth.uid() IN (SELECT id FROM admin_kullanicilar))
    WITH CHECK (auth.uid() IN (SELECT id FROM admin_kullanicilar));

-- 2. Giriş denemeleri tablolarını oluştur
CREATE TABLE isletme_giris_denemeleri (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    isletme_id UUID REFERENCES isletmeler(id) ON DELETE CASCADE,
    giris_tarihi TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ip_adresi TEXT,
    user_agent TEXT,
    basarili BOOLEAN DEFAULT false,
    kilitlenme_tarihi TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE ogretmen_giris_denemeleri (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ogretmen_id UUID REFERENCES ogretmenler(id) ON DELETE CASCADE,
    giris_tarihi TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ip_adresi TEXT,
    user_agent TEXT,
    basarili BOOLEAN DEFAULT false,
    kilitlenme_tarihi TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Giriş denemeleri için RLS
ALTER TABLE isletme_giris_denemeleri ENABLE ROW LEVEL SECURITY;
ALTER TABLE ogretmen_giris_denemeleri ENABLE ROW LEVEL SECURITY;

-- Admin politikaları
CREATE POLICY admin_isletme_giris_denemeleri ON isletme_giris_denemeleri
    FOR ALL
    TO authenticated
    USING (EXISTS (SELECT 1 FROM admin_kullanicilar WHERE id = auth.uid() AND aktif = true))
    WITH CHECK (EXISTS (SELECT 1 FROM admin_kullanicilar WHERE id = auth.uid() AND aktif = true));

CREATE POLICY admin_ogretmen_giris_denemeleri ON ogretmen_giris_denemeleri
    FOR ALL
    TO authenticated
    USING (EXISTS (SELECT 1 FROM admin_kullanicilar WHERE id = auth.uid() AND aktif = true))
    WITH CHECK (EXISTS (SELECT 1 FROM admin_kullanicilar WHERE id = auth.uid() AND aktif = true));

-- Kendi kayıtlarını görüntüleme politikaları
CREATE POLICY isletme_kendi_giris_denemeleri ON isletme_giris_denemeleri
    FOR SELECT
    TO authenticated
    USING (auth.uid()::text = isletme_id::text);

CREATE POLICY ogretmen_kendi_giris_denemeleri ON ogretmen_giris_denemeleri
    FOR SELECT
    TO authenticated
    USING (auth.uid()::text = ogretmen_id::text);

-- Fonksiyon insert politikaları
CREATE POLICY fonksiyon_isletme_giris_denemeleri ON isletme_giris_denemeleri
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY fonksiyon_ogretmen_giris_denemeleri ON ogretmen_giris_denemeleri
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- 3. PIN kontrol fonksiyonlarını oluştur
CREATE FUNCTION check_isletme_pin_giris(
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

CREATE FUNCTION check_ogretmen_pin_giris(
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