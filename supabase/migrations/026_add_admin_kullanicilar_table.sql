-- Admin kullanıcılar tablosu
CREATE TABLE IF NOT EXISTS admin_kullanicilar (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    ad TEXT NOT NULL,
    soyad TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    aktif BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS politikaları
ALTER TABLE admin_kullanicilar ENABLE ROW LEVEL SECURITY;

-- Admin kullanıcılar için politika
CREATE POLICY admin_kullanicilar_policy ON admin_kullanicilar
    FOR ALL
    TO authenticated
    USING (auth.uid() IN (SELECT id FROM admin_kullanicilar))
    WITH CHECK (auth.uid() IN (SELECT id FROM admin_kullanicilar));

-- Giriş denemeleri tabloları için RLS politikalarını güncelle
DROP POLICY IF EXISTS admin_isletme_giris_denemeleri ON isletme_giris_denemeleri;
DROP POLICY IF EXISTS admin_ogretmen_giris_denemeleri ON ogretmen_giris_denemeleri;

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