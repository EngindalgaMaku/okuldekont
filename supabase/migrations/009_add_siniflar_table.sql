-- Siniflar tablosu oluşturma
CREATE TABLE IF NOT EXISTS siniflar (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  ad text NOT NULL,
  alan_id bigint REFERENCES alanlar(id) ON DELETE CASCADE NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS politikaları
ALTER TABLE siniflar ENABLE ROW LEVEL SECURITY;

-- Herkes okuyabilir
CREATE POLICY "Siniflar okuma" ON siniflar
    FOR SELECT USING (true);

-- Admin yönetebilir (şimdilik herkes)
CREATE POLICY "Siniflar yonetim" ON siniflar
    FOR ALL USING (true);

-- Öğrenciler tablosuna 'no' alanını ekle (eğer yoksa)
ALTER TABLE ogrenciler ADD COLUMN IF NOT EXISTS no text;

-- Örnek sınıflar ekle
INSERT INTO siniflar (ad, alan_id) VALUES
  ('9-A', 1),
  ('9-B', 1),
  ('10-A', 1),
  ('10-B', 1),
  ('11-A', 1),
  ('11-B', 1),
  ('12-A', 1),
  ('12-B', 1)
ON CONFLICT DO NOTHING; 