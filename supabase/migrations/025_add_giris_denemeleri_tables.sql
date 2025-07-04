-- İşletme giriş denemeleri tablosu
CREATE TABLE IF NOT EXISTS isletme_giris_denemeleri (
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

-- Öğretmen giriş denemeleri tablosu
CREATE TABLE IF NOT EXISTS ogretmen_giris_denemeleri (
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

-- RLS politikaları
ALTER TABLE isletme_giris_denemeleri ENABLE ROW LEVEL SECURITY;
ALTER TABLE ogretmen_giris_denemeleri ENABLE ROW LEVEL SECURITY;

-- Admin politikaları
CREATE POLICY admin_isletme_giris_denemeleri ON isletme_giris_denemeleri
    FOR ALL
    TO authenticated
    USING (auth.uid() IN (SELECT id FROM admin_kullanicilar))
    WITH CHECK (auth.uid() IN (SELECT id FROM admin_kullanicilar));

CREATE POLICY admin_ogretmen_giris_denemeleri ON ogretmen_giris_denemeleri
    FOR ALL
    TO authenticated
    USING (auth.uid() IN (SELECT id FROM admin_kullanicilar))
    WITH CHECK (auth.uid() IN (SELECT id FROM admin_kullanicilar));

-- İşletme ve öğretmenlerin kendi giriş denemelerini görebilmesi için politikalar
CREATE POLICY isletme_kendi_giris_denemeleri ON isletme_giris_denemeleri
    FOR SELECT
    TO authenticated
    USING (auth.uid()::text = isletme_id::text);

CREATE POLICY ogretmen_kendi_giris_denemeleri ON ogretmen_giris_denemeleri
    FOR SELECT
    TO authenticated
    USING (auth.uid()::text = ogretmen_id::text);

-- Fonksiyonların giriş denemesi ekleyebilmesi için politika
CREATE POLICY fonksiyon_isletme_giris_denemeleri ON isletme_giris_denemeleri
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY fonksiyon_ogretmen_giris_denemeleri ON ogretmen_giris_denemeleri
    FOR INSERT
    TO authenticated
    WITH CHECK (true); 