# 🚀 Auth Cleanup Functions - ACIL DEPLOYMENT REHBERİ

## ❌ **MEVCUT SORUN**
Auth istatistikleri 0 gösteriyor çünkü gerekli fonksiyonlar henüz Supabase veritabanınızda yok.

---

## 🎯 **5 DAKİKADA ÇÖZÜM**

### 1️⃣ **Supabase Dashboard'a Git**
- https://supabase.com/dashboard adresine git
- Projenizi seç

### 2️⃣ **SQL Editor'ı Aç**
- Sol menüden **"SQL Editor"** tıkla
- **"New query"** butonu

### 3️⃣ **SQL Kodunu Kopyala ve Yapıştır**

**A) Bu dosyayı aç:** `scripts/auth-cleanup-supabase.sql`

**B) Dosyanın tüm içeriğini kopyala (Ctrl+A, Ctrl+C)**

**C) Supabase SQL Editor'a yapıştır (Ctrl+V)**

### 4️⃣ **Kodu Çalıştır**
- **"Run"** butonuna bas
- Başarılı mesajı: `Success. No rows returned`

### 5️⃣ **Test Et**
- Admin paneli yenile (F5)
- "Auth Yönetimi" sekmesine git
- Artık gerçek istatistikleri göreceksin!

---

## 📝 **TAM SQL KODU** (Kopyala-Yapıştır için)

```sql
-- =====================================================
-- Auth Cleanup Functions for Supabase
-- =====================================================
-- Execute this in Supabase SQL Editor (Database > SQL Editor)
-- These functions provide auth user statistics and cleanup capabilities

-- Function 1: Get auth user statistics
CREATE OR REPLACE FUNCTION get_auth_user_statistics()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSON;
    total_count INTEGER;
    anon_count INTEGER;
    auth_count INTEGER;
    expired_count INTEGER;
    last_cleanup TIMESTAMP;
BEGIN
    -- Get total user count
    SELECT COUNT(*) INTO total_count FROM auth.users;
    
    -- Get anonymous user count (users without email or with empty email)
    SELECT COUNT(*) INTO anon_count 
    FROM auth.users 
    WHERE email IS NULL OR email = '' OR email LIKE '%@example.com';
    
    -- Get authenticated user count (users with real email)
    SELECT COUNT(*) INTO auth_count 
    FROM auth.users 
    WHERE email IS NOT NULL AND email != '' AND email NOT LIKE '%@example.com';
    
    -- Get expired anonymous users (older than 1 day and no recent sign in)
    SELECT COUNT(*) INTO expired_count 
    FROM auth.users 
    WHERE (email IS NULL OR email = '' OR email LIKE '%@example.com')
    AND created_at < NOW() - INTERVAL '1 day'
    AND (last_sign_in_at IS NULL OR last_sign_in_at < NOW() - INTERVAL '1 day');
    
    -- Get last cleanup date (placeholder - implement cleanup logging if needed)
    last_cleanup := NULL;
    
    -- Build result JSON
    result := json_build_object(
        'total_users', total_count,
        'anonymous_users', anon_count,
        'authenticated_users', auth_count,
        'expired_anonymous', expired_count,
        'last_cleanup_date', last_cleanup
    );
    
    RETURN result;
END;
$$;

-- Function 2: Cleanup expired anonymous users
CREATE OR REPLACE FUNCTION cleanup_expired_anonymous_users()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSON;
    deleted_count INTEGER;
    user_ids UUID[];
BEGIN
    -- Get list of expired anonymous user IDs
    -- These are users without real email addresses and older than 1 day
    SELECT ARRAY(
        SELECT id 
        FROM auth.users 
        WHERE (email IS NULL OR email = '' OR email LIKE '%@example.com')
        AND created_at < NOW() - INTERVAL '1 day'
        AND (last_sign_in_at IS NULL OR last_sign_in_at < NOW() - INTERVAL '1 day')
        LIMIT 1000  -- Safety limit to prevent accidental mass deletion
    ) INTO user_ids;
    
    -- Count how many will be deleted
    deleted_count := array_length(user_ids, 1);
    
    -- If no users to delete, return early
    IF deleted_count IS NULL OR deleted_count = 0 THEN
        result := json_build_object(
            'success', true,
            'deleted_count', 0,
            'message', 'No expired anonymous users found'
        );
        RETURN result;
    END IF;
    
    -- Delete expired anonymous users (safely)
    DELETE FROM auth.users 
    WHERE id = ANY(user_ids)
    AND (email IS NULL OR email = '' OR email LIKE '%@example.com')  -- Extra safety check
    AND created_at < NOW() - INTERVAL '1 day';
    
    -- Get actual deleted count
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Return success result
    result := json_build_object(
        'success', true,
        'deleted_count', deleted_count,
        'message', 'Expired anonymous users cleaned up successfully'
    );
    
    RETURN result;
    
EXCEPTION
    WHEN OTHERS THEN
        result := json_build_object(
            'success', false,
            'error', SQLERRM,
            'deleted_count', 0
        );
        RETURN result;
END;
$$;

-- Grant permissions to authenticated users (adjust as needed)
GRANT EXECUTE ON FUNCTION get_auth_user_statistics() TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_expired_anonymous_users() TO authenticated;
```

---

## ✅ **DEPLOYMENT BAŞARILI OLDUĞUNDA**

Aşağıdakileri göreceksin:
- ✅ Auth istatistikleri gerçek sayıları gösterir
- ✅ "Deploy Rehberi" uyarısı kaybolur
- ✅ Temizlik butonu çalışır hale gelir
- ✅ Auth yönetimi tam fonksiyonel olur

---

## 🔧 **TROUBLESHOOTİNG**

### Sorun: "permission denied for schema auth"
**Çözüm:** Projenizin owner'ı olarak giriş yaptığınızdan emin olun

### Sorun: SQL hatası alıyorum
**Çözüm:** Tüm kodu seçip copy-paste yaptığınızdan emin olun

### Sorun: Hala 0 gösteriyor
**Çözüm:** Sayfayı hard refresh yapın (Ctrl+F5)

---

## 📞 **DESTEK**

Hala sorun yaşıyorsan:
- Email: mackaengin@gmail.com
- Hata mesajını tam olarak ilet

---

**⚡ HIZLI ÖZET:** 
1. Supabase Dashboard → SQL Editor
2. Yukarıdaki SQL'i kopyala-yapıştır-çalıştır
3. Admin paneli yenile
4. Auth Yönetimi artık çalışıyor! 🎉