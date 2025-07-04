-- Hüsniye Özdilek MTAL Staj Dekont Sistemi
-- İlk migration: Temel tablolar

-- Eğitim yılı tablosu
CREATE TABLE egitim_yillari (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  yil text NOT NULL UNIQUE,
  aktif boolean NOT NULL DEFAULT false
);

-- Alanlar tablosu
CREATE TABLE alanlar (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  ad text NOT NULL UNIQUE
);

-- Öğretmenler tablosu
CREATE TABLE ogretmenler (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  ad text NOT NULL,
  soyad text NOT NULL,
  pin text NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- İşletmeler tablosu
CREATE TABLE isletmeler (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  ad text NOT NULL,
  yetkili_kisi text NOT NULL,
  pin text NOT NULL,
  ogretmen_id bigint REFERENCES ogretmenler(id),
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Öğrenciler tablosu
CREATE TABLE ogrenciler (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  ad text NOT NULL,
  soyad text NOT NULL,
  sinif text NOT NULL,
  alan_id bigint REFERENCES alanlar(id) NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Stajlar tablosu
CREATE TABLE stajlar (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  ogrenci_id bigint REFERENCES ogrenciler(id) NOT NULL,
  isletme_id bigint REFERENCES isletmeler(id) NOT NULL,
  ogretmen_id bigint REFERENCES ogretmenler(id) NOT NULL,
  egitim_yili_id bigint REFERENCES egitim_yillari(id) NOT NULL,
  baslangic_tarihi date NOT NULL,
  bitis_tarihi date NOT NULL,
  durum text NOT NULL DEFAULT 'aktif',
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Dekontlar tablosu
CREATE TABLE dekontlar (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  staj_id bigint REFERENCES stajlar(id) NOT NULL,
  isletme_id bigint REFERENCES isletmeler(id) NOT NULL,
  ogretmen_id bigint REFERENCES ogretmenler(id) NOT NULL,
  miktar decimal(10,2),
  odeme_tarihi date NOT NULL,
  dekont_dosyasi text NOT NULL,
  onay_durumu text NOT NULL DEFAULT 'bekliyor',
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Row Level Security (RLS) politikaları
ALTER TABLE alanlar ENABLE ROW LEVEL SECURITY;
ALTER TABLE ogretmenler ENABLE ROW LEVEL SECURITY;
ALTER TABLE isletmeler ENABLE ROW LEVEL SECURITY;
ALTER TABLE ogrenciler ENABLE ROW LEVEL SECURITY;
ALTER TABLE stajlar ENABLE ROW LEVEL SECURITY;
ALTER TABLE dekontlar ENABLE ROW LEVEL SECURITY;

-- Genel okuma politikası (authenticated kullanıcılar için)
CREATE POLICY "Authenticated users can read all" ON alanlar FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can read all" ON ogretmenler FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can read all" ON isletmeler FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can read all" ON ogrenciler FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can read all" ON stajlar FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can read all" ON dekontlar FOR SELECT USING (auth.role() = 'authenticated');

-- Örnek veriler
INSERT INTO egitim_yillari (yil, aktif) VALUES ('2025-2026', true);

INSERT INTO alanlar (ad) VALUES 
('Bilişim Teknolojileri'),
('Muhasebe ve Finansman'),
('Pazarlama ve Perakende');

-- Örnek öğretmenler
INSERT INTO ogretmenler (ad, soyad, pin) VALUES
('Ahmet', 'Yılmaz', '1234'),
('Ayşe', 'Demir', '4321'),
('Mehmet', 'Kaya', '5678');

-- Örnek işletmeler
INSERT INTO isletmeler (ad, yetkili_kisi, pin, ogretmen_id) VALUES
('Tekno A.Ş.', 'Ali Can', '1111', 1),
('Finans Ltd.', 'Veli Yıldız', '2222', 2),
('Market A.Ş.', 'Zeynep Ak', '3333', 3);

-- Örnek öğrenciler
INSERT INTO ogrenciler (ad, soyad, sinif, alan_id) VALUES
('Mustafa', 'Şahin', '11-A', 1),
('Fatma', 'Yıldız', '11-B', 2),
('Zehra', 'Çelik', '11-C', 3);

-- Örnek stajlar
INSERT INTO stajlar (ogrenci_id, isletme_id, ogretmen_id, egitim_yili_id, baslangic_tarihi, bitis_tarihi) VALUES
(1, 1, 1, 1, '2025-09-01', '2026-01-31'),
(2, 2, 2, 1, '2025-09-01', '2026-01-31'),
(3, 3, 3, 1, '2025-09-01', '2026-01-31'); 