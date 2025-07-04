-- Yeni kolonları ekle
ALTER TABLE dekontlar
ADD COLUMN IF NOT EXISTS odeme_son_tarihi DATE,
ADD COLUMN IF NOT EXISTS ay INTEGER,
ADD COLUMN IF NOT EXISTS yil INTEGER,
ADD COLUMN IF NOT EXISTS onaylayan_ogretmen_id INTEGER REFERENCES ogretmenler(id),
ADD COLUMN IF NOT EXISTS onay_tarihi TIMESTAMP,
ADD COLUMN IF NOT EXISTS red_nedeni TEXT;

-- Mevcut kayıtlar için varsayılan değer ataması yap
UPDATE dekontlar
SET odeme_son_tarihi = odeme_tarihi + INTERVAL '10 days',
    ay = EXTRACT(MONTH FROM odeme_tarihi)::INTEGER,
    yil = EXTRACT(YEAR FROM odeme_tarihi)::INTEGER;

-- Kolonları NOT NULL yap
ALTER TABLE dekontlar
ALTER COLUMN odeme_son_tarihi SET NOT NULL,
ALTER COLUMN ay SET NOT NULL,
ALTER COLUMN yil SET NOT NULL;

-- Yeni kayıtlar için trigger oluştur
CREATE OR REPLACE FUNCTION set_default_dekont_values()
RETURNS TRIGGER AS $$
BEGIN
    -- Eğer odeme_son_tarihi belirtilmemişse, odeme_tarihinden 10 gün sonrasını ata
    IF NEW.odeme_son_tarihi IS NULL THEN
        NEW.odeme_son_tarihi := NEW.odeme_tarihi + INTERVAL '10 days';
    END IF;

    -- Ay ve yıl belirtilmemişse, odeme_tarihinden çıkar
    IF NEW.ay IS NULL THEN
        NEW.ay := EXTRACT(MONTH FROM NEW.odeme_tarihi)::INTEGER;
    END IF;

    IF NEW.yil IS NULL THEN
        NEW.yil := EXTRACT(YEAR FROM NEW.odeme_tarihi)::INTEGER;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_set_default_dekont_values
    BEFORE INSERT OR UPDATE ON dekontlar
    FOR EACH ROW
    EXECUTE FUNCTION set_default_dekont_values(); 