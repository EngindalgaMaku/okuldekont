-- Supabase GERÇEK Schema Yedeği
-- Tarih: 2025-07-11T21:46:34.338Z

-- =============================================================
-- GERÇEK TRIGGERS (1 adet)
-- =============================================================

-- Trigger: protect_super_admin_status
-- Tablo: admin_kullanicilar
-- Fonksiyon: prevent_super_admin_deactivation
-- Zamanlama: BEFORE
-- Olaylar: undefined

-- =============================================================
-- GERÇEK INDEXES (9 adet)
-- =============================================================

-- Index: admin_kullanicilar_email_key on admin_kullanicilar
-- Unique: true, Primary: undefined

-- Index: alanlar_ad_key on alanlar
-- Unique: true, Primary: undefined

-- Index: idx_dekontlar_ay_yil on dekontlar
-- Unique: false, Primary: undefined

-- Index: idx_dekontlar_isletme on dekontlar
-- Unique: false, Primary: undefined

-- Index: idx_dekontlar_ogrenci on dekontlar
-- Unique: false, Primary: undefined

-- Index: idx_dekontlar_onay_durumu on dekontlar
-- Unique: false, Primary: undefined

-- Index: egitim_yillari_yil_key on egitim_yillari
-- Unique: true, Primary: undefined

-- Index: isletme_koordinatorler_isletme_id_alan_id_key on isletme_koordinatorler
-- Unique: true, Primary: undefined

-- Index: system_settings_key_key on system_settings
-- Unique: true, Primary: undefined

-- =============================================================
-- GERÇEK RLS POLICIES (33 adet)
-- =============================================================

-- Policy: Allow admin operations on admin_kullanicilar
-- Command: undefined

-- Policy: Alanlar herkes tarafından görüntülenebilir on alanlar
-- Command: undefined

-- Policy: Allow all for authenticated users on alanlar
-- Command: undefined

-- Policy: Authenticated users can manage belgeler on belgeler
-- Command: undefined

-- Policy: Allow all for authenticated users on dekontlar
-- Command: undefined

-- Policy: Dekontlar herkes tarafından görüntülenebilir on dekontlar
-- Command: undefined

-- Policy: Öğretmenler kendi öğrencilerinin dekontlarını sadece gör on dekontlar
-- Command: undefined

-- Policy: Öğretmenler kendi öğrencilerinin dekontlarını yönetebili on dekontlar
-- Command: undefined

-- Policy: İşletmeler kendi dekontlarını ekleyebilir on dekontlar
-- Command: undefined

-- Policy: İşletmeler kendi dekontlarını görebilir on dekontlar
-- Command: undefined

-- Policy: İşletmeler kendi dekontlarını yönetebilir on dekontlar
-- Command: undefined

-- Policy: Allow all for authenticated users on egitim_yillari
-- Command: undefined

-- Policy: Allow anonymous read access to egitim_yillari on egitim_yillari
-- Command: undefined

-- Policy: Egitim yillari guncelleme on egitim_yillari
-- Command: undefined

-- Policy: Egitim yillari okuma on egitim_yillari
-- Command: undefined

-- Policy: Eğitim yılları herkes tarafından görüntülenebilir on egitim_yillari
-- Command: undefined

-- Policy: Adminler tüm görev belgelerini görebilir on gorev_belgeleri
-- Command: undefined

-- Policy: Öğretmenler kendi görev belgelerini görebilir on gorev_belgeleri
-- Command: undefined

-- Policy: Authenticated kullanıcılar tüm işlemleri yapabilir on isletme_koordinatorler
-- Command: undefined

-- Policy: Öğretmenler kendi koordinatör kayıtlarını görebilir on isletme_koordinatorler
-- Command: undefined

-- Policy: Allow all for authenticated users on isletmeler
-- Command: undefined

-- Policy: Allow anonymous read access to isletmeler on isletmeler
-- Command: undefined

-- Policy: İşletmeler herkes tarafından görüntülenebilir on isletmeler
-- Command: undefined

-- Policy: Allow all for authenticated users on ogrenciler
-- Command: undefined

-- Policy: Öğrenciler herkes tarafından görüntülenebilir on ogrenciler
-- Command: undefined

-- Policy: Allow all for authenticated users on ogretmenler
-- Command: undefined

-- Policy: Allow anonymous read access to ogretmenler on ogretmenler
-- Command: undefined

-- Policy: Öğretmenler herkes tarafından görüntülenebilir on ogretmenler
-- Command: undefined

-- Policy: Siniflar okuma on siniflar
-- Command: undefined

-- Policy: Siniflar yonetim on siniflar
-- Command: undefined

-- Policy: Allow all for authenticated users on stajlar
-- Command: undefined

-- Policy: Stajlar herkes tarafından görüntülenebilir on stajlar
-- Command: undefined

-- Policy: Allow all operations on system_settings on system_settings
-- Command: undefined

