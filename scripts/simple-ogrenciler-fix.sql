-- Simple ogrenciler UUID conversion
-- Add UUID column to ogrenciler
ALTER TABLE ogrenciler ADD COLUMN IF NOT EXISTS uuid_id UUID DEFAULT gen_random_uuid();

-- Update foreign key references in stajlar table
ALTER TABLE stajlar ADD COLUMN IF NOT EXISTS temp_ogrenci_uuid UUID;
UPDATE stajlar s 
SET temp_ogrenci_uuid = o.uuid_id 
FROM ogrenciler o 
WHERE s.ogrenci_id = o.id;

-- Update foreign key references in dekontlar table  
ALTER TABLE dekontlar ADD COLUMN IF NOT EXISTS temp_ogrenci_uuid UUID;
UPDATE dekontlar d 
SET temp_ogrenci_uuid = o.uuid_id 
FROM ogrenciler o 
WHERE d.ogrenci_id = o.id;

-- Drop foreign key constraints
ALTER TABLE stajlar DROP CONSTRAINT IF EXISTS stajlar_ogrenci_id_fkey;
ALTER TABLE dekontlar DROP CONSTRAINT IF EXISTS dekontlar_ogrenci_id_fkey;

-- Drop old bigint columns and rename UUID columns
ALTER TABLE stajlar DROP COLUMN IF EXISTS ogrenci_id;
ALTER TABLE dekontlar DROP COLUMN IF EXISTS ogrenci_id;
ALTER TABLE stajlar RENAME COLUMN temp_ogrenci_uuid TO ogrenci_id;
ALTER TABLE dekontlar RENAME COLUMN temp_ogrenci_uuid TO ogrenci_id;

-- Convert ogrenciler primary key
ALTER TABLE ogrenciler DROP CONSTRAINT IF EXISTS ogrenciler_pkey CASCADE;
ALTER TABLE ogrenciler DROP COLUMN IF EXISTS id;
ALTER TABLE ogrenciler RENAME COLUMN uuid_id TO id;
ALTER TABLE ogrenciler ADD PRIMARY KEY (id);

-- Recreate foreign key constraints
ALTER TABLE stajlar ADD CONSTRAINT stajlar_ogrenci_id_fkey FOREIGN KEY (ogrenci_id) REFERENCES ogrenciler(id);
ALTER TABLE dekontlar ADD CONSTRAINT dekontlar_ogrenci_id_fkey FOREIGN KEY (ogrenci_id) REFERENCES ogrenciler(id);