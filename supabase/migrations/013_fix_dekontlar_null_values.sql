-- Önce mevcut kayıtlar için varsayılan değer ataması yap
UPDATE dekontlar
SET odeme_son_tarihi = odeme_tarihi + INTERVAL '10 days'
WHERE odeme_son_tarihi IS NULL;

-- Sonra kolonu NOT NULL yap
ALTER TABLE dekontlar
ALTER COLUMN odeme_son_tarihi SET NOT NULL;

-- Diğer kolonlar için de varsayılan değerler ata
UPDATE dekontlar
SET ay = EXTRACT(MONTH FROM odeme_tarihi)::INTEGER
WHERE ay IS NULL;

UPDATE dekontlar
SET yil = EXTRACT(YEAR FROM odeme_tarihi)::INTEGER
WHERE yil IS NULL;

-- Sonra bu kolonları da NOT NULL yap
ALTER TABLE dekontlar
ALTER COLUMN ay SET NOT NULL,
ALTER COLUMN yil SET NOT NULL;

-- Yeni kayıtlar için trigger oluştur
CREATE OR REPLACE FUNCTION set_default_odeme_son_tarihi()
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

CREATE TRIGGER tr_set_default_odeme_son_tarihi
    BEFORE INSERT OR UPDATE ON dekontlar
    FOR EACH ROW
    EXECUTE FUNCTION set_default_odeme_son_tarihi(); 