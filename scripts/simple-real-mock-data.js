const { createClient } = require('@supabase/supabase-js')
const crypto = require('crypto')
require('dotenv').config()

// .env.local dosyasından güvenli şekilde oku
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

function generateUUID() {
  return crypto.randomUUID()
}

async function createSimpleRealMockData() {
  console.log('🏗️  BASİT GERÇEK VERİTABANI MOCK VERİ OLUŞTURMA')
  console.log('URL: https://okuldb.run.place/')
  console.log('═══════════════════════════════════════════════')
  
  try {
    // 1. Basit öğretmen verileri oluştur
    console.log('👨‍🏫 Basit öğretmenler oluşturuluyor...')
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
    
    const { data: createdOgretmenler, error: teacherError } = await supabase
      .from('ogretmenler')
      .insert(ogretmenler)
      .select()
    
    if (teacherError) {
      console.error('❌ Öğretmen oluşturma hatası:', teacherError)
      throw teacherError
    }
    
    console.log(`✅ ${createdOgretmenler.length} öğretmen oluşturuldu`)
    
    // 2. Basit işletme verileri oluştur
    console.log('🏢 Basit işletmeler oluşturuluyor...')
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
    
    const { data: createdIsletmeler, error: companyError } = await supabase
      .from('isletmeler')
      .insert(isletmeler)
      .select()
    
    if (companyError) {
      console.error('❌ İşletme oluşturma hatası:', companyError)
      throw companyError
    }
    
    console.log(`✅ ${createdIsletmeler.length} işletme oluşturuldu`)
    
    console.log('\n✅ BASİT GERÇEK VERİTABANI MOCK VERİ OLUŞTURMA TAMAMLANDI!')
    console.log('\n📊 Oluşturulan veriler:')
    console.log(`   👨‍🏫 Öğretmenler: ${createdOgretmenler.length}`)
    console.log(`   🏢 İşletmeler: ${createdIsletmeler.length}`)
    
  } catch (error) {
    console.error('❌ Hata:', error)
  }
}

// Script çalıştır
createSimpleRealMockData()