-- Öğretmenler tablosunu UUID'ye geçir
ALTER TABLE ogretmenler ADD COLUMN uuid_id UUID DEFAULT gen_random_uuid();

-- Referans veren tabloları güncelle
-- İşletmeler tablosu için geçici sütun
ALTER TABLE isletmeler ADD COLUMN temp_ogretmen_uuid UUID;
UPDATE isletmeler i 
SET temp_ogretmen_uuid = o.uuid_id 
FROM ogretmenler o 
WHERE i.ogretmen_id = o.id;

-- Stajlar tablosu için geçici sütun
ALTER TABLE stajlar ADD COLUMN temp_ogretmen_uuid UUID;
UPDATE stajlar s 
SET temp_ogretmen_uuid = o.uuid_id 
FROM ogretmenler o 
WHERE s.ogretmen_id = o.id;

-- Dekontlar tablosu için geçici sütun
ALTER TABLE dekontlar ADD COLUMN temp_ogretmen_uuid UUID;
UPDATE dekontlar d 
SET temp_ogretmen_uuid = o.uuid_id 
FROM ogretmenler o 
WHERE d.ogretmen_id = o.id;

-- Sınıflar tablosu için geçici sütun
ALTER TABLE siniflar ADD COLUMN temp_ogretmen_uuid UUID;
UPDATE siniflar s 
SET temp_ogretmen_uuid = o.uuid_id 
FROM ogretmenler o 
WHERE s.ogretmen_id = o.id;

-- İşletme alanlar tablosu için geçici sütun
ALTER TABLE isletme_alanlar ADD COLUMN temp_koordinator_uuid UUID;
UPDATE isletme_alanlar ia 
SET temp_koordinator_uuid = o.uuid_id 
FROM ogretmenler o 
WHERE ia.koordinator_ogretmen_id = o.id;

-- Eski foreign key kısıtlamalarını kaldır
ALTER TABLE isletmeler DROP CONSTRAINT IF EXISTS isletmeler_ogretmen_id_fkey;
ALTER TABLE stajlar DROP CONSTRAINT IF EXISTS stajlar_ogretmen_id_fkey;
ALTER TABLE dekontlar DROP CONSTRAINT IF EXISTS dekontlar_ogretmen_id_fkey;

-- Eski ID sütunlarını kaldır
ALTER TABLE isletmeler DROP COLUMN ogretmen_id;
ALTER TABLE stajlar DROP COLUMN ogretmen_id;
ALTER TABLE dekontlar DROP COLUMN ogretmen_id;

-- Geçici sütunları yeniden adlandır
ALTER TABLE isletmeler RENAME COLUMN temp_ogretmen_uuid TO ogretmen_id;
ALTER TABLE stajlar RENAME COLUMN temp_ogretmen_uuid TO ogretmen_id;
ALTER TABLE dekontlar RENAME COLUMN temp_ogretmen_uuid TO ogretmen_id;

-- Öğretmenler tablosunu güncelle
ALTER TABLE ogretmenler DROP CONSTRAINT ogretmenler_pkey CASCADE;
ALTER TABLE ogretmenler DROP COLUMN id;
ALTER TABLE ogretmenler RENAME COLUMN uuid_id TO id;
ALTER TABLE ogretmenler ADD PRIMARY KEY (id);

-- Yeni foreign key kısıtlamalarını ekle
ALTER TABLE isletmeler ADD CONSTRAINT isletmeler_ogretmen_id_fkey FOREIGN KEY (ogretmen_id) REFERENCES ogretmenler(id);
ALTER TABLE stajlar ADD CONSTRAINT stajlar_ogretmen_id_fkey FOREIGN KEY (ogretmen_id) REFERENCES ogretmenler(id);
ALTER TABLE dekontlar ADD CONSTRAINT dekontlar_ogretmen_id_fkey FOREIGN KEY (ogretmen_id) REFERENCES ogretmenler(id);

-- RLS politikalarını güncelle
DROP POLICY IF EXISTS "Öğretmenler kendi öğrencilerinin dekontlarını sadece görüntüleyebilir" ON dekontlar;
CREATE POLICY "Öğretmenler kendi öğrencilerinin dekontlarını sadece görüntüleyebilir"
ON dekontlar FOR SELECT
USING (
    EXISTS (
        SELECT 1 
        FROM stajlar s
        JOIN ogrenciler o ON o.id = s.ogrenci_id
        JOIN ogretmenler og ON og.id = auth.uid()::uuid
        WHERE s.ogrenci_id = dekontlar.ogrenci_id
        AND s.ogretmen_id = og.id
    )
); 