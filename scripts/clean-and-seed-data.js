const { createClient } = require('@supabase/supabase-js')
const crypto = require('crypto')
require('dotenv').config()

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// UUID generator function
function generateUUID() {
  return crypto.randomUUID()
}

async function cleanAndSeedData() {
  console.log('🧹 Veri Temizleme ve Mock Veri Oluşturma Sistemi')
  console.log('════════════════════════════════════════════════════════════════')
  console.log('⚠️  Admin kullanıcıları ve sistem ayarları korunacak')
  console.log('🔄 Diğer tüm veriler silinip yeniden oluşturulacak')
  console.log()
  
  try {
    // 1. Veri temizleme (admin kullanıcıları ve ayarlar hariç)
    console.log('🧹 1. Mevcut veriler temizleniyor...')
    await cleanExistingData()
    
    // 2. Temel yapı verilerini oluştur
    console.log('🏗️  2. Temel yapı verileri oluşturuluyor...')
    await createBaseStructure()
    
    // 3. Öğretmen verilerini oluştur
    console.log('👨‍🏫 3. Öğretmen verileri oluşturuluyor...')
    await createTeacherData()
    
    // 4. İşletme verilerini oluştur
    console.log('🏢 4. İşletme verileri oluşturuluyor...')
    await createCompanyData()
    
    // 5. Öğrenci verilerini oluştur
    console.log('👨‍🎓 5. Öğrenci verileri oluşturuluyor...')
    await createStudentData()
    
    // 6. Staj verilerini oluştur
    console.log('📋 6. Staj verileri oluşturuluyor...')
    await createInternshipData()
    
    // 7. Dekont verilerini oluştur
    console.log('💰 7. Dekont verileri oluşturuluyor...')
    await createDocumentData()
    
    console.log('\n✅ Veri temizleme ve mock veri oluşturma tamamlandı!')
    console.log('📊 Oluşturulan veri özeti:')
    await showDataSummary()
    
  } catch (error) {
    console.error('❌ Hata:', error)
    process.exit(1)
  }
}

async function cleanExistingData() {
  // Foreign key constraint'leri gözeterek sırayla silme
  
  console.log('   📦 Dekont verileri siliniyor...')
  const { error: dekontError } = await supabase.from('dekontlar').delete().gte('created_at', '1900-01-01')
  if (dekontError && dekontError.code !== 'PGRST116') console.error('Dekont silme hatası:', dekontError)
  
  console.log('   📋 Staj verileri siliniyor...')
  const { error: stajError } = await supabase.from('stajlar').delete().gte('created_at', '1900-01-01')
  if (stajError && stajError.code !== 'PGRST116') console.error('Staj silme hatası:', stajError)
  
  console.log('   👨‍🎓 Öğrenci verileri siliniyor...')
  const { error: ogrenciError } = await supabase.from('ogrenciler').delete().gte('created_at', '1900-01-01')
  if (ogrenciError && ogrenciError.code !== 'PGRST116') console.error('Öğrenci silme hatası:', ogrenciError)
  
  console.log('   🏢 İşletme verileri siliniyor...')
  const { error: isletmeError } = await supabase.from('isletmeler').delete().gte('created_at', '1900-01-01')
  if (isletmeError && isletmeError.code !== 'PGRST116') console.error('İşletme silme hatası:', isletmeError)
  
  console.log('   👨‍🏫 Öğretmen verileri siliniyor...')
  const { error: ogretmenError } = await supabase.from('ogretmenler').delete().gte('created_at', '1900-01-01')
  if (ogretmenError && ogretmenError.code !== 'PGRST116') console.error('Öğretmen silme hatası:', ogretmenError)
  
  console.log('   📚 Sınıf verileri siliniyor...')
  const { error: sinifError } = await supabase.from('siniflar').delete().gte('ad', '')
  if (sinifError && sinifError.code !== 'PGRST116') console.error('Sınıf silme hatası:', sinifError)
  
  // Alan ve eğitim yılı verilerini silmiyoruz - mevcut olanları kullanacağız
  console.log('   ✅ Veri temizleme tamamlandı (alanlar ve eğitim yılı korundu)')
}

