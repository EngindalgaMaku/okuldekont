# "Meslek Alanları" Sayfası SSR Geçiş Planı

**Doküman Sürümü:** 1.0
**Tarih:** 15.07.2025

## 1. Mevcut Durum Analizi (`/admin/alanlar`)

Bu doküman, `/admin/alanlar` yolunda bulunan "Meslek Alanları" sayfasının mevcut yapısını analiz eder ve Server-Side Rendering (SSR) mimarisine geçiş için bir yol haritası sunar.

### 1.1. Mevcut Mimari: İstemci Taraflı Render (CSR)

- **Dosya:** `src/app/admin/alanlar/page.tsx`
- **Yönerge:** `'use client'`
- **Veri Çekme:** Sayfa yüklendikten sonra tarayıcıda, `useEffect` hook'u içinde `supabase.rpc('get_alan_stats')` çağrısı ile yapılır.
- **Durum Yönetimi:** `useState` hook'ları (`alanlar`, `loading`) ile yönetilir.
- **Render:** Veri çekme işlemi tamamlanana kadar bir "yükleniyor" animasyonu gösterilir. Veri geldikten sonra sayfa yeniden render edilir.

### 1.2. Mevcut Yapının Dezavantajları

- **Yavaş İlk Yükleme:** Kullanıcı, sayfanın tam içeriğini görmek için önce JavaScript'in yüklenmesini, ardından veri çekme işleminin tamamlanmasını beklemek zorundadır. Bu durum, yavaş bir ilk sayfa yükleme deneyimine (FCP/LCP) neden olur.
- **SEO Zafiyeti:** Arama motoru botları, sayfanın tam içeriğini görmek için JavaScript'i çalıştırmak zorunda kalabilir, bu da indekslemeyi olumsuz etkileyebilir.
- **Arayüz Kayması (Layout Shift):** Yükleniyor durumu ile nihai içerik arasında arayüzde kaymalar meydana gelebilir.

## 2. Hedef Mimari: Sunucu Taraflı Render (SSR)

Hedefimiz, bu sayfayı bir Sunucu Bileşeni (Server Component) haline getirerek veri çekme işlemini sunucu tarafında yapmaktır.

### 2.1. Önerilen Değişiklikler

- **`'use client'` Yönergesini Kaldırma:** Sayfanın ana bileşeni artık bir Sunucu Bileşeni olacaktır.
- **Sunucu Tarafında Veri Çekme:** Veri, sayfa render edilmeden önce sunucuda, `createClient` (sunucu istemcisi) kullanılarak doğrudan `get_alan_stats` RPC fonksiyonu çağrılarak çekilecektir.
- **`async/await` Kullanımı:** Sayfa bileşeni `async` olarak tanımlanacak ve veri çekme işlemi `await` ile beklenecektir.
- **Durum Yönetiminin Ortadan Kaldırılması:** `useState` ve `useEffect` hook'larına artık ihtiyaç kalmayacaktır. Veri, doğrudan bileşene `prop` olarak geçilecek veya bileşen içinde alınacaktır.
- **Yükleniyor Durumu:** Next.js'in dahili `loading.tsx` mekanizması kullanılarak daha akıcı bir yüklenme deneyimi sağlanabilir.

### 2.2. Yeni İş Akışı

1.  Kullanıcı `/admin/alanlar` sayfasına istekte bulunur.
2.  Next.js sunucusu, `AlanlarPage` sunucu bileşenini render etmeye başlar.
3.  Sunucu, `get_alan_stats` RPC fonksiyonunu çağırarak veritabanından alan verilerini çeker.
4.  Veri çekme işlemi tamamlandıktan sonra, sunucu bu verilerle birlikte sayfanın tam HTML'ini oluşturur.
5.  Oluşturulan tam HTML, tarayıcıya gönderilir.
6.  Kullanıcı, interaktif olmayan, tam render edilmiş bir sayfayı anında görür.

### 2.3. Avantajlar

- **Hızlı İlk Yükleme:** Kullanıcılar, sayfanın tam içeriğini anında görürler.
- **Gelişmiş SEO:** Arama motorları, sayfanın tam içeriğini içeren bir HTML aldığı için indeksleme daha verimli olur.
- **Daha Basit Kod:** `useState`, `useEffect` ve `loading` state'lerinin kaldırılmasıyla kod daha temiz ve yönetilebilir hale gelir.
- **Gelişmiş Güvenlik:** Veritabanı kimlik bilgileri ve sorguları sunucu tarafında kalır.

## 3. Geçiş Adımları

1.  **Yeni Dosya Oluşturma:** Mevcut `page.tsx` dosyasını silmeden, `page.ssr.tsx` adında yeni bir dosya oluşturulacak.
2.  **Sunucu Bileşeni Geliştirme:** `page.ssr.tsx` dosyası, yukarıda açıklanan SSR mimarisine göre geliştirilecek.
3.  **Karşılaştırma:** İki sayfa (`/admin/alanlar` ve geçici bir yolda `/admin/alanlar-ssr`) karşılaştırılarak tüm işlevlerin doğru çalıştığı teyit edilecek.
4.  **Nihai Değişiklik:** Onay alındıktan sonra, orijinal `page.tsx` silinecek ve `page.ssr.tsx` dosyasının adı `page.tsx` olarak değiştirilecek.

Bu plan, geçiş sürecini güvenli, kontrol edilebilir ve şeffaf bir şekilde yönetmemizi sağlayacaktır.