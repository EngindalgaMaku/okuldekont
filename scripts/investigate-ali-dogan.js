const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function investigateAliDogan() {
  console.log('🔍 Ali Doğan Detaylı Araştırma')
  console.log('════════════════════════════════════════════════════════════════')
  
  try {
    // 1. Öğretmen tablosunda Ali Doğan araması
    console.log('📋 1. Öğretmen tablosunda "Ali Doğan" araması...')
    
    const { data: aliTeachers, error: teacherError } = await supabase
      .from('ogretmenler')
      .select('*')
      .or('ad.ilike.%Ali%,soyad.ilike.%Doğan%')
    
    if (teacherError) {
      console.error('❌ Öğretmen sorgusu hatası:', teacherError)
      return
    }
    
    console.log(`   Bulunan öğretmenler: ${aliTeachers?.length || 0}`)
    aliTeachers?.forEach((teacher, index) => {
      console.log(`   ${index + 1}. ${teacher.ad} ${teacher.soyad}`)
      console.log(`      ID: ${teacher.id}`)
      console.log(`      TC: ${teacher.tc_kimlik}`)
      console.log(`      Aktif: ${teacher.aktif}`)
      console.log(`      Oluşturma: ${teacher.created_at}`)
      console.log()
    })
    
    // 2. İşletmelerde koordinatör araması
    console.log('📋 2. İşletmelerde koordinatör araması...')
    
    const { data: companies, error: companyError } = await supabase
      .from('isletmeler')
      .select('id, ad, koordinator_id')
      .not('koordinator_id', 'is', null)
    
    if (companyError) {
      console.error('❌ İşletme sorgusu hatası:', companyError)
      return
    }
    
    console.log(`   Koordinatörü olan işletmeler: ${companies?.length || 0}`)
    
    let aliCoordinatorCompanies = []
    
    if (companies && companies.length > 0) {
      for (const company of companies) {
        // Her koordinatör için öğretmen bilgilerini çek
        const { data: coordinator } = await supabase
          .from('ogretmenler')
          .select('id, ad, soyad, aktif')
          .eq('id', company.koordinator_id)
          .single()
        
        if (coordinator) {
          console.log(`   ${company.ad} -> ${coordinator.ad} ${coordinator.soyad} (${coordinator.aktif ? 'Aktif' : 'Pasif'})`)
          
          // Ali Doğan kontrolü
          if (coordinator.ad?.toLowerCase().includes('ali') && coordinator.soyad?.toLowerCase().includes('doğan')) {
            aliCoordinatorCompanies.push({
              company: company.ad,
              coordinator: coordinator
            })
          }
        } else {
          console.log(`   ${company.ad} -> Koordinatör bulunamadı (ID: ${company.koordinator_id})`)
        }
      }
    }
    
    console.log(`\n   Ali Doğan koordinatörlük yaptığı işletmeler: ${aliCoordinatorCompanies.length}`)
    aliCoordinatorCompanies.forEach((item, index) => {
      console.log(`   ${index + 1}. ${item.company} (ID: ${item.coordinator.id})`)
    })
    
    // 3. Staj kayıtlarında Ali Doğan araması
    console.log('\n📋 3. Staj kayıtlarında Ali Doğan araması...')
    
    const { data: allStajlar } = await supabase
      .from('stajlar')
      .select(`
        id, 
        ogretmen_id,
        ogrenciler(ad, soyad, sinif),
        isletmeler(ad)
      `)
      .not('ogretmen_id', 'is', null)
    
    if (allStajlar) {
      let aliStajCount = 0
      
      // Ali Doğan öğretmen ID'lerini topla
      const aliTeacherIds = aliTeachers?.map(t => t.id) || []
      
      console.log(`   Ali Doğan öğretmen ID'leri: ${aliTeacherIds.length}`)
      aliTeacherIds.forEach(id => console.log(`     - ${id}`))
      
      for (const staj of allStajlar) {
        if (aliTeacherIds.includes(staj.ogretmen_id)) {
          aliStajCount++
          console.log(`   ${aliStajCount}. ${staj.ogrenciler?.ad} ${staj.ogrenciler?.soyad} (${staj.ogrenciler?.sinif}) @ ${staj.isletmeler?.ad}`)
        }
      }
      
      console.log(`\n   Ali Doğan'ın sorumlu olduğu staj sayısı: ${aliStajCount}`)
    }
    
    // 4. Özel ID araması
    console.log('\n📋 4. Özel ID araması (f81f2dbb-1a10-4359-a9d3-87e1b188dbfa)...')
    
    const { data: specificTeacher } = await supabase
      .from('ogretmenler')
      .select('*')
      .eq('id', 'f81f2dbb-1a10-4359-a9d3-87e1b188dbfa')
      .single()
    
    if (specificTeacher) {
      console.log('   ✅ Öğretmen bulundu:')
      console.log(`      Ad: ${specificTeacher.ad} ${specificTeacher.soyad}`)
      console.log(`      TC: ${specificTeacher.tc_kimlik}`)
      console.log(`      Aktif: ${specificTeacher.aktif}`)
      console.log(`      Email: ${specificTeacher.email}`)
      console.log(`      Telefon: ${specificTeacher.telefon}`)
    } else {
      console.log('   ❌ Bu ID ile öğretmen bulunamadı')
    }
    
    // 5. Bu ID'yi koordinatör olarak kullanan işletmeler
    const { data: coordinatorCompanies } = await supabase
      .from('isletmeler')
      .select('id, ad')
      .eq('koordinator_id', 'f81f2dbb-1a10-4359-a9d3-87e1b188dbfa')
    
    console.log(`\n   Bu ID'yi koordinatör olarak kullanan işletmeler: ${coordinatorCompanies?.length || 0}`)
    coordinatorCompanies?.forEach((company, index) => {
      console.log(`   ${index + 1}. ${company.ad}`)
    })
    
    // 6. Bu ID'yi öğretmen olarak kullanan stajlar
    const { data: teacherStajlar } = await supabase
      .from('stajlar')
      .select(`
        id,
        ogrenciler(ad, soyad, sinif),
        isletmeler(ad)
      `)
      .eq('ogretmen_id', 'f81f2dbb-1a10-4359-a9d3-87e1b188dbfa')
    
    console.log(`\n   Bu ID'yi öğretmen olarak kullanan stajlar: ${teacherStajlar?.length || 0}`)
    teacherStajlar?.forEach((staj, index) => {
      console.log(`   ${index + 1}. ${staj.ogrenciler?.ad} ${staj.ogrenciler?.soyad} (${staj.ogrenciler?.sinif}) @ ${staj.isletmeler?.ad}`)
    })
    
    console.log('\n✅ Araştırma tamamlandı!')
    
  } catch (error) {
    console.error('❌ Genel hata:', error)
  }
}

investigateAliDogan()