async function createBaseStructure() {
  // Eğitim yılı oluştur veya mevcut olanı kullan
  console.log('   📅 Eğitim yılı kontrol ediliyor...')
  let { data: egitimYili } = await supabase
    .from('egitim_yillari')
    .select('*')
    .eq('yil', '2024-2025')
    .single()
  
  if (!egitimYili) {
    console.log('   📅 Eğitim yılı oluşturuluyor...')
    const { data: newEgitimYili } = await supabase
      .from('egitim_yillari')
      .insert({
        yil: '2024-2025',
        aktif: true,
        baslangic_tarihi: '2024-09-01',
        bitis_tarihi: '2025-06-30'
      })
      .select()
      .single()
    egitimYili = newEgitimYili
  }
  
  // Mevcut alanları kontrol et
  console.log('   🎯 Mevcut alanlar kontrol ediliyor...')
  let { data: createdAlanlar } = await supabase
    .from('alanlar')
    .select('*')
  
  if (!createdAlanlar || createdAlanlar.length === 0) {
    console.log('   🎯 Alanlar oluşturuluyor...')
    const alanlar = [
      { ad: 'Bilişim Teknolojileri', aktif: true },
      { ad: 'Muhasebe ve Finansman', aktif: true },
      { ad: 'Pazarlama ve Perakende', aktif: true },
      { ad: 'Sağlık Hizmetleri', aktif: true },
      { ad: 'Turizm ve Otelcilik', aktif: true },
      { ad: 'Endüstriyel Otomasyon', aktif: true }
    ]
    
    const { data: newAlanlar } = await supabase
      .from('alanlar')
      .insert(alanlar)
      .select()
    
    createdAlanlar = newAlanlar
  } else {
    console.log(`   ✅ ${createdAlanlar.length} mevcut alan kullanılacak`)
  }
  
  // Her alan için sınıflar oluştur
  console.log('   📚 Sınıflar oluşturuluyor...')
  const siniflar = []
  
  for (const alan of createdAlanlar || []) {
    // Her alan için 11A, 11B, 12A, 12B sınıfları
    const alanKodu = alan.ad.split(' ')[0].substring(0, 2).toUpperCase() // İlk iki harf
    const alanSiniflari = [
      { ad: `${alanKodu}-11A`, seviye: 11, sube: 'A', alan_id: alan.id },
      { ad: `${alanKodu}-11B`, seviye: 11, sube: 'B', alan_id: alan.id },
      { ad: `${alanKodu}-12A`, seviye: 12, sube: 'A', alan_id: alan.id },
      { ad: `${alanKodu}-12B`, seviye: 12, sube: 'B', alan_id: alan.id }
    ]
    siniflar.push(...alanSiniflari)
  }
  
  const { data: createdSiniflar, error: sinifError } = await supabase.from('siniflar').insert(siniflar).select()
  
  if (sinifError) {
    console.error('   ❌ Sınıf oluşturma hatası:', sinifError)
    throw sinifError
  }
  
  console.log(`   ✅ ${createdSiniflar?.length || 0} sınıf oluşturuldu`)
  
  return { egitimYili, alanlar: createdAlanlar }
}

async function createTeacherData() {
  // Gerçekçi öğretmen isimleri
  const ogretmenler = [
    { ad: 'Mehmet', soyad: 'Yılmaz', pin: '1234', telefon: '0532 123 4567', email: 'mehmet.yilmaz@okul.edu.tr' },
    { ad: 'Ayşe', soyad: 'Demir', pin: '5678', telefon: '0532 234 5678', email: 'ayse.demir@okul.edu.tr' },
    { ad: 'Ahmet', soyad: 'Kaya', pin: '9012', telefon: '0532 345 6789', email: 'ahmet.kaya@okul.edu.tr' },
    { ad: 'Fatma', soyad: 'Çelik', pin: '3456', telefon: '0532 456 7890', email: 'fatma.celik@okul.edu.tr' },
    { ad: 'Ali', soyad: 'Doğan', pin: '7890', telefon: '0532 567 8901', email: 'ali.dogan@okul.edu.tr' },
    { ad: 'Zeynep', soyad: 'Özkan', pin: '2345', telefon: '0532 678 9012', email: 'zeynep.ozkan@okul.edu.tr' },
    { ad: 'Mustafa', soyad: 'Arslan', pin: '6789', telefon: '0532 789 0123', email: 'mustafa.arslan@okul.edu.tr' },
    { ad: 'Elif', soyad: 'Güneş', pin: '0123', telefon: '0532 890 1234', email: 'elif.gunes@okul.edu.tr' },
    { ad: 'Hasan', soyad: 'Kurt', pin: '4567', telefon: '0532 901 2345', email: 'hasan.kurt@okul.edu.tr' },
    { ad: 'Sinem', soyad: 'Erdoğan', pin: '8901', telefon: '0532 012 3456', email: 'sinem.erdogan@okul.edu.tr' },
    { ad: 'İbrahim', soyad: 'Aydın', pin: '2468', telefon: '0532 123 4567', email: 'ibrahim.aydin@okul.edu.tr' },
    { ad: 'Burcu', soyad: 'Koç', pin: '1357', telefon: '0532 234 5678', email: 'burcu.koc@okul.edu.tr' },
    { ad: 'Osman', soyad: 'Şahin', pin: '9753', telefon: '0532 345 6789', email: 'osman.sahin@okul.edu.tr' },
    { ad: 'Pınar', soyad: 'Yıldız', pin: '8642', telefon: '0532 456 7890', email: 'pinar.yildiz@okul.edu.tr' },
    { ad: 'Erdem', soyad: 'Aslan', pin: '7531', telefon: '0532 567 8901', email: 'erdem.aslan@okul.edu.tr' }
  ]
  
  // Alanları al
  const { data: alanlar } = await supabase.from('alanlar').select('*')
  
  if (!alanlar || alanlar.length === 0) {
    console.error('   ❌ Alanlar bulunamadı!')
    throw new Error('Alanlar bulunamadı')
  }
  
  // Her öğretmene alan atama
  const ogretmenlerWithAlan = ogretmenler.map((ogretmen, index) => ({
    ...ogretmen,
    alan_id: alanlar[index % alanlar.length].id,
    aktif: true,
    uuid_id: generateUUID()
  }))
  
  const { data: createdOgretmenler, error: teacherError } = await supabase
    .from('ogretmenler')
    .insert(ogretmenlerWithAlan)
    .select()
  
  if (teacherError) {
    console.error('   ❌ Öğretmen oluşturma hatası:', teacherError)
    throw teacherError
  }
  
  console.log(`   ✅ ${createdOgretmenler?.length || 0} öğretmen oluşturuldu`)
  return createdOgretmenler
}

