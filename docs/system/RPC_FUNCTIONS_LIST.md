# 📋 Okul Dekont Projesi - RPC Fonksiyonları Listesi

**Son Güncelleme:** 11 Temmuz 2025
**Toplam Fonksiyon Sayısı:** 11 (Veritabanında doğrulanmış)
**Doğrulama Tarihi:** 11 Temmuz 2025 23:35

---

## ✅ DOĞRULANMIŞ FONKSIYONLAR

**Tüm fonksiyonlar Supabase veritabanında test edildi ve mevcut olduğu doğrulandı.**

## 📑 İçindekiler

1. [Admin Yönetimi Fonksiyonları](#admin-yönetimi-fonksiyonları) (5 adet)
2. [Sistem Ayarları Fonksiyonları](#sistem-ayarları-fonksiyonları) (2 adet)
3. [PIN Yönetimi Fonksiyonları](#pin-yönetimi-fonksiyonları) (2 adet)
4. [Belge Yönetimi Fonksiyonları](#belge-yönetimi-fonksiyonları) (1 adet)
5. [Güvenlik Fonksiyonları](#güvenlik-fonksiyonları) (1 adet)

---

## 🚨 DİKKAT: DOĞRULANMIŞ FONKSİYONLAR

**Aşağıdaki 11 fonksiyon 11 Temmuz 2025 tarihinde Supabase veritabanında test edildi ve mevcut olduğu doğrulandı:**

## Admin Yönetimi Fonksiyonları

### 1. `get_admin_users()` ✅ ÇALIŞIYOR
- **Durum:** Aktif ve çalışır durumda
- **Dönüş:** `json`
- **Güvenlik:** `SECURITY DEFINER`
- **Açıklama:** Tüm admin kullanıcılarını listeler
- **Parametreler:** Yok

### 2. `create_admin_user()` ✅ MEVCUT
- **Durum:** Mevcut (parametre uyumsuzluğu var)
- **Dönüş:** `boolean`
- **Güvenlik:** `SECURITY DEFINER`
- **Açıklama:** Yeni admin kullanıcı oluşturur
- **Parametreler:**
  - `p_id` (UUID)
  - `p_ad` (VARCHAR)
  - `p_soyad` (VARCHAR)
  - `p_email` (VARCHAR)
  - `p_yetki_seviyesi` (VARCHAR, default: 'operator')

### 3. `update_admin_user()` ✅ MEVCUT
- **Durum:** Mevcut (parametre uyumsuzluğu var)
- **Dönüş:** `boolean`
- **Güvenlik:** `SECURITY DEFINER`
- **Açıklama:** Admin kullanıcı bilgilerini günceller
- **Parametreler:**
  - `p_id` (UUID)
  - `p_ad` (VARCHAR, opsiyonel)
  - `p_soyad` (VARCHAR, opsiyonel)
  - `p_yetki_seviyesi` (VARCHAR, opsiyonel)
  - `p_aktif` (BOOLEAN, opsiyonel)

### 4. `delete_admin_user()` ✅ MEVCUT
- **Durum:** Mevcut (parametre uyumsuzluğu var)
- **Dönüş:** `json`
- **Güvenlik:** `SECURITY DEFINER`
- **Açıklama:** Admin kullanıcı siler (Süper admin silinemez)
- **Parametreler:**
  - `p_user_id` (UUID)

### 5. `is_user_admin()` ✅ MEVCUT
- **Durum:** Mevcut (sonuç yapısı uyumsuzluğu var)
- **Dönüş:** `TABLE(is_admin boolean, yetki_seviyesi varchar)`
- **Güvenlik:** `SECURITY DEFINER`
- **Açıklama:** Kullanıcının admin olup olmadığını kontrol eder
- **Parametreler:**
  - `p_user_id` (UUID)

---

## Sistem Ayarları Fonksiyonları

### 6. `get_system_setting()` ✅ ÇALIŞIYOR
- **Durum:** Aktif ve çalışır durumda
- **Dönüş:** `text`
- **Güvenlik:** `SECURITY DEFINER`
- **Açıklama:** Sistem ayar değerini getirir
- **Parametreler:**
  - `p_setting_key` (TEXT)

### 7. `update_system_setting()` ✅ MEVCUT
- **Durum:** Mevcut (parametre uyumsuzluğu var)
- **Dönüş:** `boolean`
- **Güvenlik:** `SECURITY DEFINER`
- **Açıklama:** Sistem ayarını günceller veya oluşturur (upsert)
- **Parametreler:**
  - `p_setting_key` (TEXT)
  - `p_setting_value` (TEXT)

---

## PIN Yönetimi Fonksiyonları

### 8. `check_isletme_pin_giris()` ✅ MEVCUT
- **Durum:** Mevcut (parametre uyumsuzluğu var)
- **Dönüş:** `json`
- **Güvenlik:** `SECURITY DEFINER`
- **Açıklama:** İşletme PIN giriş kontrolü yapar ve log tutar
- **Parametreler:**
  - `p_isletme_id` (UUID)
  - `p_girilen_pin` (TEXT)
  - `p_ip_adresi` (TEXT)
  - `p_user_agent` (TEXT)

### 9. `check_ogretmen_pin_giris()` ✅ MEVCUT
- **Durum:** Mevcut (parametre uyumsuzluğu var)
- **Dönüş:** `json`
- **Güvenlik:** `SECURITY DEFINER`
- **Açıklama:** Öğretmen PIN giriş kontrolü yapar ve log tutar
- **Parametreler:**
  - `p_ogretmen_id` (UUID)
  - `p_girilen_pin` (TEXT)
  - `p_ip_adresi` (TEXT)
  - `p_user_agent` (TEXT)

---

## Belge Yönetimi Fonksiyonları

### 10. `get_gorev_belgeleri_detayli()` ✅ MEVCUT
- **Durum:** Mevcut (parametre uyumsuzluğu var)
- **Dönüş:** `TABLE(...)`
- **Güvenlik:** `SECURITY INVOKER`
- **Açıklama:** Görev belgelerini filtreleme ve sayfalama ile getirir
- **Parametreler:**
  - `p_status_filter` (TEXT)
  - `p_alan_id_filter` (UUID)
  - `p_search_term` (TEXT)
  - `p_limit` (INTEGER)
  - `p_offset` (INTEGER)

---

## Güvenlik Fonksiyonları

### 11. `exec_sql()` ✅ MEVCUT
- **Durum:** Mevcut (parametre uyumsuzluğu var)
- **Dönüş:** `text` / `json`
- **Güvenlik:** `SECURITY DEFINER`
- **Açıklama:** Yönetici SQL komutları çalıştırır ⚠️ **DİKKAT: Sadece güvenilir kaynaklardan!**
- **Parametreler:**
  - `query` (TEXT)

---

## 🛡️ Güvenlik Seviyeleri

### SECURITY DEFINER (9 fonksiyon)
Fonksiyon sahibinin yetkilerini kullanır:
- `get_admin_users()` ✅
- `create_admin_user()` ✅
- `update_admin_user()` ✅
- `delete_admin_user()` ✅
- `is_user_admin()` ✅
- `get_system_setting()` ✅
- `update_system_setting()` ✅
- `check_isletme_pin_giris()` ✅
- `check_ogretmen_pin_giris()` ✅
- `exec_sql()` ✅

### SECURITY INVOKER (1 fonksiyon)
Çağıran kullanıcının yetkilerini kullanır:
- `get_gorev_belgeleri_detayli()` ✅

---

## 📊 Fonksiyon Durumları

### ✅ TAM ÇALIŞABİLİR (2 adet)
- `get_admin_users()` - Parametre yok, mükemmel çalışıyor
- `get_system_setting()` - Test parametresi ile çalışıyor

### ⚠️ PARAMETRE UYUMSUZLUĞU (9 adet)
- `create_admin_user()` - Fonksiyon mevcut ama parametre imzası farklı
- `update_admin_user()` - Fonksiyon mevcut ama parametre imzası farklı
- `delete_admin_user()` - Fonksiyon mevcut ama parametre imzası farklı
- `is_user_admin()` - Fonksiyon mevcut ama sonuç yapısı farklı
- `update_system_setting()` - Fonksiyon mevcut ama parametre imzası farklı
- `check_isletme_pin_giris()` - Fonksiyon mevcut ama parametre imzası farklı
- `check_ogretmen_pin_giris()` - Fonksiyon mevcut ama parametre imzası farklı
- `get_gorev_belgeleri_detayli()` - Fonksiyon mevcut ama parametre imzası farklı
- `exec_sql()` - Fonksiyon mevcut ama parametre imzası farklı

---

## 🎯 Kullanım Örnekleri

### ✅ Çalışan Fonksiyonlar

```javascript
// Supabase client ile kullanım

// Admin kullanıcı listesi (Çalışıyor)
const { data, error } = await supabase.rpc('get_admin_users');

// Sistem ayarı okuma (Çalışıyor)
const { data, error } = await supabase.rpc('get_system_setting', {
  p_setting_key: 'okul_adi'
});
```

### ⚠️ Parametre Düzeltmesi Gereken Fonksiyonlar

Diğer fonksiyonları kullanmadan önce doğru parametre imzalarını kontrol etmeniz gerekiyor.

---

## 🔧 Doğrulama Scripti

Fonksiyonları test etmek için:

```bash
# Oluşturduğumuz test scripti
node scripts/check-rpc-with-supabase.js
```

---

## 📝 Doğrulama Raporu

**Test Tarihi:** 11 Temmuz 2025, 23:35
**Test Yöntemi:** Supabase Client ile direkt fonksiyon çağrısı
**Sonuç:** 11 fonksiyon mevcut, 2 tanesi tam çalışır durumda, 9 tanesi parametre düzeltmesi gerekiyor

---

**Not:** Bu liste 11 Temmuz 2025 tarihinde gerçek Supabase veritabanından test edilerek doğrulanmıştır. Fonksiyon imzaları ve parametreleri için ek kontrol gerekebilir.