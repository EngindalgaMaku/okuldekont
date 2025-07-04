-- Önce eski politikaları temizle
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