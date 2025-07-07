-- Stajlar tablosuna eksik sütunları ekle
ALTER TABLE stajlar 
ADD COLUMN IF NOT EXISTS sozlesme_url TEXT,
ADD COLUMN IF NOT EXISTS ogretmen_id UUID,
ADD COLUMN IF NOT EXISTS fesih_nedeni TEXT,
ADD COLUMN IF NOT EXISTS fesih_belgesi_url TEXT;

-- bitis_tarihi'yi nullable yap (devam eden stajlar için)
ALTER TABLE stajlar 
ALTER COLUMN bitis_tarihi DROP NOT NULL;

-- Durum enumunu güncellemek için önce constraint'i kaldır
ALTER TABLE stajlar DROP CONSTRAINT IF EXISTS stajlar_durum_check;

-- Yeni durum constraint'i ekle (feshedildi dahil)
ALTER TABLE stajlar 
ADD CONSTRAINT stajlar_durum_check 
CHECK (durum IN ('aktif', 'tamamlandi', 'iptal', 'feshedildi'));

-- Foreign key constraint'i ekle (ogretmenler tablosu varsa)
DO $$
BEGIN
    -- Ogretmenler tablosu varsa foreign key ekle
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ogretmenler') THEN
        ALTER TABLE stajlar 
        ADD CONSTRAINT fk_stajlar_ogretmen 
        FOREIGN KEY (ogretmen_id) REFERENCES ogretmenler(id);
    END IF;
END $$;

-- Varolan aktif stajların durumunu güncelle (eğer 'iptal' ise 'feshedildi' yap)
UPDATE stajlar 
SET durum = 'feshedildi' 
WHERE durum = 'iptal';