-- supabase/migrations/006_add_admin_policies.sql
-- Admin kullanıcıları için tam erişim politikaları

-- Önce mevcut genel okuma politikalarını kaldıralım (daha spesifik olanları ekleyeceğiz)
-- Not: Bu komutlar ilk migration'da hata verebilir eğer daha önce çalıştırıldıysa, bu normaldir.
-- Komutların başına "IF EXISTS" ekleyerek bu durumu yönetebiliriz.
DROP POLICY IF EXISTS "Authenticated users can read all" ON alanlar;
DROP POLICY IF EXISTS "Authenticated users can read all" ON ogretmenler;
DROP POLICY IF EXISTS "Authenticated users can read all" ON isletmeler;
DROP POLICY IF EXISTS "Authenticated users can read all" ON ogrenciler;
DROP POLICY IF EXISTS "Authenticated users can read all" ON stajlar;
DROP POLICY IF EXISTS "Authenticated users can read all" ON dekontlar;
DROP POLICY IF EXISTS "Authenticated users can read all" ON egitim_yillari;


-- Tüm tablolar için "Giriş yapmış kullanıcılar her şeyi yapabilir" politikası
-- Bu, RLS'yi aktif tutarken admin paneli gibi güvenli bir alandan
-- tüm CRUD işlemlerinin yapılmasına olanak tanır.

CREATE POLICY "Allow all for authenticated users" ON alanlar
  FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow all for authenticated users" ON ogretmenler
  FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow all for authenticated users" ON isletmeler
  FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow all for authenticated users" ON ogrenciler
  FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow all for authenticated users" ON stajlar
  FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow all for authenticated users" ON dekontlar
  FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow all for authenticated users" ON egitim_yillari
  FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated'); 