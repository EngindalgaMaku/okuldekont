-- İşletmeler tablosu için RLS politikaları
ALTER TABLE isletmeler ENABLE ROW LEVEL SECURITY;

CREATE POLICY "İşletmeler herkes tarafından görüntülenebilir"
ON isletmeler FOR SELECT
USING (true);

-- Öğrenciler tablosu için RLS politikaları
ALTER TABLE ogrenciler ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Öğrenciler herkes tarafından görüntülenebilir"
ON ogrenciler FOR SELECT
USING (true);

-- Stajlar tablosu için RLS politikaları
ALTER TABLE stajlar ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Stajlar herkes tarafından görüntülenebilir"
ON stajlar FOR SELECT
USING (true);

-- Dekontlar tablosu için RLS politikaları
ALTER TABLE dekontlar ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Dekontlar herkes tarafından görüntülenebilir"
ON dekontlar FOR SELECT
USING (true);

-- İşletme dekont ekleme politikası
CREATE POLICY "İşletmeler kendi dekontlarını ekleyebilir"
ON dekontlar FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM stajlar s
    WHERE s.id = staj_id
    AND s.isletme_id = isletme_id
  )
);

-- Öğretmen dekont ekleme politikası
CREATE POLICY "Öğretmenler kendi öğrencilerinin dekontlarını ekleyebilir"
ON dekontlar FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM stajlar s
    WHERE s.id = staj_id
    AND s.ogretmen_id = ogretmen_id
  )
);

-- Alanlar tablosu için RLS politikaları
ALTER TABLE alanlar ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Alanlar herkes tarafından görüntülenebilir"
ON alanlar FOR SELECT
USING (true);

-- Eğitim yılları tablosu için RLS politikaları
ALTER TABLE egitim_yillari ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Eğitim yılları herkes tarafından görüntülenebilir"
ON egitim_yillari FOR SELECT
USING (true);

-- Öğretmenler tablosu için RLS politikaları
ALTER TABLE ogretmenler ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Öğretmenler herkes tarafından görüntülenebilir"
ON ogretmenler FOR SELECT
USING (true); 