const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://guqwqbxsfvddwwczwljp.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd1cXdxYnhzZnZkZHd3Y3p3bGpwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDY4OTQ2MCwiZXhwIjoyMDY2MjY1NDYwfQ.snDNh-cNBjEoLstTmE3U6loXPrhKydBoTG7BvP6BONQ'

const supabase = createClient(supabaseUrl, supabaseKey)

async function createDemoSeedData() {
  try {
    console.log('🔍 Mevcut alanları kontrol ediliyor...')
    
    // Mevcut alanları al
    const { data: alanlar, error: alanError } = await supabase
      .from('alanlar')
      .select('id, ad')
      .eq('aktif', true)
      .order('ad')
    
    if (alanError) throw alanError
    
    console.log('📚 Mevcut alanlar:')
    alanlar.forEach(alan => {
      console.log(`  - ${alan.ad} (${alan.id})`)
    })
    
    if (alanlar.length === 0) {
      console.error('❌ Hiç aktif alan bulunamadı!')
      return
    }
    
    console.log('\n🧹 Eski test verilerini temizleniyor...')
    
    // Eski test verilerini temizle
    await supabase.from('stajlar').delete().ilike('ogrenci_id', '%test%')
    await supabase.from('ogrenci_koordinatorleri').delete().ilike('ogrenci_id', '%test%')
    await supabase.from('ogrenciler').delete().ilike('no', 'TEST%')
    await supabase.from('isletmeler').delete().ilike('ad', 'Demo %')
    
    console.log('✅ Eski test verileri temizlendi')
    
    console.log('\n🏢 Demo işletmeleri oluşturuluyor...')
    
    // 25 demo işletme oluştur (unique test vergi numaraları ile)
    const demoIsletmeler = []
    const baseNames = [
      'Demo Teknoloji A.Ş.', 'Demo Yazılım Ltd.', 'Demo Elektrik San.', 'Demo Makine Fab.', 'Demo Otomotiv Ltd.',
      'Demo İnşaat A.Ş.', 'Demo Bilişim Tek.', 'Demo Elektronik San.', 'Demo Metal İşl.', 'Demo Grafik Stüdyo',
      'Demo Endüstri A.Ş.', 'Demo Sistem Ltd.', 'Demo Otomasyon', 'Demo Proje Müh.', 'Demo Sanayi Ltd.',
      'Demo Yazılım Evi', 'Demo Teknoloji Park', 'Demo Dijital Ajans', 'Demo Medya Grup', 'Demo İnovasyon Hub',
      'Demo Endüstri 4.0', 'Demo Akıllı Sistem', 'Demo Robotik Ltd.', 'Demo AI Solutions', 'Demo IoT Teknoloji'
    ]
    
    const yetkililer = [
      'Ahmet Yılmaz', 'Mehmet Kaya', 'Ali Demir', 'Fatma Öz', 'Ayşe Şahin',
      'Mustafa Çelik', 'Zeynep Aydın', 'Hasan Polat', 'Elif Korkmaz', 'Oğuz Arslan',
      'Selin Yurt', 'Cem Taş', 'Gül Kaya', 'Kemal Özkan', 'Pınar Güneş',
      'Burak Esen', 'Sevgi Acar', 'Emre Çiftçi', 'Deniz Altın', 'Ceren Beyaz',
      'Serkan Gri', 'Melisa Mor', 'Onur Pembe', 'Arda Mavi', 'Sıla Turuncu'
    ]
    
    const adresler = [
      'Maslak Mah. Teknoloji Sok. No:1 Şişli/İSTANBUL',
      'Levent Mah. Yazılım Cad. No:5 Beşiktaş/İSTANBUL',
      'Sanayi Mah. Elektrik Sok. No:10 Bayrampaşa/İSTANBUL',
      'OSB 3. Cadde No:15 Dudullu/İSTANBUL',
      'Otomotiv Sitesi A Blok No:20 Tuzla/İSTANBUL',
      'İnşaat Mah. Yapı Sok. No:25 Kadıköy/İSTANBUL',
      'Teknopark Kampüsü B Blok Pendik/İSTANBUL',
      'Elektronik Vadisi 1. Etap No:30 Gebze/KOCAELİ',
      'Metal Sanayi Sitesi C Blok Çerkezköy/TEKİRDAĞ',
      'Tasarım Mah. Sanat Sok. No:35 Beşiktaş/İSTANBUL',
      'Endüstri Mah. Fabrika Cad. No:40 Kartal/İSTANBUL',
      'Sistem Plaza Kat:5 Ümraniye/İSTANBUL',
      'Otomasyon Merkezi No:45 Maltepe/İSTANBUL',
      'Mühendislik Mah. Proje Sok. No:50 Ataşehir/İSTANBUL',
      'Sanayi Bölgesi 2. Cadde No:55 Çekmeköy/İSTANBUL',
      'Yazılım Mah. Kod Sok. No:60 Üsküdar/İSTANBUL',
      'Teknokent Kampüsü A Blok Sancaktepe/İSTANBUL',
      'Dijital Mah. Medya Cad. No:65 Şişli/İSTANBUL',
      'Medya Plaza Kat:10 Mecidiyeköy/İSTANBUL',
      'İnovasyon Merkezi No:70 Bakırköy/İSTANBUL',
      'Teknoloji Vadisi B Blok Bornova/İZMİR',
      'Akıllı Şehir Projesi Alsancak/İZMİR',
      'Robotik Mah. Otomasyon Cad. Karşıyaka/İZMİR',
      'Yapay Zeka Merkezi Çiğli/İZMİR',
      'IoT Campus Gaziemir/İZMİR'
    ]
    
    for (let i = 0; i < 25; i++) {
      // Unique test vergi numarası oluştur
      const vergiNo = `TEST${(i + 1).toString().padStart(6, '0')}`
      const telefonNo = `021${(2000000 + i * 111111).toString().slice(0, 7)}`
      const email = `test${i + 1}@demo.com`
      
      demoIsletmeler.push({
        ad: baseNames[i],
        yetkili_kisi: yetkililer[i],
        telefon: telefonNo,
        email: email,
        adres: adresler[i],
        vergi_no: vergiNo
      })
    }
    
    const { data: createdIsletmeler, error: isletmeError } = await supabase
      .from('isletmeler')
      .insert(demoIsletmeler)
      .select()
    
    if (isletmeError) throw isletmeError
    
    console.log(`✅ ${createdIsletmeler.length} demo işletme oluşturuldu`)
    
    console.log('\n👥 Demo öğrencileri oluşturuluyor...')
    
    // Türk isimleri
    const adlar = [
      'Ahmet', 'Mehmet', 'Ali', 'Mustafa', 'Hasan', 'İbrahim', 'Ömer', 'Yusuf', 'Murat', 'Emre',
      'Fatma', 'Ayşe', 'Emine', 'Hatice', 'Zeynep', 'Elif', 'Merve', 'Selin', 'Gizem', 'Büşra',
      'Oğuz', 'Cem', 'Kemal', 'Serkan', 'Burak', 'Onur', 'Arda', 'Deniz', 'Kaan', 'Berk',
      'Sıla', 'Ceren', 'Melisa', 'Pınar', 'Sevgi', 'Gül', 'Defne', 'İrem', 'Nazlı', 'Tuğba'
    ]
    
    const soyadlar = [
      'Yılmaz', 'Kaya', 'Demir', 'Şahin', 'Çelik', 'Aydın', 'Polat', 'Korkmaz', 'Arslan', 'Yurt',
      'Özkan', 'Güneş', 'Esen', 'Acar', 'Çiftçi', 'Altın', 'Beyaz', 'Gri', 'Mor', 'Pembe',
      'Mavi', 'Turuncu', 'Yeşil', 'Sarı', 'Kahverengi', 'Siyah', 'Lacivert', 'Bordo', 'Turkuaz', 'Eflatun',
      'Öz', 'Taş', 'Dağ', 'Deniz', 'Göl', 'Orman', 'Çayır', 'Bahçe', 'Park', 'Sokak'
    ]
    
    console.log('\n📚 Demo sınıfları oluşturuluyor...')
    
    // Her alan için 12A, 12B, 12C sınıfları oluştur (sadece 12. sınıflar staj yapıyor)
    const demoSiniflar = []
    const sinifAdlari = ['12A', '12B', '12C']
    
    for (const alan of alanlar) {
      for (const sinifAd of sinifAdlari) {
        demoSiniflar.push({
          ad: `Demo ${sinifAd}`,
          alan_id: alan.id,
          aktif: true
        })
      }
    }
    
    const { data: createdSiniflar, error: sinifError } = await supabase
      .from('siniflar')
      .insert(demoSiniflar)
      .select()
    
    if (sinifError) {
      // Eğer sınıflar zaten varsa devam et
      console.log('⚠️ Sınıf oluşturma uyarısı:', sinifError.message)
    } else {
      console.log(`✅ ${createdSiniflar.length} demo sınıf oluşturuldu`)
    }
    
    // Mevcut sınıfları al (hem eski hem yeni)
    const { data: mevcutSiniflar, error: sinifListError } = await supabase
      .from('siniflar')
      .select('id, ad, alan_id')
      .ilike('ad', '%12%') // Sadece 12. sınıfları al
    
    if (sinifListError) throw sinifListError
    
    console.log(`📋 Toplam ${mevcutSiniflar.length} adet 12. sınıf bulundu`)
    
    // 100 öğrenci oluştur (sadece 12. sınıflara)
    const demoOgrenciler = []
    
    for (let i = 1; i <= 100; i++) {
      const ad = adlar[Math.floor(Math.random() * adlar.length)]
      const soyad = soyadlar[Math.floor(Math.random() * soyadlar.length)]
      
      // Rastgele bir alan seç
      const alanIndex = Math.floor(Math.random() * alanlar.length)
      const alan = alanlar[alanIndex]
      
      // Bu alana ait 12. sınıfları filtrele
      const alanSiniflari = mevcutSiniflar.filter(s => s.alan_id === alan.id)
      
      if (alanSiniflari.length === 0) {
        // Eğer bu alanın sınıfı yoksa genel bir 12. sınıf seç
        const genelSinif = mevcutSiniflar[Math.floor(Math.random() * mevcutSiniflar.length)]
        
        demoOgrenciler.push({
          no: `TEST${i.toString().padStart(3, '0')}`,
          ad: ad,
          soyad: soyad,
          sinif: genelSinif.ad,
          alan_id: alan.id
        })
      } else {
        // Bu alana ait rastgele bir 12. sınıf seç
        const seciliSinif = alanSiniflari[Math.floor(Math.random() * alanSiniflari.length)]
        
        demoOgrenciler.push({
          no: `TEST${i.toString().padStart(3, '0')}`,
          ad: ad,
          soyad: soyad,
          sinif: seciliSinif.ad,
          alan_id: alan.id
        })
      }
    }
    
    const { data: createdOgrenciler, error: ogrenciError } = await supabase
      .from('ogrenciler')
      .insert(demoOgrenciler)
      .select()
    
    if (ogrenciError) throw ogrenciError
    
    console.log(`✅ ${createdOgrenciler.length} demo öğrenci oluşturuldu`)
    
    console.log('\n📊 Demo veri özeti:')
    console.log(`  - ${createdIsletmeler.length} işletme`)
    console.log(`  - ${createdOgrenciler.length} öğrenci`)
    console.log(`  - ${alanlar.length} alan (mevcut)`)
    
    // Alan bazında öğrenci dağılımı
    console.log('\n📈 Alan bazında öğrenci dağılımı:')
    const alanDagilim = {}
    createdOgrenciler.forEach(ogrenci => {
      const alan = alanlar.find(a => a.id === ogrenci.alan_id)
      if (alan) {
        alanDagilim[alan.ad] = (alanDagilim[alan.ad] || 0) + 1
      }
    })
    
    Object.entries(alanDagilim).forEach(([alanAd, sayi]) => {
      console.log(`  - ${alanAd}: ${sayi} öğrenci`)
    })
    
    console.log('\n🎉 Demo seed verisi başarıyla oluşturuldu!')
    console.log('💡 Test bitince tüm "Demo" ve "TEST" verilerini silebilirsiniz.')
    
  } catch (error) {
    console.error('❌ Hata:', error.message)
  }
}

createDemoSeedData()