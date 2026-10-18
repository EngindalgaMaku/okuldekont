-- Fix ogrenciler table to use UUID primary key
-- This migration converts the ogrenciler table's ID from bigint to UUID

-- Step 1: Add UUID column to ogrenciler
ALTER TABLE ogrenciler ADD COLUMN IF NOT EXISTS uuid_id UUID DEFAULT gen_random_uuid();

-- Step 2: Update foreign key references in stajlar table
ALTER TABLE stajlar ADD COLUMN IF NOT EXISTS temp_ogrenci_uuid UUID;
UPDATE stajlar s 
SET temp_ogrenci_uuid = o.uuid_id 
FROM ogrenciler o 
WHERE s.ogrenci_id = o.id;

-- Step 3: Update foreign key references in dekontlar table  
ALTER TABLE dekontlar ADD COLUMN IF NOT EXISTS temp_ogrenci_uuid UUID;
UPDATE dekontlar d 
SET temp_ogrenci_uuid = o.uuid_id 
FROM ogrenciler o 
WHERE d.ogrenci_id = o.id;

-- Step 4: Drop foreign key constraints
ALTER TABLE stajlar DROP CONSTRAINT IF EXISTS stajlar_ogrenci_id_fkey;
ALTER TABLE dekontlar DROP CONSTRAINT IF EXISTS dekontlar_ogrenci_id_fkey;

-- Step 5: Drop old bigint columns and rename UUID columns
ALTER TABLE stajlar DROP COLUMN IF EXISTS ogrenci_id;
ALTER TABLE dekontlar DROP COLUMN IF EXISTS ogrenci_id;
ALTER TABLE stajlar RENAME COLUMN temp_ogrenci_uuid TO ogrenci_id;
ALTER TABLE dekontlar RENAME COLUMN temp_ogrenci_uuid TO ogrenci_id;

-- Step 6: Convert ogrenciler primary key
ALTER TABLE ogrenciler DROP CONSTRAINT IF EXISTS ogrenciler_pkey CASCADE;
ALTER TABLE ogrenciler DROP COLUMN IF EXISTS id;
ALTER TABLE ogrenciler RENAME COLUMN uuid_id TO id;
ALTER TABLE ogrenciler ADD PRIMARY KEY (id);

-- Step 7: Recreate foreign key constraints
ALTER TABLE stajlar ADD CONSTRAINT stajlar_ogrenci_id_fkey FOREIGN KEY (ogrenci_id) REFERENCES ogrenciler(id);
ALTER TABLE dekontlar ADD CONSTRAINT dekontlar_ogrenci_id_fkey FOREIGN KEY (ogrenci_id) REFERENCES ogrenciler(id);

-- Step 8: Update any remaining bigint columns to UUID in other tables if needed
-- Check siniflar table
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'siniflar' 
        AND column_name = 'id' 
        AND data_type = 'bigint'
    ) THEN
        ALTER TABLE siniflar ADD COLUMN IF NOT EXISTS uuid_id UUID DEFAULT gen_random_uuid();
        ALTER TABLE siniflar DROP CONSTRAINT IF EXISTS siniflar_pkey CASCADE;
        ALTER TABLE siniflar DROP COLUMN IF EXISTS id;
        ALTER TABLE siniflar RENAME COLUMN uuid_id TO id;
        ALTER TABLE siniflar ADD PRIMARY KEY (id);
    END IF;
END $$;

-- Check egitim_yillari table
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'egitim_yillari' 
        AND column_name = 'id' 
        AND data_type IN ('bigint', 'integer')
    ) THEN
        -- Update stajlar foreign key first
        ALTER TABLE stajlar ADD COLUMN IF NOT EXISTS temp_egitim_yili_uuid UUID;
        
        -- Add UUID to egitim_yillari
        ALTER TABLE egitim_yillari ADD COLUMN IF NOT EXISTS uuid_id UUID DEFAULT gen_random_uuid();
        
        -- Update foreign key reference
        UPDATE stajlar s 
        SET temp_egitim_yili_uuid = e.uuid_id 
        FROM egitim_yillari e 
        WHERE s.egitim_yili_id = e.id;
        
        -- Drop constraint and update columns
        ALTER TABLE stajlar DROP CONSTRAINT IF EXISTS stajlar_egitim_yili_id_fkey;
        ALTER TABLE stajlar DROP COLUMN IF EXISTS egitim_yili_id;
        ALTER TABLE stajlar RENAME COLUMN temp_egitim_yili_uuid TO egitim_yili_id;
        
        -- Convert egitim_yillari primary key
        ALTER TABLE egitim_yillari DROP CONSTRAINT IF EXISTS egitim_yillari_pkey CASCADE;
        ALTER TABLE egitim_yillari DROP COLUMN IF EXISTS id;
        ALTER TABLE egitim_yillari RENAME COLUMN uuid_id TO id;
        ALTER TABLE egitim_yillari ADD PRIMARY KEY (id);
        
        -- Recreate foreign key
        ALTER TABLE stajlar ADD CONSTRAINT stajlar_egitim_yili_id_fkey FOREIGN KEY (egitim_yili_id) REFERENCES egitim_yillari(id);
    END IF;
END $$;