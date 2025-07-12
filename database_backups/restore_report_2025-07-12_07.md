
# RPC FONKSİYON RESTORE RAPORU
**Tarih:** 2025-07-12T07:51:58.954Z
**Kaynak Backup:** database_backups/enhanced_rpc_backup_2025-07-12_07.json
**Restore ID:** 2025-07-12_07

## 📊 RESTORE ÖZETİ
- **Kaynak Backup Tarihi:** 2025-07-12T07:51:32.345Z
- **Toplam Fonksiyon:** 11
- **Restore Öncesi Çalışır:** 10
- **Restore Öncesi Sorunlu:** 1

## 📝 RESTORE TALİMATLARI

### 1. Manuel SQL Script Çalıştırma
Aşağıdaki scriptleri Supabase SQL Editor'da veya terminal'de çalıştırın:

#### Admin Fonksiyonları
```sql
-- scripts/create-admin-functions.sql içeriğini çalıştırın
-- veya
node scripts/setup-admin-functions.js
```

#### Sistem Ayarları Fonksiyonları  
```sql
-- scripts/create-system-settings.sql içeriğini çalıştırın
-- veya  
node scripts/setup-system-settings.js
```

#### PIN Fonksiyonları
```sql
node scripts/create-pin-functions.js
```

### 2. Test Komutları
Restore işleminden sonra test için:

```bash
# Bu script ile tekrar test edin
node scripts/restore-rpc-functions.js database_backups/enhanced_rpc_backup_2025-07-12_07.json

# veya backup script ile kontrol edin
node scripts/enhanced-backup-with-parameters.js
```

## 🔧 FONKSİYON DETAYLARI


### get_admin_users()
- **Durum:** working
- **Dönüş:** json
- **Güvenlik:** SECURITY DEFINER
- **Açıklama:** Tüm admin kullanıcılarını JSON formatında listeler


**Kullanım:**
```javascript
const { data, error } = await supabase.rpc('get_admin_users', {});
```


### create_admin_user(p_id uuid, p_ad varchar, p_soyad varchar, p_email varchar, p_yetki_seviyesi varchar DEFAULT operator)
- **Durum:** working
- **Dönüş:** boolean
- **Güvenlik:** SECURITY DEFINER
- **Açıklama:** Yeni admin kullanıcı oluşturur


**Kullanım:**
```javascript
const { data, error } = await supabase.rpc('create_admin_user', {
  "p_id": "00000000-0000-0000-0000-000000000000",
  "p_ad": "Test",
  "p_soyad": "User",
  "p_email": "test@example.com",
  "p_yetki_seviyesi": "operator"
});
```


### update_admin_user(p_id uuid, p_ad varchar DEFAULT NULL, p_soyad varchar DEFAULT NULL, p_yetki_seviyesi varchar DEFAULT NULL, p_aktif boolean DEFAULT NULL)
- **Durum:** working
- **Dönüş:** boolean
- **Güvenlik:** SECURITY DEFINER
- **Açıklama:** Admin kullanıcı bilgilerini günceller


**Kullanım:**
```javascript
const { data, error } = await supabase.rpc('update_admin_user', {
  "p_id": "00000000-0000-0000-0000-000000000000",
  "p_ad": "Updated Test"
});
```


### delete_admin_user(p_user_id uuid)
- **Durum:** working
- **Dönüş:** json
- **Güvenlik:** SECURITY DEFINER
- **Açıklama:** Admin kullanıcı siler (Süper admin silinemez)


**Kullanım:**
```javascript
const { data, error } = await supabase.rpc('delete_admin_user', {
  "p_user_id": "00000000-0000-0000-0000-000000000000"
});
```


### is_user_admin(p_user_id uuid)
- **Durum:** available
- **Dönüş:** TABLE(is_admin boolean, yetki_seviyesi varchar)
- **Güvenlik:** SECURITY DEFINER
- **Açıklama:** Kullanıcının admin olup olmadığını kontrol eder
- **Hata:** structure of query does not match function result type

