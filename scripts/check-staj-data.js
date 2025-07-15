const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://okuldb.run.place/'
const supabaseKey = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc1MjQ0ODM4MCwiZXhwIjo0OTA4MTIxOTgwLCJyb2xlIjoiYW5vbiJ9.RPfSXqTiO_iS6d0VZr_HY1nEOxMTdiTursH8KZbF1uA'

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkStajData() {
  try {
    // Bilişim Teknolojileri alan ID'si
    const alanId = 'e42072df-40cf-4419-8e03-4f33cee6dc0c'
    
    console.log('=== STAJ VERİLERİ KONTROLÜ ===')
    console.log('Alan ID:', alanId)
    
    // 1. Bu alandaki öğrencileri getir
    const { data: ogrenciler, error: ogrenciError } = await supabase
      .from('ogrenciler')
      .select('id, ad, soyad, no, alan_id')
      .eq('alan_id', alanId)
    
    if (ogrenciError) {
      console.error('Öğrenci verisi alınırken hata:', ogrenciError)
      return
    }
    
    console.log('\n=== ÖĞRENCİLER ===')
    console.log(`Bu alanda ${ogrenciler.length} öğrenci bulundu:`)
    ogrenciler.forEach((ogrenci, index) => {
      console.log(`${index + 1}. ${ogrenci.ad} ${ogrenci.soyad} (${ogrenci.no}) - ID: ${ogrenci.id}`)
    })
    
    // 2. Tüm staj verilerini getir
    const { data: tumStajlar, error: tumStajError } = await supabase
      .from('stajlar')
      .select('*')
    
    if (tumStajError) {
      console.error('Staj verisi alınırken hata:', tumStajError)
      return
    }
    
    console.log('\n=== TÜM STAJLAR ===')
    console.log(`Toplam ${tumStajlar.length} staj kaydı bulundu:`)
    tumStajlar.forEach((staj, index) => {
      console.log(`${index + 1}. Öğrenci ID: ${staj.ogrenci_id}, İşletme ID: ${staj.isletme_id}, Durum: ${staj.durum}`)
    })
    
    // 3. Bu alandaki öğrencilerin stajlarını getir
    const ogrenciIds = ogrenciler.map(o => o.id)
    const { data: alanStajlari, error: alanStajError } = await supabase
      .from('stajlar')
      .select('*')
      .in('ogrenci_id', ogrenciIds)
    
    if (alanStajError) {
      console.error('Alan stajları alınırken hata:', alanStajError)
      return
    }
    
    console.log('\n=== BU ALANDAKİ ÖĞRENCİLERİN STAJLARI ===')
    console.log(`Bu alandaki öğrencilerin ${alanStajlari.length} staj kaydı bulundu:`)
    alanStajlari.forEach((staj, index) => {
      const ogrenci = ogrenciler.find(o => o.id === staj.ogrenci_id)
      console.log(`${index + 1}. ${ogrenci?.ad} ${ogrenci?.soyad} - İşletme ID: ${staj.isletme_id}, Durum: ${staj.durum}`)
    })
    
    // 4. Aktif stajları getir
    const { data: aktifStajlar, error: aktifError } = await supabase
      .from('stajlar')
      .select('*')
      .in('ogrenci_id', ogrenciIds)
      .eq('durum', 'aktif')
    
    if (aktifError) {
      console.error('Aktif stajlar alınırken hata:', aktifError)
      return
    }
    
    console.log('\n=== AKTİF STAJLAR ===')
    console.log(`Bu alandaki öğrencilerin ${aktifStajlar.length} aktif staj kaydı bulundu:`)
    aktifStajlar.forEach((staj, index) => {
      const ogrenci = ogrenciler.find(o => o.id === staj.ogrenci_id)
      console.log(`${index + 1}. ${ogrenci?.ad} ${ogrenci?.soyad} - İşletme ID: ${staj.isletme_id}, Durum: ${staj.durum}`)
    })
    
    // 5. Staj durumlarını kontrol et
    const { data: durumlar, error: durumError } = await supabase
      .from('stajlar')
      .select('durum')
      .in('ogrenci_id', ogrenciIds)
    
    if (durumError) {
      console.error('Durumlar alınırken hata:', durumError)
      return
    }
    
    console.log('\n=== STAJ DURUMLARI ===')
    const durumSayilari = {}
    durumlar.forEach(staj => {
      durumSayilari[staj.durum] = (durumSayilari[staj.durum] || 0) + 1
    })
    
    Object.entries(durumSayilari).forEach(([durum, sayi]) => {
      console.log(`${durum}: ${sayi} adet`)
    })
    
    // 6. İşletme verilerini kontrol et
    const { data: isletmeler, error: isletmeError } = await supabase
      .from('isletmeler')
      .select('*')
    
    if (isletmeError) {
      console.error('İşletme verisi alınırken hata:', isletmeError)
      return
    }
    
    console.log('\n=== İŞLETMELER ===')
    console.log(`Toplam ${isletmeler.length} işletme bulundu:`)
    isletmeler.slice(0, 5).forEach((isletme, index) => {
      console.log(`${index + 1}. ${isletme.ad} - ID: ${isletme.id}`)
    })
    
  } catch (error) {
    console.error('Genel hata:', error)
  }
}

checkStajData()