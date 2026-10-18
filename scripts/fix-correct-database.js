const { createClient } = require('@supabase/supabase-js')
const crypto = require('crypto')

// .env.local dosyasını açıkça oku
require('dotenv').config({ path: '.env.local' })

// Uygulamanın kullandığı aynı veritabanına bağlan
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

console.log('🔧 DOĞRU VERİTABANINA MOCK VERİ YÜKLENİYOR')
console.log('URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)
console.log('═══════════════════════════════════════════════')

function generateUUID() {
  return crypto.randomUUID()
}

async function fixCorrectDatabase() {
  try {
    // 1. Önce mevcut durumu kontrol et
    console.log('📊 Mevcut veri durumu:')
    const tables = ['ogretmenler', 'ogrenciler', 'stajlar', 'isletmeler', 'alanlar']
    for (const table of tables) {
      const { count } = await supabase.from(table).select('*', { count: 'exact', head: true })
      console.log(`   ${table}: ${count} kayıt`)
    }

    // 2. Alanları kontrol et
    let { data: alanlar } = await supabase.from('alanlar').select('*')
    
    if (!alanlar || alanlar.length === 0) {
      console.log('🎯 Alanlar oluşturuluyor...')
      const { data: newAlanlar } = await supabase
        .from('alanlar')
        .insert([
          { ad: 'Bilişim Teknolojileri', aktif: true },
          { ad: 'Muhasebe ve Finansman', aktif: true },
          { ad: 'Pazarlama ve Perakende', aktif: true },
          { ad: 'Sağlık Hizmetleri', aktif: true },
          { ad: 'Turizm ve Otelcilik', aktif: true },
          { ad: 'Endüstriyel Otomasyon', aktif: true }
        ])
        .select()
      alanlar = newAlanlar
      console.log(`   ✅ ${alanlar.length} alan oluşturuldu`)
    }

    // 3. Mevcut öğretmenlere alan ata
    const { data: ogretmenler } = await supabase.from('ogretmenler').select('*')
    if (ogretmenler && ogretmenler.length > 0) {
      console.log('👨‍🏫 Öğretmenlere alanlar atanıyor...')
      for (let i = 0; i < ogretmenler.length; i++) {
        const ogretmen = ogretmenler[i]
        const alan = alanlar[i % alanlar.length]
        
        await supabase
          .from('ogretmenler')
          .update({ alan_id: alan.id })
          .eq('id', ogretmen.id)
      }
      console.log(`   ✅ ${ogretmenler.length} öğretmene alan atandı`)
    }

    // 4. Sınıflar oluştur
    console.log('📚 Sınıflar oluşturuluyor...')
    const siniflar = []
    for (const alan of alanlar) {
      const alanKodu = alan.ad.split(' ')[0].substring(0, 2).toUpperCase()
      siniflar.push(
        { ad: `${alanKodu}-11A`, seviye: 11, sube: 'A', alan_id: alan.id },
        { ad: `${alanKodu}-11B`, seviye: 11, sube: 'B', alan_id: alan.id },
        { ad: `${alanKodu}-12A`, seviye: 12, sube: 'A', alan_id: alan.id },
        { ad: `${alanKodu}-12B`, seviye: 12, sube: 'B', alan_id: alan.id }
      )
    }
    
    const { data: createdSiniflar } = await supabase.from('siniflar').insert(siniflar).select()
    console.log(`   ✅ ${createdSiniflar.length} sınıf oluşturuldu`)

    // 5. İşletmeler oluştur
    console.log('🏢 İşletmeler oluşturuluyor...')
    const isletmeler = [
      { ad: 'TechSoft Bilişim Ltd.', yetkili_kisi: 'Murat Özdemir', pin: '1001', telefon: '0212 123 4567', email: 'info@techsoft.com.tr' },
      { ad: 'Digital Solutions A.Ş.', yetkili_kisi: 'Elif Kaya', pin: '1002', telefon: '0212 234 5678', email: 'info@digitalsolutions.com.tr' },
      { ad: 'Akıllı Sistemler Ltd.', yetkili_kisi: 'Ahmet Yılmaz', pin: '1003', telefon: '0212 345 6789', email: 'info@akillisistemler.com.tr' },
      { ad: 'Güven Muhasebe Ofisi', yetkili_kisi: 'Fatma Demir', pin: '1004', telefon: '0212 456 7890', email: 'info@guvenmuhasebe.com.tr' },
      { ad: 'Başarı Finansman A.Ş.', yetkili_kisi: 'Mehmet Çelik', pin: '1005', telefon: '0212 567 8901', email: 'info@basarifinans.com.tr' },
      { ad: 'Elit Pazarlama Ltd.', yetkili_kisi: 'Zeynep Arslan', pin: '1006', telefon: '0212 678 9012', email: 'info@elitpazarlama.com.tr' },
      { ad: 'Modern Perakende A.Ş.', yetkili_kisi: 'Ali Güneş', pin: '1007', telefon: '0212 789 0123', email: 'info@modernperakende.com.tr' },
      { ad: 'Sağlık Plus Hastanesi', yetkili_kisi: 'Dr. Ayşe Kurt', pin: '1008', telefon: '0212 890 1234', email: 'info@saglikplus.com.tr' },
      { ad: 'Medikal Hizmetler Ltd.', yetkili_kisi: 'Hasan Erdoğan', pin: '1009', telefon: '0212 901 2345', email: 'info@medikalhizmetler.com.tr' },
      { ad: 'Grand Otel Istanbul', yetkili_kisi: 'Sinem Aydın', pin: '1010', telefon: '0212 012 3456', email: 'info@grandoteltr.com' },
      { ad: 'Turizm Dünyası A.Ş.', yetkili_kisi: 'İbrahim Koç', pin: '1011', telefon: '0212 123 4567', email: 'info@turizmduyasi.com.tr' },
      { ad: 'Endüstri Teknik Ltd.', yetkili_kisi: 'Burcu Şahin', pin: '1012', telefon: '0212 234 5678', email: 'info@endustri.com.tr' },
      { ad: 'Otomasyon Sistemleri A.Ş.', yetkili_kisi: 'Osman Yıldız', pin: '1013', telefon: '0212 345 6789', email: 'info@otomasyonsistem.com.tr' },
      { ad: 'Profesyonel Yazılım Ltd.', yetkili_kisi: 'Pınar Aslan', pin: '1014', telefon: '0212 456 7890', email: 'info@proftware.com.tr' },
      { ad: 'Yenilikçi Teknoloji A.Ş.', yetkili_kisi: 'Erdem Özkan', pin: '1015', telefon: '0212 567 8901', email: 'info@yenilikcitek.com.tr' }
    ]

    const isletmelerWithCoordinator = isletmeler.map((isletme, index) => ({
      ...isletme,
      ogretmen_id: ogretmenler[index % ogretmenler.length].id,
      uuid_id: generateUUID(),
      adres: `${isletme.ad} Merkez Ofisi, İstanbul`,
      vergi_numarasi: `${1000000000 + index}`,
      faaliyet_alani: 'Teknoloji ve Eğitim',
      calisan_sayisi: Math.floor(Math.random() * 100) + 10,
      katki_payi_talebi: Math.random() > 0.5
    }))

    const { data: createdIsletmeler } = await supabase.from('isletmeler').insert(isletmelerWithCoordinator).select()
    console.log(`   ✅ ${createdIsletmeler.length} işletme oluşturuldu`)

    // 6. Öğrenciler oluştur
    console.log('👨‍🎓 Öğrenciler oluşturuluyor...')
    const isimler = ['Ahmet', 'Mehmet', 'Mustafa', 'Ali', 'Ayşe', 'Fatma', 'Zeynep', 'Elif', 'Emre', 'Cem']
    const soyadlar = ['Yılmaz', 'Demir', 'Kaya', 'Çelik', 'Doğan', 'Özkan', 'Arslan', 'Güneş', 'Kurt', 'Erdoğan']
    
    const ogrenciler = []
    let tcCounter = 20000000000
    
    for (const sinif of createdSiniflar) {
      const ogrenciSayisi = Math.floor(Math.random() * 6) + 15 // 15-20 arası
      
      for (let i = 0; i < ogrenciSayisi; i++) {
        const isim = isimler[Math.floor(Math.random() * isimler.length)]
        const soyad = soyadlar[Math.floor(Math.random() * soyadlar.length)]
        
        ogrenciler.push({
          ad: isim,
          soyad: soyad,
          tc_no: `${tcCounter++}`,
          sinif: sinif.ad,
          no: i + 1,
          telefon: `053${Math.floor(Math.random() * 9)}${Math.floor(Math.random() * 1000000).toString().padStart(6, '0')}`,
          email: `${isim.toLowerCase()}.${soyad.toLowerCase()}@ogrenci.edu.tr`,
          veli_adi: `${isim} Veli`,
          veli_telefon: `053${Math.floor(Math.random() * 9)}${Math.floor(Math.random() * 1000000).toString().padStart(6, '0')}`,
          sinif_id: sinif.id,
          alan_id: sinif.alan_id,
          uuid_id: generateUUID()
        })
      }
    }

    const { data: createdOgrenciler } = await supabase.from('ogrenciler').insert(ogrenciler).select()
    console.log(`   ✅ ${createdOgrenciler.length} öğrenci oluşturuldu`)

    // 7. Stajlar oluştur
    console.log('📋 Stajlar oluşturuluyor...')
    const stajlar = []
    
    for (const ogrenci of createdOgrenciler) {
      const randomIsletme = createdIsletmeler[Math.floor(Math.random() * createdIsletmeler.length)]
      const randomOgretmen = ogretmenler[Math.floor(Math.random() * ogretmenler.length)]
      
      stajlar.push({
        ogrenci_id: ogrenci.id,
        isletme_id: randomIsletme.id,
        ogretmen_id: randomOgretmen.id,
        baslangic_tarihi: '2024-09-15',
        bitis_tarihi: '2025-06-15',
        durum: 'aktif'
      })
    }

    const { data: createdStajlar } = await supabase.from('stajlar').insert(stajlar).select()
    console.log(`   ✅ ${createdStajlar.length} staj kaydı oluşturuldu`)

    console.log('\n✅ DOĞRU VERİTABANINA MOCK VERİ YÜKLEMESİ TAMAMLANDI!')
    console.log('📊 Final durumu:')
    console.log(`   🎯 Alanlar: ${alanlar.length}`)
    console.log(`   📚 Sınıflar: ${createdSiniflar.length}`)
    console.log(`   👨‍🏫 Öğretmenler: ${ogretmenler.length} (alanlı)`)
    console.log(`   🏢 İşletmeler: ${createdIsletmeler.length}`)
    console.log(`   👨‍🎓 Öğrenciler: ${createdOgrenciler.length}`)
    console.log(`   📋 Stajlar: ${createdStajlar.length}`)

  } catch (error) {
    console.error('❌ Hata:', error)
    process.exit(1)
  }
}

fixCorrectDatabase()