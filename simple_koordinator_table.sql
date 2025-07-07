-- Basit koordinatör tablosu oluşturma
CREATE TABLE ogrenci_koordinatorleri (
    id SERIAL PRIMARY KEY,
    ogrenci_id INTEGER NOT NULL,
    ogretmen_id UUID NOT NULL,
    baslangic_tarihi DATE NOT NULL,
    durum VARCHAR(20) DEFAULT 'aktif',
    notlar TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ogrenci_id) REFERENCES ogrenciler(id),
    FOREIGN KEY (ogretmen_id) REFERENCES ogretmenler(id)
);

-- RLS'yi etkinleştir
ALTER TABLE ogrenci_koordinatorleri ENABLE ROW LEVEL SECURITY;

-- Politikaları ekle
CREATE POLICY "Admin full access on ogrenci_koordinatorleri" 
    ON ogrenci_koordinatorleri FOR ALL 
    USING (true);

CREATE POLICY "Allow anonymous read access on ogrenci_koordinatorleri" 
    ON ogrenci_koordinatorleri FOR SELECT 
    USING (true);

-- İzinleri ver
GRANT ALL ON ogrenci_koordinatorleri TO postgres;
GRANT ALL ON ogrenci_koordinatorleri TO anon;
GRANT ALL ON ogrenci_koordinatorleri TO authenticated;
GRANT ALL ON SEQUENCE ogrenci_koordinatorleri_id_seq TO postgres;
GRANT ALL ON SEQUENCE ogrenci_koordinatorleri_id_seq TO anon;
GRANT ALL ON SEQUENCE ogrenci_koordinatorleri_id_seq TO authenticated;