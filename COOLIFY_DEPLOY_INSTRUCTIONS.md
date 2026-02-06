# Coolify Deploy Talimatları

## Sorun: Değişiklikler Production'da Görünmüyor

### Çözüm Adımları:

## 1. Coolify'da Cache Temizleme ve Redeploy

1. **Coolify Dashboard'a gidin**
2. **Projenizi seçin**
3. **"Force Rebuild" veya "Clean Build" seçeneğini kullanın**
   - Eğer bu seçenek yoksa:
   - Settings → Build → "Clear Build Cache" 
   - Veya Environment Variables'a şunu ekleyin:
     ```
     NEXT_TELEMETRY_DISABLED=1
     ```

4. **Redeploy butonuna tıklayın**

## 2. Build Loglarını Kontrol Edin

Build sırasında şunları kontrol edin:
```
✓ Compiled successfully
✓ Linting
✓ Collecting page data
✓ Generating static pages
✓ Finalizing page optimization
```

## 3. Tarayıcı Cache Temizleme

Deploy tamamlandıktan sonra:

### Chrome/Edge:
- `Ctrl + Shift + Delete` → "Cached images and files" → Clear
- Veya `Ctrl + Shift + R` (Hard Refresh)

### Firefox:
- `Ctrl + Shift + Delete` → "Cache" → Clear
- Veya `Ctrl + F5` (Hard Refresh)

## 4. Değişiklikleri Kontrol Edin

### Test 1: Dekont Yükleme Uyarısı
- Öğretmen paneline gidin
- Uyarı mesajında "ayın 7'sine kadar" yazmalı (10 değil!)

### Test 2: Bekleme Listesinde Ödeme Tutarı
- Admin → Dekontlar sayfasına gidin
- "Aylık Beklenen Liste" bölümünü açın
- Kırmızı kartlarda (dekont olmayan öğrenciler):
  - "Ödeme (Excel):" satırında tutar görünmeli
  - "-" yerine gerçek tutar olmalı (örn: "₺8,422.65")

### Test 3: Fesih Tarihi Düzenleme
- Admin → Stajlar sayfasına gidin
- Feshedilmiş bir staj kartında:
  - Sağ üstte 3 nokta menüsü görünmeli
  - "Fesih Tarihini Düzenle" seçeneği olmalı

## 5. Hala Çalışmıyorsa

### A. Coolify Build Komutlarını Kontrol Edin
Build Command:
```bash
npm run build
```

Start Command:
```bash
npm start
```

### B. Environment Variables
Şunların olduğundan emin olun:
```
NODE_ENV=production
DATABASE_URL=...
NEXTAUTH_URL=https://ozdilek.kodleon.com
NEXTAUTH_SECRET=...
```

### C. Port Ayarları
Port: `3000` (default Next.js port)

### D. Dockerfile Kontrol
Eğer Dockerfile kullanıyorsanız, multi-stage build olduğundan emin olun.

## 6. Son Çare: Manuel Deploy

Eğer hiçbir şey işe yaramazsa:

1. **Local'de build alın:**
   ```bash
   npm run build
   ```

2. **`.next` klasörünü kontrol edin** - oluşmuş olmalı

3. **Coolify'da "Force Rebuild" yapın**

4. **Coolify loglarını inceleyin** - hata var mı?

## Commit Bilgileri

Son commit'ler:
- `083a5f3` - Fesih tarihi düzenleme özelliği
- `4fdbcba` - Dekont uyarısı ve ödeme tutarı düzeltmeleri

Tüm değişiklikler git'e yüklenmiş durumda!

## Değişen Dosyalar

1. `src/app/admin/dekontlar/ClientPage.tsx` ✅
2. `src/app/api/admin/reports/dekont-status/route.ts` ✅
3. `src/app/ogretmen/panel/page.tsx` ✅
4. `src/app/isletme/page.tsx` ✅
5. `src/utils/teacher-panel-utils.ts` ✅
6. `docs/isletme-paneli-dokumantasyonu.md` ✅

Tüm dosyalar commit edildi ve push yapıldı!
