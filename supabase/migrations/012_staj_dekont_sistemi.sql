-- Dekontlar tablosuna yeni kolonlar ekle
ALTER TABLE dekontlar
ADD COLUMN IF NOT EXISTS ogrenci_id INTEGER REFERENCES ogrenciler(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS odeme_son_tarihi DATE NOT NULL,
ADD COLUMN IF NOT EXISTS onay_durumu VARCHAR(50) DEFAULT 'BEKLEMEDE' CHECK (onay_durumu IN ('BEKLEMEDE', 'ONAYLANDI', 'REDDEDILDI')),
ADD COLUMN IF NOT EXISTS ay INTEGER NOT NULL CHECK (ay BETWEEN 1 AND 12),
ADD COLUMN IF NOT EXISTS yil INTEGER NOT NULL,
ADD COLUMN IF NOT EXISTS onaylayan_ogretmen_id INTEGER REFERENCES ogretmenler(id),
ADD COLUMN IF NOT EXISTS onay_tarihi TIMESTAMP,
ADD COLUMN IF NOT EXISTS red_nedeni TEXT;

-- Dekontlar için indeksler
CREATE INDEX IF NOT EXISTS idx_dekontlar_ogrenci ON dekontlar(ogrenci_id);
CREATE INDEX IF NOT EXISTS idx_dekontlar_isletme ON dekontlar(isletme_id);
CREATE INDEX IF NOT EXISTS idx_dekontlar_ay_yil ON dekontlar(ay, yil);
CREATE INDEX IF NOT EXISTS idx_dekontlar_onay_durumu ON dekontlar(onay_durumu);

-- Öğretmenler için RLS politikaları
CREATE POLICY "Öğretmenler kendi öğrencilerinin dekontlarını görebilir"
ON dekontlar FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM ogrenciler o
        WHERE o.id = dekontlar.ogrenci_id
        AND o.ogretmen_id = auth.uid()
    )
);

CREATE POLICY "Öğretmenler dekontları onaylayabilir"
ON dekontlar FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM ogrenciler o
        WHERE o.id = dekontlar.ogrenci_id
        AND o.ogretmen_id = auth.uid()
    )
);

-- İşletmeler için RLS politikaları
CREATE POLICY "İşletmeler kendi dekontlarını görebilir"
ON dekontlar FOR SELECT
USING (isletme_id = auth.uid());

CREATE POLICY "İşletmeler kendi dekontlarını ekleyebilir"
ON dekontlar FOR INSERT
WITH CHECK (isletme_id = auth.uid());

-- Trigger fonksiyonu - onay durumu değiştiğinde onay_tarihi güncelleme
CREATE OR REPLACE FUNCTION update_dekont_onay_tarihi()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.onay_durumu != OLD.onay_durumu THEN
        IF NEW.onay_durumu = 'ONAYLANDI' THEN
            NEW.onay_tarihi = CURRENT_TIMESTAMP;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER dekont_onay_durumu_degistiginde
    BEFORE UPDATE ON dekontlar
    FOR EACH ROW
    EXECUTE FUNCTION update_dekont_onay_tarihi(); 