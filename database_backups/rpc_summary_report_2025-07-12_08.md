
# RPC FONKSİYON ÖZET RAPORU
**Tarih:** 2025-07-12T08:06:11.952Z
**Backup ID:** 2025-07-12_08

## 📊 GENEL İSTATİSTİKLER
- **Toplam Fonksiyon:** 11
- **Çalışır Durumda:** 10
- **Mevcut (Parametre Sorunu):** 1
- **Bulunamadı:** 0

## ✅ ÇALIŞIR DURUMDA (10 adet)
### get_admin_users()
- **Dönüş:** json
- **Güvenlik:** SECURITY DEFINER
- **Açıklama:** Tüm admin kullanıcılarını JSON formatında listeler

### create_admin_user(p_id uuid, p_ad varchar, p_soyad varchar, p_email varchar, p_yetki_seviyesi varchar DEFAULT operator)
- **Dönüş:** boolean
- **Güvenlik:** SECURITY DEFINER
- **Açıklama:** Yeni admin kullanıcı oluşturur

### update_admin_user(p_id uuid, p_ad varchar DEFAULT NULL, p_soyad varchar DEFAULT NULL, p_yetki_seviyesi varchar DEFAULT NULL, p_aktif boolean DEFAULT NULL)
- **Dönüş:** boolean
- **Güvenlik:** SECURITY DEFINER
- **Açıklama:** Admin kullanıcı bilgilerini günceller

### delete_admin_user(p_user_id uuid)
- **Dönüş:** json
- **Güvenlik:** SECURITY DEFINER
- **Açıklama:** Admin kullanıcı siler (Süper admin silinemez)

### get_system_setting(p_setting_key text)
- **Dönüş:** text
- **Güvenlik:** SECURITY DEFINER
- **Açıklama:** Belirtilen anahtarın sistem ayar değerini getirir

### update_system_setting(p_setting_key text, p_setting_value text)
- **Dönüş:** boolean
- **Güvenlik:** SECURITY DEFINER
- **Açıklama:** Sistem ayarını günceller veya oluşturur (upsert)

### check_isletme_pin_giris(p_isletme_id uuid, p_girilen_pin text, p_ip_adresi text, p_user_agent text)
- **Dönüş:** json
- **Güvenlik:** SECURITY DEFINER
- **Açıklama:** İşletme PIN giriş kontrolü yapar ve log kaydı tutar

### check_ogretmen_pin_giris(p_ogretmen_id uuid, p_girilen_pin text, p_ip_adresi text, p_user_agent text)
- **Dönüş:** json
- **Güvenlik:** SECURITY DEFINER
- **Açıklama:** Öğretmen PIN giriş kontrolü yapar ve log kaydı tutar

### get_gorev_belgeleri_detayli(p_status_filter text, p_alan_id_filter uuid, p_search_term text, p_limit integer, p_offset integer)
- **Dönüş:** TABLE(...)
- **Güvenlik:** SECURITY INVOKER
- **Açıklama:** Görev belgelerini filtreleme ve sayfalama ile detaylı getirir

### exec_sql(query text)
- **Dönüş:** text
- **Güvenlik:** SECURITY DEFINER
- **Açıklama:** Yönetici SQL komutları çalıştırır - SADECE GÜVENİLİR KAYNAKLARDAN!

## 🔧 MEVCUT AMA PARAMETRE SORUNU (1 adet)
### is_user_admin(p_user_id uuid)
- **Dönüş:** TABLE(is_admin boolean, yetki_seviyesi varchar)
- **Güvenlik:** SECURITY DEFINER
- **Açıklama:** Kullanıcının admin olup olmadığını kontrol eder
- **Hata:** structure of query does not match function result type

## ❌ BULUNAMADI (0 adet)


## 🔧 KULLANIM ÖRNEKLERİ

### Çalışır Fonksiyonlar
```javascript
// get_admin_users
const { data, error } = await supabase.rpc('get_admin_users', {});
```

```javascript
// create_admin_user
const { data, error } = await supabase.rpc('create_admin_user', {
  "p_id": "00000000-0000-0000-0000-000000000000",
  "p_ad": "Test",
  "p_soyad": "User",
  "p_email": "test@example.com",
  "p_yetki_seviyesi": "operator"
});
```

```javascript
// update_admin_user
const { data, error } = await supabase.rpc('update_admin_user', {
  "p_id": "00000000-0000-0000-0000-000000000000",
  "p_ad": "Updated Test"
});
```

```javascript
// delete_admin_user
const { data, error } = await supabase.rpc('delete_admin_user', {
  "p_user_id": "00000000-0000-0000-0000-000000000000"
});
```

```javascript
// get_system_setting
const { data, error } = await supabase.rpc('get_system_setting', {
  "p_setting_key": "test_key"
});
```

```javascript
// update_system_setting
const { data, error } = await supabase.rpc('update_system_setting', {
  "p_setting_key": "test_key",
  "p_setting_value": "test_value"
});
```

```javascript
// check_isletme_pin_giris
const { data, error } = await supabase.rpc('check_isletme_pin_giris', {
  "p_isletme_id": "00000000-0000-0000-0000-000000000000",
  "p_girilen_pin": "1234",
  "p_ip_adresi": "127.0.0.1",
  "p_user_agent": "test-agent"
});
```

```javascript
// check_ogretmen_pin_giris
const { data, error } = await supabase.rpc('check_ogretmen_pin_giris', {
  "p_ogretmen_id": "00000000-0000-0000-0000-000000000000",
  "p_girilen_pin": "1234",
  "p_ip_adresi": "127.0.0.1",
  "p_user_agent": "test-agent"
});
```

```javascript
// get_gorev_belgeleri_detayli
const { data, error } = await supabase.rpc('get_gorev_belgeleri_detayli', {
  "p_status_filter": null,
  "p_alan_id_filter": null,
  "p_search_term": null,
  "p_limit": 10,
  "p_offset": 0
});
```

```javascript
// exec_sql
const { data, error } = await supabase.rpc('exec_sql', {
  "query": "SELECT 1 as test"
});
```
