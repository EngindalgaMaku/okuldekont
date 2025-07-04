-- Eğitim yılları tablosunu oluştur
CREATE TABLE egitim_yillari (
    id SERIAL PRIMARY KEY,
    yil VARCHAR(20) NOT NULL UNIQUE,
    aktif BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Başlangıç verilerini ekle
INSERT INTO egitim_yillari (yil, aktif) VALUES 
('2024-2025', true);

-- RLS politikalarını ekle
ALTER TABLE egitim_yillari ENABLE ROW LEVEL SECURITY;

-- Herkes okuyabilir
CREATE POLICY "Egitim yillari okuma" ON egitim_yillari
    FOR SELECT USING (true);

-- Admin güncelleyebilir (şimdilik herkes)
CREATE POLICY "Egitim yillari guncelleme" ON egitim_yillari
    FOR ALL USING (true); 