async function createCompanyData() {
  // Gerçekçi işletme isimleri
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
  
  // Öğretmenleri al (koordinatör olarak atanacak)
  const { data: ogretmenler } = await supabase.from('ogretmenler').select('*')
  
  // Her işletmeye koordinatör atama
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
  
  const { data: createdIsletmeler } = await supabase
    .from('isletmeler')
    .insert(isletmelerWithCoordinator)
    .select()
  
  console.log(`   ✅ ${createdIsletmeler.length} işletme oluşturuldu`)
  return createdIsletmeler
}

async function createStudentData() {
  // Gerçekçi öğrenci isimleri
  const isimler = [
    'Ahmet', 'Mehmet', 'Mustafa', 'Ali', 'Hasan', 'Hüseyin', 'İbrahim', 'Osman', 'Erdem', 'Burak',
    'Ayşe', 'Fatma', 'Zeynep', 'Elif', 'Sinem', 'Pınar', 'Burcu', 'Esra', 'Derya', 'Gizem',
    'Emre', 'Cem', 'Onur', 'Berk', 'Kaan', 'Arda', 'Mert', 'Yusuf', 'Kerem', 'Efe',
    'Duru', 'Asel', 'Defne', 'Ela', 'Nisa', 'Ecrin', 'Sude', 'İrem', 'Zümra', 'Eymen'
  ]
  
  const soyadlar = [
    'Yılmaz', 'Demir', 'Kaya', 'Çelik', 'Doğan', 'Özkan', 'Arslan', 'Güneş', 'Kurt', 'Erdoğan',
    'Aydın', 'Koç', 'Şahin', 'Yıldız', 'Aslan', 'Özdemir', 'Kara', 'Öztürk', 'Çakır', 'Ateş'
  ]
  
  // Sınıfları al
  const { data: siniflar, error: siniflarError } = await supabase.from('siniflar').select('*')
  
  if (siniflarError) {
    console.error('   ❌ Sınıf verileri alınamadı:', siniflarError)
    throw siniflarError
  }
  
  if (!siniflar || siniflar.length === 0) {
    console.error('   ❌ Hiç sınıf bulunamadı!')
    throw new Error('Sınıf verileri bulunamadı')
  }
  
  console.log(`   📚 ${siniflar.length} sınıf bulundu`)
  
  const ogrenciler = []
  let tcCounter = 20000000000
  
  // Her sınıf için 15-20 öğrenci oluştur
  for (const sinif of siniflar) {
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
  
  const { data: createdOgrenciler, error: studentError } = await supabase
    .from('ogrenciler')
    .insert(ogrenciler)
    .select()
  
  if (studentError) {
    console.error('   ❌ Öğrenci oluşturma hatası:', studentError)
    throw studentError
  }
  
  console.log(`   ✅ ${createdOgrenciler?.length || 0} öğrenci oluşturuldu`)
  return createdOgrenciler
}

async function createInternshipData() {
  // Gerekli verileri al
  const { data: ogrenciler } = await supabase.from('ogrenciler').select('*')
  const { data: isletmeler } = await supabase.from('isletmeler').select('*')
  const { data: ogretmenler } = await supabase.from('ogretmenler').select('*')
  
  const stajlar = []
  
  // Her öğrenci için staj kaydı oluştur
  for (const ogrenci of ogrenciler) {
    const randomIsletme = isletmeler[Math.floor(Math.random() * isletmeler.length)]
    const randomOgretmen = ogretmenler[Math.floor(Math.random() * ogretmenler.length)]
    
    // Staj tarihleri (2024-2025 eğitim yılı içinde)
    const baslangicTarihi = new Date('2024-09-15')
    const bitisTarihi = new Date('2025-06-15')
    
    stajlar.push({
      ogrenci_id: ogrenci.id,
      isletme_id: randomIsletme.id,
      ogretmen_id: randomOgretmen.id,
      baslangic_tarihi: baslangicTarihi.toISOString().split('T')[0],
      bitis_tarihi: bitisTarihi.toISOString().split('T')[0],
      durum: 'aktif'
    })
  }
  
  const { data: createdStajlar } = await supabase
    .from('stajlar')
    .insert(stajlar)
    .select()
  
  console.log(`   ✅ ${createdStajlar.length} staj kaydı oluşturuldu`)
  return createdStajlar
}

async function createDocumentData() {
  // Staj kayıtlarını al
  const { data: stajlar, error: stajError } = await supabase
    .from('stajlar')
    .select(`
      *,
      ogrenciler(ad, soyad, tc_no),
      isletmeler(ad, yetkili_kisi),
      ogretmenler(ad, soyad)
    `)
  
  if (stajError) {
    console.error('   ❌ Staj verileri alınamadı:', stajError)
    throw stajError
  }
  
  if (!stajlar || stajlar.length === 0) {
    console.error('   ❌ Staj verileri bulunamadı!')
    throw new Error('Staj verileri bulunamadı')
  }
  
  const dekontlar = []
  
  // Her staj için 2-4 dekont oluştur
  for (const staj of stajlar) {
    const dekontSayisi = Math.floor(Math.random() * 3) + 2 // 2-4 arası
    
    for (let i = 0; i < dekontSayisi; i++) {
      const ay = Math.floor(Math.random() * 9) + 1 // Eylül'den Mayıs'a
      const tarih = new Date(2024, ay, Math.floor(Math.random() * 28) + 1)
      
      const odemeSonTarihi = new Date(tarih)
      odemeSonTarihi.setDate(odemeSonTarihi.getDate() + 30) // 30 gün sonra son tarih
      
      dekontlar.push({
        staj_id: staj.id,
        ogrenci_id: staj.ogrenci_id,
        isletme_id: staj.isletme_id,
        ogretmen_id: staj.ogretmen_id,
        odeme_tarihi: tarih.toISOString().split('T')[0],
        odeme_son_tarihi: odemeSonTarihi.toISOString().split('T')[0],
        miktar: Math.floor(Math.random() * 500) + 100, // 100-600 TL arası
        aciklama: `${tarih.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' })} ayı staj ödemesi`,
        onay_durumu: Math.random() > 0.2 ? 'onaylandi' : 'bekliyor', // %80 onaylı, %20 bekliyor
        ay: tarih.getMonth() + 1,
        yil: tarih.getFullYear(),
        created_at: tarih.toISOString()
      })
    }
  }
  
  const { data: createdDekontlar, error: dekontError } = await supabase
    .from('dekontlar')
    .insert(dekontlar)
    .select()
  
  if (dekontError) {
    console.error('   ❌ Dekont oluşturma hatası:', dekontError)
    throw dekontError
  }
  
  console.log(`   ✅ ${createdDekontlar?.length || 0} dekont kaydı oluşturuldu`)
  return createdDekontlar
}

async function showDataSummary() {
  const { data: ogretmenler } = await supabase.from('ogretmenler').select('*')
  const { data: isletmeler } = await supabase.from('isletmeler').select('*')
  const { data: ogrenciler } = await supabase.from('ogrenciler').select('*')
  const { data: stajlar } = await supabase.from('stajlar').select('*')
  const { data: dekontlar } = await supabase.from('dekontlar').select('*')
  const { data: alanlar } = await supabase.from('alanlar').select('*')
  const { data: siniflar } = await supabase.from('siniflar').select('*')
  
  console.log(`   👨‍🏫 Öğretmenler: ${ogretmenler?.length || 0}`)
  console.log(`   🏢 İşletmeler: ${isletmeler?.length || 0}`)
  console.log(`   👨‍🎓 Öğrenciler: ${ogrenciler?.length || 0}`)
  console.log(`   📋 Stajlar: ${stajlar?.length || 0}`)
  console.log(`   💰 Dekontlar: ${dekontlar?.length || 0}`)
  console.log(`   🎯 Alanlar: ${alanlar?.length || 0}`)
  console.log(`   📚 Sınıflar: ${siniflar?.length || 0}`)
  
  // Koordinatör durumu
  const coordinatedCompanies = isletmeler?.filter(i => i.ogretmen_id).length || 0
  console.log(`   🤝 Koordinatörü olan işletmeler: ${coordinatedCompanies}`)
}

// Script çalıştırılırsa otomatik başlat
if (require.main === module) {
  cleanAndSeedData()
}

module.exports = { cleanAndSeedData }