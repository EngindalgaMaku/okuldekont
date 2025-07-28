# İşletme Ekleme Modal'ı İmplementasyon Planı

## Problem
İşletmeler sayfasında "Yeni İşletme" butonu `/admin/isletmeler/yeni` sayfasına yönlendiriyor ancak bu sayfa mevcut değil ve "Company not found" hatası veriyor. Bu işlemi modal olarak yapılması daha kullanıcı dostu olacak.

## Çözüm Planı

### 1. Modal State Yönetimi
`IsletmelerServerPrisma.tsx` dosyasında aşağıdaki state'leri ekle:
- `yeniIsletmeModalOpen: boolean` - Modal açık/kapalı durumu
- `createLoading: boolean` - Form submit loading durumu
- `availableTeachers: Teacher[]` - Koordinatör dropdown için öğretmen listesi

### 2. Form Data Interface
```typescript
interface YeniIsletmeFormData {
  name: string;
  contact: string;
  phone: string;
  email: string;
  address: string;
  taxNumber: string;
  teacherId: string;
  pin: string;
  usta_ogretici_ad: string;
  usta_ogretici_telefon: string;
}
```

### 3. Modal İçeriği (Tüm Alanlar)

#### Temel Bilgiler Bölümü:
- İşletme Adı (zorunlu)
- Yetkili Kişi (zorunlu)
- Telefon
- E-posta
- Adres

#### Teknik Bilgiler Bölümü:
- Vergi Numarası
- PIN Kodu (opsiyonel, otomatik generate edilir)
- Koordinatör Öğretmen (dropdown)

#### Usta Öğretici Bölümü:
- Usta Öğretici Ad Soyad
- Usta Öğretici Telefon

### 4. Fonksiyonlar

#### `fetchTeachers()`
- `/api/admin/teachers` endpoint'inden öğretmen listesini getir
- Modal açıldığında çağrıl

#### `handleCreateCompany()`
- Form validasyonu yap
- `/api/admin/companies` POST endpoint'ine request gönder
- Başarılı olursa:
  - Modal'ı kapat
  - Companies listesini yenile
  - Success toast göster
- Hata durumunda error toast göster

#### `handleOpenCreateModal()`
- Öğretmen listesini getir
- Form data'yı sıfırla
- Modal'ı aç

### 5. Değiştirilecek Kısımlar

#### Header Bölümü
"Yeni İşletme" butonu:
```typescript
// Mevcut:
<Link href="/admin/isletmeler/yeni" ...>

// Yeni:
<button onClick={() => handleOpenCreateModal()} ...>
```

### 6. Modal UI Tasarımı
- Responsive tasarım (mobile uyumlu)
- Loading states
- Form validation göstergeleri
- Error handling
- Mevcut tasarım diliyle uyumlu

### 7. API Integration
- POST `/api/admin/companies` - Yeni işletme oluşturma
- GET `/api/admin/teachers` - Koordinatör listesi

### 8. Validation Rules
- İşletme adı: zorunlu, min 2 karakter
- Yetkili kişi: zorunlu, min 2 karakter
- E-posta: ge��erli e-posta formatı (opsiyonel)
- PIN: 4 haneli sayı (opsiyonel)
- Telefon: Türk telefon format kontrolü (opsiyonel)

### 9. UX Improvements
- Form alanları arası tab navigation
- Enter tuşu ile form submit
- Escape tuşu ile modal kapatma
- Başarılı işlem sonrası modal kapatma ve liste yenileme

## Implementation Order
1. State'leri ve interface'leri ekle
2. Modal component'ini ekle
3. Form alanlarını yerleştir
4. Validation logic'ini implement et
5. API integration'ı yap
6. Loading states ve error handling ekle
7. UI polish ve responsive tasarım
8. Test ve debug

## Notes
- Mevcut Modal component'i (`@/components/ui/Modal`) kullanılacak
- Mevcut toast sistem (`react-hot-toast`) kullanılacak
- Mevcut tasarım patterns takip edilecek (gradient buttons, indigo theme, etc.)
- Form layout accordion'lardan ilham alınacak (sections halinde)