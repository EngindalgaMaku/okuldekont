-- Giriş denemeleri tablolarını oluştur
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