const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function fixTeacherTableStructure() {
  console.log('🔧 Öğretmenler Tablosu Yapısı Düzeltiliyor...')
  console.log('════════════════════════════════════════════════════════════════')
  
  try {
    // 1. Önce öğretmenler tablosuna aktif kolonu ekle
    console.log('📋 1. Öğretmenler tablosuna aktif kolonu ekleniyor...')
    
    const { error: alterError } = await supabase.rpc('exec_sql', {
      query: `
        ALTER TABLE ogretmenler 
        ADD COLUMN IF NOT EXISTS aktif BOOLEAN DEFAULT true;
      `
    })
    
    if (alterError) {
      console.log('⚠️  Aktif kolonu ekleme hatası (zaten var olabilir):', alterError.message)
    } else {
      console.log('✅ Aktif kolonu başarıyla eklendi veya zaten mevcut')
    }

    // 2. Tüm öğretmenlerin aktif durumunu true yap
    console.log('\n📋 2. Tüm öğretmenlerin aktif durumu güncelleniyor...')
    
    const { error: updateError } = await supabase
      .from('ogretmenler')
      .update({ aktif: true })
      .is('aktif', null)
    
    if (updateError) {
      console.error('❌ Aktif durumu güncelleme hatası:', updateError.message)
    } else {
      console.log('✅ Tüm öğretmenlerin aktif durumu güncellendi')
    }

    // 3. Koordinatör ilişkisini düzelt
    console.log('\n📋 3. Koordinatör ilişkisi düzeltiliyor...')
    
    // Stajlar tablosundan öğretmen-işletme ilişkisini analiz et
    const { data: stajlarWithDetails } = await supabase
      .from('stajlar')
      .select('ogretmen_id, isletme_id')
      .not('ogretmen_id', 'is', null)
      .not('isletme_id', 'is', null)
      .eq('durum', 'aktif')
    
    if (stajlarWithDetails && stajlarWithDetails.length > 0) {
      // Öğretmen-İşletme ilişkisini grupla
      const teacherCompanyMap = new Map()
      
      stajlarWithDetails.forEach(staj => {
        const key = `${staj.ogretmen_id}-${staj.isletme_id}`
        if (!teacherCompanyMap.has(key)) {
          teacherCompanyMap.set(key, {
            ogretmen_id: staj.ogretmen_id,
            isletme_id: staj.isletme_id
          })
        }
      })
      
      console.log(`   ${teacherCompanyMap.size} öğretmen-işletme ilişkisi tespit edildi`)
      
      // Her işletme için ilk öğretmeni koordinatör yap
      const companyCoordinators = new Map()
      
      for (const [key, relation] of teacherCompanyMap) {
        if (!companyCoordinators.has(relation.isletme_id)) {
          companyCoordinators.set(relation.isletme_id, relation.ogretmen_id)
        }
      }
      
      console.log(`   ${companyCoordinators.size} işletme için koordinatör atanacak`)
      
      // İşletmelerin koordinatörlerini güncelle
      let updatedCount = 0
      
      for (const [isletme_id, ogretmen_id] of companyCoordinators) {
        const { error: coordError } = await supabase
          .from('isletmeler')
          .update({ ogretmen_id })
          .eq('id', isletme_id)
        
        if (coordError) {
          console.error(`❌ İşletme ${isletme_id} koordinatörü güncellenemedi:`, coordError.message)
        } else {
          updatedCount++
        }
      }
      
      console.log(`✅ ${updatedCount} işletmenin koordinatörü güncellendi`)
    }

    // 4. Ali Doğan durumunu özel olarak kontrol et
    console.log('\n📋 4. Ali Doğan durumu kontrolü...')
    
    const { data: aliDogan } = await supabase
      .from('ogretmenler')
      .select('id, ad, soyad, aktif')
      .eq('id', 'f81f2dbb-1a10-4359-a9d3-87e1b188dbfa')
      .single()
    
    if (aliDogan) {
      console.log('✅ Ali Doğan bulundu:')
      console.log(`   Ad: ${aliDogan.ad} ${aliDogan.soyad}`)
      console.log(`   Aktif: ${aliDogan.aktif}`)
      
      // Ali Doğan'ın koordinatörlük yaptığı işletmeleri listele
      const { data: aliCompanies } = await supabase
        .from('isletmeler')
        .select('id, ad')
        .eq('ogretmen_id', aliDogan.id)
      
      console.log(`   Koordinatörlük yaptığı işletmeler: ${aliCompanies?.length || 0}`)
      aliCompanies?.forEach((company, index) => {
        console.log(`   ${index + 1}. ${company.ad}`)
      })
      
      // Ali Doğan'ın sorumlu olduğu stajları listele
      const { data: aliStajlar } = await supabase
        .from('stajlar')
        .select(`
          id,
          ogrenciler(ad, soyad, sinif),
          isletmeler(ad)
        `)
        .eq('ogretmen_id', aliDogan.id)
      
      console.log(`   Sorumlu olduğu stajlar: ${aliStajlar?.length || 0}`)
      aliStajlar?.forEach((staj, index) => {
        console.log(`   ${index + 1}. ${staj.ogrenciler?.ad} ${staj.ogrenciler?.soyad} @ ${staj.isletmeler?.ad}`)
      })
    } else {
      console.log('❌ Ali Doğan bulunamadı')
    }

    // 5. Sonuç raporu
    console.log('\n📋 5. Sonuç raporu...')
    
    const { data: totalTeachers } = await supabase
      .from('ogretmenler')
      .select('id, aktif')
    
    const { data: companiesWithCoordinators } = await supabase
      .from('isletmeler')
      .select('id, ad, ogretmen_id')
      .not('ogretmen_id', 'is', null)
    
    console.log(`   Toplam öğretmen sayısı: ${totalTeachers?.length || 0}`)
    console.log(`   Aktif öğretmen sayısı: ${totalTeachers?.filter(t => t.aktif).length || 0}`)
    console.log(`   Koordinatörü olan işletme sayısı: ${companiesWithCoordinators?.length || 0}`)
    
    console.log('\n✅ Yapı düzeltme işlemi tamamlandı!')
    
  } catch (error) {
    console.error('❌ Genel hata:', error)
  }
}

// RPC fonksiyonu için SQL exec
async function setupRPCFunction() {
  console.log('🔧 RPC fonksiyonu kuruluyor...')
  
  const { error } = await supabase.rpc('exec_sql', {
    query: `
      CREATE OR REPLACE FUNCTION exec_sql(query text)
      RETURNS void AS $$
      BEGIN
        EXECUTE query;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `
  })
  
  if (error) {
    console.log('⚠️  RPC fonksiyonu kurulumu:', error.message)
  }
}

// Ana fonksiyon
async function main() {
  await setupRPCFunction()
  await fixTeacherTableStructure()
}

main()