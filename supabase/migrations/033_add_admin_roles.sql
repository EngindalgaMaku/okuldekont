-- Admin kullanıcılar tablosuna yetki seviyesi ekle
ALTER TABLE admin_kullanicilar 
ADD COLUMN IF NOT EXISTS yetki_seviyesi TEXT DEFAULT 'operator' CHECK (yetki_seviyesi IN ('super_admin', 'admin', 'operator'));

-- Mevcut admin kullanıcıları süper admin yap (varsa)
UPDATE admin_kullanicilar SET yetki_seviyesi = 'super_admin';

-- Admin yönetimi için fonksiyonlar
CREATE OR REPLACE FUNCTION get_admin_user_role(user_id UUID)
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT yetki_seviyesi FROM admin_kullanicilar WHERE id = user_id AND aktif = true;
$$;

CREATE OR REPLACE FUNCTION is_super_admin(user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS(
    SELECT 1 FROM admin_kullanicilar 
    WHERE id = user_id AND yetki_seviyesi = 'super_admin' AND aktif = true
  );
$$;

-- Admin kullanıcılar tablosu için gelişmiş RLS politikaları
DROP POLICY IF EXISTS admin_kullanicilar_policy ON admin_kullanicilar;

-- Sadece süper adminler diğer adminleri görüp yönetebilir
CREATE POLICY admin_kullanicilar_super_admin_policy ON admin_kullanicilar
    FOR ALL
    TO authenticated
    USING (is_super_admin(auth.uid()))
    WITH CHECK (is_super_admin(auth.uid()));

-- Normal adminler sadece kendi bilgilerini görebilir
CREATE POLICY admin_kullanicilar_self_policy ON admin_kullanicilar
    FOR SELECT
    TO authenticated
    USING (id = auth.uid());

-- Admin listesi görüntüleme fonksiyonu (sadece süper adminler için)
CREATE OR REPLACE FUNCTION get_admin_users()
RETURNS TABLE(
  id UUID,
  ad TEXT,
  soyad TEXT,
  email TEXT,
  yetki_seviyesi TEXT,
  aktif BOOLEAN,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    a.id,
    a.ad,
    a.soyad,
    a.email,
    a.yetki_seviyesi,
    a.aktif,
    a.created_at,
    a.updated_at
  FROM admin_kullanicilar a
  WHERE is_super_admin(auth.uid())
  ORDER BY a.created_at DESC;
$$;

-- Admin kullanıcı ekleme fonksiyonu
CREATE OR REPLACE FUNCTION add_admin_user(
  p_email TEXT,
  p_ad TEXT,
  p_soyad TEXT,
  p_yetki_seviyesi TEXT DEFAULT 'operator'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
BEGIN
  -- Sadece süper adminler yeni admin ekleyebilir
  IF NOT is_super_admin(auth.uid()) THEN
    RETURN json_build_object('success', false, 'error', 'Yetkisiz erişim');
  END IF;

  -- Email kontrolü
  IF EXISTS(SELECT 1 FROM admin_kullanicilar WHERE email = p_email) THEN
    RETURN json_build_object('success', false, 'error', 'Bu email adresi zaten kullanımda');
  END IF;

  -- Yetki seviyesi kontrolü
  IF p_yetki_seviyesi NOT IN ('super_admin', 'admin', 'operator') THEN
    RETURN json_build_object('success', false, 'error', 'Geçersiz yetki seviyesi');
  END IF;

  -- Bu fonksiyon sadece kayıt oluşturur, gerçek auth kullanıcısı manuel olarak oluşturulmalı
  INSERT INTO admin_kullanicilar (id, ad, soyad, email, yetki_seviyesi, aktif)
  VALUES (gen_random_uuid(), p_ad, p_soyad, p_email, p_yetki_seviyesi, false); -- Başlangıçta pasif

  RETURN json_build_object(
    'success', true, 
    'message', 'Admin kullanıcı oluşturuldu. Auth sistemine eklenmeli.'
  );
END;
$$;

-- Admin kullanıcı güncelleme fonksiyonu
CREATE OR REPLACE FUNCTION update_admin_user(
  p_user_id UUID,
  p_ad TEXT,
  p_soyad TEXT,
  p_yetki_seviyesi TEXT,
  p_aktif BOOLEAN
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Sadece süper adminler admin kullanıcıları güncelleyebilir
  IF NOT is_super_admin(auth.uid()) THEN
    RETURN json_build_object('success', false, 'error', 'Yetkisiz erişim');
  END IF;

  -- Kendini süper admin olmaktan çıkaramaz
  IF p_user_id = auth.uid() AND p_yetki_seviyesi != 'super_admin' THEN
    RETURN json_build_object('success', false, 'error', 'Kendi yetki seviyenizi düşüremezsiniz');
  END IF;

  -- Kendini pasif yapmaya çalışırsa engelle
  IF p_user_id = auth.uid() AND p_aktif = false THEN
    RETURN json_build_object('success', false, 'error', 'Kendinizi pasif yapamazsınız');
  END IF;

  UPDATE admin_kullanicilar 
  SET 
    ad = p_ad,
    soyad = p_soyad,
    yetki_seviyesi = p_yetki_seviyesi,
    aktif = p_aktif,
    updated_at = NOW()
  WHERE id = p_user_id;

  RETURN json_build_object('success', true, 'message', 'Admin kullanıcı güncellendi');
END;
$$;

-- Admin kullanıcı silme fonksiyonu
CREATE OR REPLACE FUNCTION delete_admin_user(p_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Sadece süper adminler admin kullanıcıları silebilir
  IF NOT is_super_admin(auth.uid()) THEN
    RETURN json_build_object('success', false, 'error', 'Yetkisiz erişim');
  END IF;

  -- Kendini silemez
  IF p_user_id = auth.uid() THEN
    RETURN json_build_object('success', false, 'error', 'Kendinizi silemezsiniz');
  END IF;

  DELETE FROM admin_kullanicilar WHERE id = p_user_id;

  RETURN json_build_object('success', true, 'message', 'Admin kullanıcı silindi');
END;
$$;