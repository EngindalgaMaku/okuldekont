-- İşletmeler tablosunu UUID'ye geçir
ALTER TABLE isletmeler ADD COLUMN uuid_id UUID DEFAULT gen_random_uuid();

-- Referans veren tabloları güncelle
-- Stajlar tablosu için geçici sütun
ALTER TABLE stajlar ADD COLUMN temp_isletme_uuid UUID;
UPDATE stajlar s 
SET temp_isletme_uuid = i.uuid_id 
FROM isletmeler i 
WHERE s.isletme_id = i.id;

-- Dekontlar tablosu için geçici sütun
ALTER TABLE dekontlar ADD COLUMN temp_isletme_uuid UUID;
UPDATE dekontlar d 
SET temp_isletme_uuid = i.uuid_id 
FROM isletmeler i 
WHERE d.isletme_id = i.id;

-- Öğrenciler tablosu için geçici sütun
ALTER TABLE ogrenciler ADD COLUMN temp_isletme_uuid UUID;
UPDATE ogrenciler o 
SET temp_isletme_uuid = i.uuid_id 
FROM isletmeler i 
WHERE o.isletme_id = i.id;

-- Eski foreign key kısıtlamalarını kaldır
ALTER TABLE stajlar DROP CONSTRAINT IF EXISTS stajlar_isletme_id_fkey;
ALTER TABLE dekontlar DROP CONSTRAINT IF EXISTS dekontlar_isletme_id_fkey;
ALTER TABLE ogrenciler DROP CONSTRAINT IF EXISTS ogrenciler_isletme_id_fkey;

-- Eski ID sütunlarını kaldır
ALTER TABLE stajlar DROP COLUMN isletme_id;
ALTER TABLE dekontlar DROP COLUMN isletme_id;
ALTER TABLE ogrenciler DROP COLUMN isletme_id;

-- Geçici sütunları yeniden adlandır
ALTER TABLE stajlar RENAME COLUMN temp_isletme_uuid TO isletme_id;
ALTER TABLE dekontlar RENAME COLUMN temp_isletme_uuid TO isletme_id;
ALTER TABLE ogrenciler RENAME COLUMN temp_isletme_uuid TO isletme_id;

-- İşletmeler tablosunu güncelle
ALTER TABLE isletmeler DROP CONSTRAINT isletmeler_pkey CASCADE;
ALTER TABLE isletmeler DROP COLUMN id;
ALTER TABLE isletmeler RENAME COLUMN uuid_id TO id;
ALTER TABLE isletmeler ADD PRIMARY KEY (id);

-- Yeni foreign key kısıtlamalarını ekle
ALTER TABLE stajlar ADD CONSTRAINT stajlar_isletme_id_fkey FOREIGN KEY (isletme_id) REFERENCES isletmeler(id);
ALTER TABLE dekontlar ADD CONSTRAINT dekontlar_isletme_id_fkey FOREIGN KEY (isletme_id) REFERENCES isletmeler(id);
ALTER TABLE ogrenciler ADD CONSTRAINT ogrenciler_isletme_id_fkey FOREIGN KEY (isletme_id) REFERENCES isletmeler(id); 