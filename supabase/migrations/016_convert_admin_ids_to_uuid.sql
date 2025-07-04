-- Yöneticiler tablosunu UUID'ye geçirme
-- Önce yeni UUID sütunu ekle
ALTER TABLE yoneticiler ADD COLUMN uuid_id UUID DEFAULT gen_random_uuid();

-- Referans veren tabloları güncelle
-- Dekontlar tablosu için geçici sütun
ALTER TABLE dekontlar ADD COLUMN temp_yonetici_uuid UUID;
UPDATE dekontlar d 
SET temp_yonetici_uuid = y.uuid_id 
FROM yoneticiler y 
WHERE d.yonetici_id = y.id;

-- Eski foreign key kısıtlamalarını kaldır
ALTER TABLE dekontlar DROP CONSTRAINT IF EXISTS fk_dekontlar_yonetici;

-- Eski ID sütunlarını kaldır
ALTER TABLE dekontlar DROP COLUMN yonetici_id;

-- Geçici sütunları yeniden adlandır
ALTER TABLE dekontlar RENAME COLUMN temp_yonetici_uuid TO yonetici_id;

-- Yöneticiler tablosunu güncelle
ALTER TABLE yoneticiler DROP CONSTRAINT yoneticiler_pkey CASCADE;
ALTER TABLE yoneticiler DROP COLUMN id;
ALTER TABLE yoneticiler RENAME COLUMN uuid_id TO id;
ALTER TABLE yoneticiler ADD PRIMARY KEY (id);

-- Yeni foreign key kısıtlamalarını ekle
ALTER TABLE dekontlar ADD CONSTRAINT fk_dekontlar_yonetici FOREIGN KEY (yonetici_id) REFERENCES yoneticiler(id);

-- RLS politikalarını güncelle
DROP POLICY IF EXISTS "Yöneticiler dekontları onaylayabilir" ON dekontlar;
CREATE POLICY "Yöneticiler dekontları onaylayabilir"
ON dekontlar FOR UPDATE
USING (
    EXISTS (
        SELECT 1 
        FROM yoneticiler y 
        WHERE y.id = auth.uid()::uuid
    )
); 