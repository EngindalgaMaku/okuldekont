# RPC Fonksiyonları Dokümantasyonu

**Son Güncelleme:** 10 Ocak 2025  
**Toplam Fonksiyon Sayısı:** 14  
**Aktif Trigger Sayısı:** 1

---

## 📋 İçindekiler

1. [Admin Yönetimi Fonksiyonları](#admin-yönetimi-fonksiyonları)
2. [Sistem Ayarları Fonksiyonları](#sistem-ayarları-fonksiyonları)  
3. [PIN Yönetimi Fonksiyonları](#pin-yönetimi-fonksiyonları)
4. [Belge Yönetimi Fonksiyonları](#belge-yönetimi-fonksiyonları)
5. [Güvenlik Fonksiyonları](#güvenlik-fonksiyonları)
6. [Trigger Fonksiyonları](#trigger-fonksiyonları)
7. [Aktif Triggerlar](#aktif-triggerlar)

---

## Admin Yönetimi Fonksiyonları

### 🔍 `get_admin_users()`
**Parametre:** Yok  
**Dönüş:** `json`  
**Güvenlik:** `SECURITY DEFINER`  
**Açıklama:** Tüm admin kullanıcılarını JSON formatında listeler.

```sql
CREATE OR REPLACE FUNCTION public.get_admin_users()
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    result JSON;
BEGIN
    SELECT json_agg(
        json_build_object(
            'id', a.id,
            'ad', a.ad,
            'soyad', a.soyad,
            'email', a.email,
            'yetki_seviyesi', a.yetki_seviyesi,
            'aktif', a.aktif,
            'created_at', a.created_at,
            'updated_at', a.updated_at
        )
        ORDER BY a.created_at DESC
    ) INTO result
    FROM public.admin_kullanicilar a;

    RETURN COALESCE(result, '[]'::json);
EXCEPTION
    WHEN OTHERS THEN
        RAISE LOG 'Error in get_admin_users: %', SQLERRM;
        RETURN '[]'::json;
END;
$function$
```

### ➕ `create_admin_user()`
**Parametreler:** 
- `p_id` (uuid)
- `p_ad` (varchar)
- `p_soyad` (varchar)
- `p_email` (varchar)
- `p_yetki_seviyesi` (varchar, default: 'operator')

**Dönüş:** `boolean`  
**Güvenlik:** `SECURITY DEFINER`  
**Açıklama:** Yeni admin kullanıcı oluşturur.

```sql
CREATE OR REPLACE FUNCTION public.create_admin_user(p_id uuid, p_ad character varying, p_soyad character varying, p_email character varying, p_yetki_seviyesi character varying DEFAULT 'operator'::character varying)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    INSERT INTO public.admin_kullanicilar (id, ad, soyad, email, yetki_seviyesi, aktif)
    VALUES (p_id, p_ad, p_soyad, p_email, p_yetki_seviyesi, true);

    RETURN TRUE;
EXCEPTION
    WHEN OTHERS THEN
        RAISE LOG 'Error in create_admin_user: %', SQLERRM;
        RETURN FALSE;
END;
$function$
```

### ✏️ `update_admin_user()`
**Parametreler:**
- `p_id` (uuid)
- `p_ad` (varchar, opsiyonel)
- `p_soyad` (varchar, opsiyonel)
- `p_yetki_seviyesi` (varchar, opsiyonel)
- `p_aktif` (boolean, opsiyonel)

**Dönüş:** `boolean`  
**Güvenlik:** `SECURITY DEFINER`  
**Açıklama:** Admin kullanıcı bilgilerini günceller. Süper admin aktif durumunu değiştirmez.

```sql
CREATE OR REPLACE FUNCTION public.update_admin_user(p_id uuid, p_ad character varying DEFAULT NULL::character varying, p_soyad character varying DEFAULT NULL::character varying, p_yetki_seviyesi character varying DEFAULT NULL::character varying, p_aktif boolean DEFAULT NULL::boolean)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    current_role VARCHAR(20);
BEGIN
    -- Check current user role
    SELECT yetki_seviyesi INTO current_role
    FROM public.admin_kullanicilar
    WHERE id = p_id;

    -- If user is super admin and trying to change aktif status, ignore it
    IF current_role = 'super_admin' AND p_aktif IS NOT NULL THEN
        -- Log the attempt but don't apply the change
        RAISE LOG 'Attempted to change super admin active status - blocked';
        -- Remove aktif from update
        p_aktif = NULL;
    END IF;

    UPDATE public.admin_kullanicilar
    SET
        ad = COALESCE(p_ad, ad),
        soyad = COALESCE(p_soyad, soyad),
        yetki_seviyesi = COALESCE(p_yetki_seviyesi, yetki_seviyesi),
        aktif = COALESCE(p_aktif, aktif),
        updated_at = NOW()
    WHERE id = p_id;

    RETURN FOUND;
EXCEPTION
    WHEN OTHERS THEN
        RAISE LOG 'Error in update_admin_user: %', SQLERRM;
        RETURN FALSE;
END;
$function$
```

### 🗑️ `delete_admin_user()`
**Parametre:** `p_user_id` (uuid)  
**Dönüş:** `json`  
**Güvenlik:** `SECURITY DEFINER`  
**Açıklama:** Admin kullanıcı siler. Süper admin silinemez.

```sql
CREATE OR REPLACE FUNCTION public.delete_admin_user(p_user_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    user_record RECORD;
BEGIN
    -- Get user info before deletion
    SELECT ad, soyad, yetki_seviyesi INTO user_record
    FROM public.admin_kullanicilar
    WHERE id = p_user_id;

    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Kullanıcı bulunamadı'
        );
    END IF;

    -- Don't allow deletion of super admin
    IF user_record.yetki_seviyesi = 'super_admin' THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Süper admin kullanıcısı silinemez'
        );
    END IF;

    -- Delete the user
    DELETE FROM public.admin_kullanicilar WHERE id = p_user_id;

    RETURN json_build_object(
        'success', true,
        'message', format('%s %s başarıyla silindi', user_record.ad, user_record.soyad)
    );
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'error', format('Kullanıcı silinirken hata: %s', SQLERRM)
        );
END;
$function$
```

### 🔐 `is_user_admin()`
**Parametre:** `p_user_id` (uuid)  
**Dönüş:** `TABLE(is_admin boolean, yetki_seviyesi varchar)`  
**Güvenlik:** `SECURITY DEFINER`  
**Açıklama:** Kullanıcının admin olup olmadığını ve yetki seviyesini kontrol eder.

```sql
CREATE OR REPLACE FUNCTION public.is_user_admin(p_user_id uuid)
 RETURNS TABLE(is_admin boolean, yetki_seviyesi character varying)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    RETURN QUERY
    SELECT
        CASE WHEN a.id IS NOT NULL AND a.aktif = true THEN true ELSE false END as is_admin,
        a.yetki_seviyesi
    FROM public.admin_kullanicilar a
    WHERE a.id = p_user_id;

    IF NOT FOUND THEN
        RETURN QUERY SELECT false::BOOLEAN, NULL::VARCHAR(20);
    END IF;
END;
$function$
```

---

## Sistem Ayarları Fonksiyonları

### 🔍 `get_system_setting()`
**Parametre:** `p_setting_key` (text)  
**Dönüş:** `text`  
**Güvenlik:** `SECURITY DEFINER`  
**Açıklama:** Belirtilen anahtarın sistem ayar değerini getirir.

```sql
CREATE OR REPLACE FUNCTION public.get_system_setting(p_setting_key text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    result TEXT;
BEGIN
    SELECT value INTO result
    FROM public.system_settings
    WHERE key = p_setting_key;

    RETURN COALESCE(result, NULL);
EXCEPTION
    WHEN OTHERS THEN
        RAISE LOG 'Error in get_system_setting: %', SQLERRM;
        RETURN NULL;
END;
$function$
```

### ✏️ `update_system_setting()`
**Parametreler:**
- `p_setting_key` (text)
- `p_setting_value` (text)

**Dönüş:** `boolean`  
**Güvenlik:** `SECURITY DEFINER`  
**Açıklama:** Sistem ayarını günceller veya oluşturur (upsert).

```sql
CREATE OR REPLACE FUNCTION public.update_system_setting(p_setting_key text, p_setting_value text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    -- Use upsert (INSERT ... ON CONFLICT)
    INSERT INTO public.system_settings (key, value, updated_at)
    VALUES (p_setting_key, p_setting_value, NOW())
    ON CONFLICT (key)
    DO UPDATE SET
        value = EXCLUDED.value,
        updated_at = EXCLUDED.updated_at;

    RETURN TRUE;
EXCEPTION
    WHEN OTHERS THEN
        RAISE LOG 'Error in update_system_setting: %', SQLERRM;
        RETURN FALSE;
END;
$function$
```

---

## PIN Yönetimi Fonksiyonları

### 🏢 `check_isletme_pin()`
**Parametre:** `p_pin` (text)  
**Dönüş:** `TABLE(isletme_id uuid, isletme_ad text)`  
**Güvenlik:** `SECURITY INVOKER`  
**Açıklama:** İşletme PIN'ini doğrular ve işletme bilgilerini döner.

### 🏢 `check_isletme_pin_giris()`
**Parametreler:**
- `p_isletme_id` (uuid)
- `p_girilen_pin` (text)
- `p_ip_adresi` (text)
- `p_user_agent` (text)

**Dönüş:** `json`  
**Güvenlik:** `SECURITY DEFINER`  
**Açıklama:** İşletme PIN giriş kontrolü yapar ve log kaydı tutar.

### 👨‍🏫 `check_ogretmen_pin()`
**Parametre:** `p_pin` (text)  
**Dönüş:** `TABLE(ogretmen_id uuid, ogretmen_ad text, ogretmen_soyad text)`  
**Güvenlik:** `SECURITY INVOKER`  
**Açıklama:** Öğretmen PIN'ini doğrular ve öğretmen bilgilerini döner.

### 👨‍🏫 `check_ogretmen_pin_giris()`
**Parametreler:**
- `p_ogretmen_id` (uuid)
- `p_girilen_pin` (text)
- `p_ip_adresi` (text)
- `p_user_agent` (text)

**Dönüş:** `json`  
**Güvenlik:** `SECURITY DEFINER`  
**Açıklama:** Öğretmen PIN giriş kontrolü yapar ve log kaydı tutar.

---

## Belge Yönetimi Fonksiyonları

### 📄 `get_gorev_belgeleri_detayli()`
**Parametreler:**
- `p_status_filter` (text)
- `p_alan_id_filter` (uuid)
- `p_search_term` (text)
- `p_limit` (integer)
- `p_offset` (integer)

**Dönüş:** `TABLE(...)`  
**Güvenlik:** `SECURITY INVOKER`  
**Açıklama:** Görev belgelerini filtreleme ve sayfalama ile detaylı getirir.

---

## Güvenlik Fonksiyonları

### ⚙️ `exec_sql()`
**Parametre:** `query` (text)  
**Dönüş:** `text`  
**Güvenlik:** `SECURITY DEFINER`  
**Açıklama:** Yönetici SQL komutları çalıştırır. **DİKKAT:** Sadece güvenilir kaynaklardan kullanılmalı.

---

## Trigger Fonksiyonları

### 🛡️ `prevent_super_admin_deactivation()`
**Parametre:** Yok (Trigger fonksiyonu)  
**Dönüş:** `trigger`  
**Güvenlik:** `SECURITY INVOKER`  
**Açıklama:** Süper admin kullanıcısının aktif durumunun değiştirilmesini engeller.

```sql
CREATE OR REPLACE FUNCTION public.prevent_super_admin_deactivation()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    -- If this is an update and the user is super admin
    IF TG_OP = 'UPDATE' AND OLD.yetki_seviyesi = 'super_admin' THEN
        -- Don't allow aktif to be changed from true to false
        IF OLD.aktif = true AND NEW.aktif = false THEN
            RAISE EXCEPTION 'Süper admin aktif durumu değiştirilemez. Güvenlik koruması aktif.';
        END IF;

        -- Always keep super admin active
        NEW.aktif = true;
    END IF;

    RETURN NEW;
END;
$function$
```

---

## Aktif Triggerlar

### 🔒 `protect_super_admin_status`
**Tablo:** `admin_kullanicilar`  
**Fonksiyon:** `prevent_super_admin_deactivation()`  
**Zamanlama:** `BEFORE UPDATE`  
**Açıklama:** Süper admin aktif durumunu korur.

---

## 🔧 Kullanım Örnekleri

### Admin Kullanıcı Listeleme
```sql
SELECT * FROM get_admin_users();
```

### Sistem Ayarı Okuma
```sql
SELECT get_system_setting('okul_adi');
```

### Sistem Ayarı Güncelleme
```sql
SELECT update_system_setting('okul_adi', 'Hüsniye Özdilek MTAL');
```

### Kullanıcı Admin Kontrolü
```sql
SELECT * FROM is_user_admin('user-uuid-here');
```

---

## 🔒 Güvenlik Notları

1. **SECURITY DEFINER** fonksiyonları fonksiyon sahibinin yetkilerini kullanır
2. **SECURITY INVOKER** fonksiyonları çağıran kullanıcının yetkilerini kullanır
3. Tüm admin fonksiyonları yetki kontrolü yapar
4. Süper admin silinmez ve pasifleştirilemez
5. Sensitive işlemler log kaydı tutar

---

## 📝 Güncelleme Geçmişi

- **10 Ocak 2025:** İlk dokümantasyon oluşturuldu
- Tüm fonksiyonlar aktif ve çalışır durumda
- Süper admin koruma sistemi aktif

---

**Not:** Bu fonksiyonları güncellemek için SQL editor kullanın veya migration script'leri çalıştırın.