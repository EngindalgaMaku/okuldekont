# SSL Sorunları Çözüm Rehberi

## 1. Coolify Environment Variables Kontrol

Coolify dashboard'da environment variables şunları kontrol edin:

```env
# Production'da MUTLAKA HTTPS olmalı
NEXTAUTH_URL=https://ozdilek.run.place
NEXTAUTH_SECRET=güçlü-ve-uzun-bir-secret-key

# Node environment
NODE_ENV=production
```

## 2. SSL Certificate Durumu Kontrol

Coolify'da:
- Settings > SSL/TLS bölümünü kontrol edin
- Let's Encrypt certificate durumunu kontrol edin
- Certificate expiry date'ini kontrol edin

## 3. Domain Propagation Kontrol

Terminal'de test edin:
```bash
# SSL certificate'ı kontrol et
openssl s_client -connect ozdilek.run.place:443 -servername ozdilek.run.place

# DNS çözümleme kontrol et
nslookup ozdilek.run.place
```

## 4. Mixed Content Sorunları

### Browser Console Kontrol
- F12 > Console'da mixed content uyarıları var mı?
- Network tab'ında HTTP istekleri var mı?

### Kod Düzeltmeleri Gerekiyorsa:
- Tüm API çağrıları relative path kullanmalı: `/api/...`
- External resource'lar HTTPS olmalı
- `window.location.protocol` kullanarak dinamik URL oluşturun

## 5. NextAuth Callbacks URL

Eğer OAuth provider kullanıyorsanız:
- Callback URLs'de HTTPS domain olmalı
- Redirect URLs güncel olmalı

## 6. Coolify Restart İşlemleri

1. **Soft Restart**: Coolify dashboard'da "Restart" butonu
2. **Hard Restart**: Container'ı tamamen stop/start
3. **SSL Renewal**: SSL certificate'ı manuel olarak yenileyin

## 7. Geçici Workaround

Eğer sorun devam ederse, geçici olarak:
```javascript
// middleware.ts veya next.config.js
if (process.env.NODE_ENV === 'production') {
  // Force HTTPS redirect
  if (req.headers['x-forwarded-proto'] !== 'https') {
    return NextResponse.redirect(`https://${req.headers.host}${req.nextUrl.pathname}`)
  }
}
```

## 8. Monitoring ve Debug

Browser'da geliştirici araçlarında:
- Security tab'ını kontrol edin
- Certificate details'ı inceleyin
- Console'da SSL/TLS hataları arayın

## 9. Coolify Logs Kontrol

Coolify dashboard'da:
- Application logs'u kontrol edin
- Deployment logs'u kontrol edin
- SSL renewal logs'unu kontrol edin