**Kullanım:**
```javascript
const { data, error } = await supabase.rpc('is_user_admin', {
  "p_user_id": "00000000-0000-0000-0000-000000000000"
});
```


### get_system_setting(p_setting_key text)
- **Durum:** working
- **Dönüş:** text
- **Güvenlik:** SECURITY DEFINER
- **Açıklama:** Belirtilen anahtarın sistem ayar değerini getirir


**Kullanım:**
```javascript
const { data, error } = await supabase.rpc('get_system_setting', {
  "p_setting_key": "test_key"
});
```


### update_system_setting(p_setting_key text, p_setting_value text)
- **Durum:** working
- **Dönüş:** boolean
- **Güvenlik:** SECURITY DEFINER
- **Açıklama:** Sistem ayarını günceller veya oluşturur (upsert)


**Kullanım:**
```javascript
const { data, error } = await supabase.rpc('update_system_setting', {
  "p_setting_key": "test_key",
  "p_setting_value": "test_value"
});
```


### check_isletme_pin_giris(p_isletme_id uuid, p_girilen_pin text, p_ip_adresi text, p_user_agent text)
- **Durum:** working
- **Dönüş:** json
- **Güvenlik:** SECURITY DEFINER
- **Açıklama:** İşletme PIN giriş kontrolü yapar ve log kaydı tutar


**Kullanım:**
```javascript
const { data, error } = await supabase.rpc('check_isletme_pin_giris', {
  "p_isletme_id": "00000000-0000-0000-0000-000000000000",
  "p_girilen_pin": "1234",
  "p_ip_adresi": "127.0.0.1",
  "p_user_agent": "test-agent"
});
```


### check_ogretmen_pin_giris(p_ogretmen_id uuid, p_girilen_pin text, p_ip_adresi text, p_user_agent text)
- **Durum:** working
- **Dönüş:** json
- **Güvenlik:** SECURITY DEFINER
- **Açıklama:** Öğretmen PIN giriş kontrolü yapar ve log kaydı tutar


**Kullanım:**
```javascript
const { data, error } = await supabase.rpc('check_ogretmen_pin_giris', {
  "p_ogretmen_id": "00000000-0000-0000-0000-000000000000",
  "p_girilen_pin": "1234",
  "p_ip_adresi": "127.0.0.1",
  "p_user_agent": "test-agent"
});
```


### get_gorev_belgeleri_detayli(p_status_filter text, p_alan_id_filter uuid, p_search_term text, p_limit integer, p_offset integer)
- **Durum:** working
- **Dönüş:** TABLE(...)
- **Güvenlik:** SECURITY INVOKER
- **Açıklama:** Görev belgelerini filtreleme ve sayfalama ile detaylı getirir


**Kullanım:**
```javascript
const { data, error } = await supabase.rpc('get_gorev_belgeleri_detayli', {
  "p_status_filter": null,
  "p_alan_id_filter": null,
  "p_search_term": null,
  "p_limit": 10,
  "p_offset": 0
});
```


### exec_sql(query text)
- **Durum:** working
- **Dönüş:** text
- **Güvenlik:** SECURITY DEFINER
- **Açıklama:** Yönetici SQL komutları çalıştırır - SADECE GÜVENİLİR KAYNAKLARDAN!


**Kullanım:**
```javascript
const { data, error } = await supabase.rpc('exec_sql', {
  "query": "SELECT 1 as test"
});
```


## ⚠️ ÖNEMLİ NOTLAR
1. Backup dosyasındaki parametreler doğru şekilde kaydedilmiş
2. SQL scriptleri manuel çalıştırılması gereken durumlar var
3. Restore işleminden sonra mutlaka test edin
4. RLS politikalarını kontrol etmeyi unutmayın

---
**Oluşturulma Tarihi:** 2025-07-12T07:51:58.954Z
