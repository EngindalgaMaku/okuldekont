-- MCP için tablo güncellemeleri

-- Öğrenciler tablosuna yeni alanlar ekleme
ALTER TABLE ogrenciler
ADD COLUMN IF NOT EXISTS tc_no text,
ADD COLUMN IF NOT EXISTS telefon text,
ADD COLUMN IF NOT EXISTS email text,
ADD COLUMN IF NOT EXISTS veli_adi text,
ADD COLUMN IF NOT EXISTS veli_telefon text;

-- İşletmeler tablosuna yeni alanlar ekleme
ALTER TABLE isletmeler
ADD COLUMN IF NOT EXISTS telefon text,
ADD COLUMN IF NOT EXISTS email text,
ADD COLUMN IF NOT EXISTS adres text,
ADD COLUMN IF NOT EXISTS vergi_no text;

-- Öğretmenler tablosuna yeni alanlar ekleme
ALTER TABLE ogretmenler
ADD COLUMN IF NOT EXISTS telefon text,
ADD COLUMN IF NOT EXISTS email text,
ADD COLUMN IF NOT EXISTS alan_id bigint REFERENCES alanlar(id);

-- Alanlar tablosuna açıklama alanı ekleme
ALTER TABLE alanlar
ADD COLUMN IF NOT EXISTS aciklama text;

-- Dekontlar tablosu için yeni RLS politikaları
DROP POLICY IF EXISTS "İşletmeler kendi dekontlarını ekleyebilir" ON dekontlar;
DROP POLICY IF EXISTS "Öğretmenler kendi öğrencilerinin dekontlarını ekleyebilir" ON dekontlar;

CREATE POLICY "İşletmeler kendi dekontlarını yönetebilir"
ON dekontlar
USING (
  EXISTS (
    SELECT 1 FROM stajlar s
    WHERE s.id = staj_id
    AND s.isletme_id = isletme_id
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM stajlar s
    WHERE s.id = staj_id
    AND s.isletme_id = isletme_id
  )
);

CREATE POLICY "Öğretmenler kendi öğrencilerinin dekontlarını yönetebilir"
ON dekontlar
USING (
  EXISTS (
    SELECT 1 FROM stajlar s
    WHERE s.id = staj_id
    AND s.ogretmen_id = ogretmen_id
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM stajlar s
    WHERE s.id = staj_id
    AND s.ogretmen_id = ogretmen_id
  )
);

-- Staj durumları için ENUM tipi oluşturma
DO $$ BEGIN
    CREATE TYPE staj_durum AS ENUM ('aktif', 'tamamlandi', 'iptal');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Dekont onay durumları için ENUM tipi oluşturma
DO $$ BEGIN
    CREATE TYPE dekont_onay_durum AS ENUM ('bekliyor', 'onaylandi', 'reddedildi');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Stajlar tablosundaki durum alanını ENUM'a çevirme
ALTER TABLE stajlar 
ALTER COLUMN durum TYPE staj_durum USING durum::staj_durum;

-- Dekontlar tablosundaki onay_durumu alanını ENUM'a çevirme
ALTER TABLE dekontlar 
ALTER COLUMN onay_durumu TYPE dekont_onay_durum USING onay_durumu::dekont_onay_durum; 