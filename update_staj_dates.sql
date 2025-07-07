-- Staj tarihleri güncelleme - bitiş tarihi opsiyonel olsun
ALTER TABLE stajlar ALTER COLUMN bitis_tarihi DROP NOT NULL;