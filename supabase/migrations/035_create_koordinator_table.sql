-- Migration: Koordinatör tablosu oluşturma
-- 035_create_koordinator_table.sql

-- Koordinatör tablosunu oluştur
CREATE TABLE IF NOT EXISTS ogrenci_koordinatorleri (
    id SERIAL PRIMARY KEY,
    ogrenci_id INTEGER NOT NULL,
    ogretmen_id UUID NOT NULL,
    baslangic_tarihi DATE NOT NULL,
    durum VARCHAR(20) DEFAULT 'aktif' CHECK (durum IN ('aktif', 'pasif')),
    notlar TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Foreign key constraints
    CONSTRAINT fk_ogrenci_koordinatorleri_ogrenci 
        FOREIGN KEY (ogrenci_id) REFERENCES ogrenciler(id) ON DELETE CASCADE,
    CONSTRAINT fk_ogrenci_koordinatorleri_ogretmen 
        FOREIGN KEY (ogretmen_id) REFERENCES ogretmenler(id) ON DELETE CASCADE,
    
    -- Unique constraint: bir öğrencinin aynı anda sadece bir aktif koordinatörü olabilir
    CONSTRAINT uk_ogrenci_aktif_koordinator 
        UNIQUE (ogrenci_id) WHERE durum = 'aktif'
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_ogrenci_koordinatorleri_ogrenci_id 
    ON ogrenci_koordinatorleri(ogrenci_id);
CREATE INDEX IF NOT EXISTS idx_ogrenci_koordinatorleri_ogretmen_id 
    ON ogrenci_koordinatorleri(ogretmen_id);
CREATE INDEX IF NOT EXISTS idx_ogrenci_koordinatorleri_durum 
    ON ogrenci_koordinatorleri(durum);

-- Enable RLS
ALTER TABLE ogrenci_koordinatorleri ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Admin full access on ogrenci_koordinatorleri" ON ogrenci_koordinatorleri;
DROP POLICY IF EXISTS "Allow anonymous read access on ogrenci_koordinatorleri" ON ogrenci_koordinatorleri;

-- RLS Policies
CREATE POLICY "Admin full access on ogrenci_koordinatorleri" 
    ON ogrenci_koordinatorleri FOR ALL 
    USING (true) 
    WITH CHECK (true);

CREATE POLICY "Allow anonymous read access on ogrenci_koordinatorleri" 
    ON ogrenci_koordinatorleri FOR SELECT 
    USING (true);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_ogrenci_koordinatorleri_updated_at ON ogrenci_koordinatorleri;
CREATE TRIGGER update_ogrenci_koordinatorleri_updated_at 
    BEFORE UPDATE ON ogrenci_koordinatorleri 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions
GRANT ALL ON ogrenci_koordinatorleri TO postgres;
GRANT ALL ON ogrenci_koordinatorleri TO anon;
GRANT ALL ON ogrenci_koordinatorleri TO authenticated;
GRANT ALL ON SEQUENCE ogrenci_koordinatorleri_id_seq TO postgres;
GRANT ALL ON SEQUENCE ogrenci_koordinatorleri_id_seq TO anon;
GRANT ALL ON SEQUENCE ogrenci_koordinatorleri_id_seq TO authenticated;