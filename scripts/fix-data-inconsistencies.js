const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

// Supabase credentials from environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Environment variables gerekli! .env.local dosyasını kontrol edin.')
  console.error('   NEXT_PUBLIC_SUPABASE_URL ve SUPABASE_SERVICE_ROLE_KEY olmalı.')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function detectDataInconsistencies() {
  console.log('🔍 Veri tutarsızlıkları tespit ediliyor...\n')
  
  const issues = []
  
  try {
    // 1. Koordinatör olarak kullanılan ama öğretmen listesinde olmayan kişiler
    console.log('1. Koordinatör olarak tanımlı ama öğretmen listesinde olmayan kişiler...')
    
    // İşletmelerin koordinatör ID'lerini al
    const { data: isletmeler } = await supabase
      .from('isletmeler')
      .select('id, ad, koordinator_id')
      .not('koordinator_id', 'is', null)
    
    if (isletmeler) {
      console.log(`   ${isletmeler.length} işletmede koordinatör tanımlı`)
      
      for (const isletme of isletmeler) {
        const { data: teacher } = await supabase
          .from('ogretmenler')
          .select('id, ad, soyad, aktif')
          .eq('id', isletme.koordinator_id)
          .single()
        
        if (!teacher) {
          issues.push({
            type: 'MISSING_COORDINATOR',
            isletme,
            coordinatorId: isletme.koordinator_id,
            description: `❌ İşletme "${isletme.ad}" koordinatör ID ${isletme.koordinator_id} öğretmen tablosunda bulunamadı!`
          })
        } else if (!teacher.aktif) {
          issues.push({
            type: 'INACTIVE_COORDINATOR',
            isletme,
            teacher,
            description: `⚠️ İşletme "${isletme.ad}" koordinatörü ${teacher.ad} ${teacher.soyad} pasif durumda!`
          })
        }
      }
    }
    
    // 2. Stajlarda öğretmen olarak tanımlı ama öğretmen listesinde olmayan kişiler
    console.log('2. Staj tablosundaki öğretmen referansları kontrol ediliyor...')
    
    const { data: stajlar } = await supabase
      .from('stajlar')
      .select(`
        id,
        ogretmen_id,
        ogrenci_id,
        isletme_id,
        ogrenciler!inner (ad, soyad, sinif),
        isletmeler!inner (ad)
      `)
      .not('ogretmen_id', 'is', null)
      .eq('durum', 'aktif')
    
    if (stajlar) {
      console.log(`   ${stajlar.length} aktif staj kaydında öğretmen tanımlı`)
      
      const teacherIds = [...new Set(stajlar.map(s => s.ogretmen_id))]
      
      for (const teacherId of teacherIds) {
        const { data: teacher } = await supabase
          .from('ogretmenler')
          .select('id, ad, soyad, aktif')
          .eq('id', teacherId)
          .single()
        
        if (!teacher) {
          const affectedStajlar = stajlar.filter(s => s.ogretmen_id === teacherId)
          issues.push({
            type: 'MISSING_TEACHER_IN_STAJ',
            teacherId,
            affectedStajlar,
            description: `❌ Öğretmen ID ${teacherId} bulunamadı, ancak ${affectedStajlar.length} staj kaydında referans var!`
          })
        } else if (!teacher.aktif) {
          const affectedStajlar = stajlar.filter(s => s.ogretmen_id === teacherId)
          issues.push({
            type: 'INACTIVE_TEACHER_IN_STAJ',
            teacherId,
            teacher,
            affectedStajlar,
            description: `⚠️ Öğretmen ${teacher.ad} ${teacher.soyad} pasif durumda, ancak ${affectedStajlar.length} aktif staj kaydında referans var!`
          })
        }
      }
    }
    
    // 3. Spesifik olarak Ali Doğan'ı ara
    console.log('3. "Ali Doğan" özel araştırması...')
    
    const { data: aliDogan } = await supabase
      .from('ogretmenler')
      .select('*')
      .or('ad.ilike.%Ali%,soyad.ilike.%Doğan%')
    
    console.log(`   "Ali" veya "Doğan" içeren öğretmenler:`, aliDogan?.length || 0)
    if (aliDogan) {
      aliDogan.forEach(teacher => {
        console.log(`     - ${teacher.ad} ${teacher.soyad} (ID: ${teacher.id}, Aktif: ${teacher.aktif})`)
      })
    }
    
    // Ali Doğan'ı koordinatör olarak kullanan işletmeleri bul
    const { data: aliCoordinatedCompanies } = await supabase
      .from('isletmeler')
      .select('*')
      .in('koordinator_id', aliDogan?.map(t => t.id) || [])
    
    console.log(`   "Ali Doğan" koordinatörlük yaptığı işletmeler:`, aliCoordinatedCompanies?.length || 0)
    if (aliCoordinatedCompanies) {
      aliCoordinatedCompanies.forEach(company => {
        console.log(`     - ${company.ad} (Koordinatör ID: ${company.koordinator_id})`)
      })
    }
    
    // 4. Orphaned öğrenciler
    console.log('4. Staj tablosundaki yoksa öğrenciler kontrol ediliyor...')
    
    const { data: stajlarWithStudents } = await supabase
      .from('stajlar')
      .select('id, ogrenci_id, isletme_id, durum')
      .eq('durum', 'aktif')
    
    if (stajlarWithStudents) {
      for (const staj of stajlarWithStudents) {
        const { data: student } = await supabase
          .from('ogrenciler')
          .select('id, ad, soyad')
          .eq('id', staj.ogrenci_id)
          .single()
        
        if (!student) {
          issues.push({
            type: 'MISSING_STUDENT',
            staj,
            studentId: staj.ogrenci_id,
            description: `❌ Staj ID ${staj.id} öğrenci ID ${staj.ogrenci_id} bulunamadı!`
          })
        }
      }
    }
    
    // 5. Orphaned işletmeler
    console.log('5. Staj tablosundaki yoksa işletmeler kontrol ediliyor...')
    
    if (stajlarWithStudents) {
      for (const staj of stajlarWithStudents) {
        const { data: company } = await supabase
          .from('isletmeler')
          .select('id, ad')
          .eq('id', staj.isletme_id)
          .single()
        
        if (!company) {
          issues.push({
            type: 'MISSING_COMPANY',
            staj,
            companyId: staj.isletme_id,
            description: `❌ Staj ID ${staj.id} işletme ID ${staj.isletme_id} bulunamadı!`
          })
        }
      }
    }
    
    // Report findings
    console.log('\n📋 SONUÇLAR:')
    console.log(`════════════════════════════════════════════════════════════════`)
    
    if (issues.length === 0) {
      console.log('✅ Veri tutarsızlığı bulunamadı!')
    } else {
      console.log(`❌ ${issues.length} veri tutarsızlığı tespit edildi:\n`)
      
      issues.forEach((issue, index) => {
        console.log(`${index + 1}. ${issue.description}`)
        if (issue.type === 'MISSING_COORDINATOR' || issue.type === 'INACTIVE_COORDINATOR') {
          console.log(`   İşletme: ${issue.isletme.ad} (ID: ${issue.isletme.id})`)
          console.log(`   Koordinatör ID: ${issue.coordinatorId}`)
          if (issue.teacher) {
            console.log(`   Öğretmen: ${issue.teacher.ad} ${issue.teacher.soyad} (Aktif: ${issue.teacher.aktif})`)
          }
        }
        if (issue.affectedStajlar) {
          console.log(`   Etkilenen staj sayısı: ${issue.affectedStajlar.length}`)
          issue.affectedStajlar.forEach(staj => {
            console.log(`     - ${staj.ogrenciler.ad} ${staj.ogrenciler.soyad} (${staj.ogrenciler.sinif}) @ ${staj.isletmeler.ad}`)
          })
        }
        console.log('')
      })
    }
    
    return issues
    
  } catch (error) {
    console.error('Hata:', error)
    return []
  }
}

async function fixDataInconsistencies(issues) {
  console.log('\n🔧 VERİ TUTARSIZLIKLARI DÜZELTİLİYOR...')
  console.log(`════════════════════════════════════════════════════════════════`)
  
  const fixes = []
  
  for (const issue of issues) {
    console.log(`\n${issue.description}`)
    
    if (issue.type === 'MISSING_COORDINATOR') {
      console.log('   Çözüm: Koordinatör referansı kaldırılacak')
      
      const { error } = await supabase
        .from('isletmeler')
        .update({ koordinator_id: null })
        .eq('id', issue.isletme.id)
      
      if (error) {
        console.log(`   ❌ Hata: ${error.message}`)
      } else {
        console.log(`   ✅ İşletme "${issue.isletme.ad}" koordinatör referansı kaldırıldı`)
        fixes.push(`İşletme "${issue.isletme.ad}" koordinatör referansı kaldırıldı`)
      }
    }
    
    if (issue.type === 'MISSING_TEACHER_IN_STAJ') {
      console.log('   Çözüm: Staj kayıtlarında öğretmen referansı kaldırılacak')
      
      for (const staj of issue.affectedStajlar) {
        const { error } = await supabase
          .from('stajlar')
          .update({ ogretmen_id: null })
          .eq('id', staj.id)
        
        if (error) {
          console.log(`   ❌ Staj ID ${staj.id} güncellenemedi: ${error.message}`)
        } else {
          console.log(`   ✅ Staj ID ${staj.id} öğretmen referansı kaldırıldı`)
          fixes.push(`Staj ID ${staj.id} öğretmen referansı kaldırıldı`)
        }
      }
    }
    
    if (issue.type === 'MISSING_STUDENT') {
      console.log('   Çözüm: Orphaned staj kaydı silinecek')
      
      const { error } = await supabase
        .from('stajlar')
        .delete()
        .eq('id', issue.staj.id)
      
      if (error) {
        console.log(`   ❌ Staj ID ${issue.staj.id} silinemedi: ${error.message}`)
      } else {
        console.log(`   ✅ Orphaned staj kaydı silindi (ID: ${issue.staj.id})`)
        fixes.push(`Orphaned staj kaydı silindi (ID: ${issue.staj.id})`)
      }
    }
    
    if (issue.type === 'MISSING_COMPANY') {
      console.log('   Çözüm: Orphaned staj kaydı silinecek')
      
      const { error } = await supabase
        .from('stajlar')
        .delete()
        .eq('id', issue.staj.id)
      
      if (error) {
        console.log(`   ❌ Staj ID ${issue.staj.id} silinemedi: ${error.message}`)
      } else {
        console.log(`   ✅ Orphaned staj kaydı silindi (ID: ${issue.staj.id})`)
        fixes.push(`Orphaned staj kaydı silindi (ID: ${issue.staj.id})`)
      }
    }
    
    if (issue.type === 'INACTIVE_COORDINATOR') {
      console.log('   Çözüm: Pasif öğretmen koordinatörlükten kaldırılacak')
      
      const { error } = await supabase
        .from('isletmeler')
        .update({ koordinator_id: null })
        .eq('id', issue.isletme.id)
      
      if (error) {
        console.log(`   ❌ Hata: ${error.message}`)
      } else {
        console.log(`   ✅ İşletme "${issue.isletme.ad}" pasif koordinatör referansı kaldırıldı`)
        fixes.push(`İşletme "${issue.isletme.ad}" pasif koordinatör referansı kaldırıldı`)
      }
    }
    
    if (issue.type === 'INACTIVE_TEACHER_IN_STAJ') {
      console.log('   Çözüm: Pasif öğretmen staj kayıtlarından kaldırılacak')
      
      for (const staj of issue.affectedStajlar) {
        const { error } = await supabase
          .from('stajlar')
          .update({ ogretmen_id: null })
          .eq('id', staj.id)
        
        if (error) {
          console.log(`   ❌ Staj ID ${staj.id} güncellenemedi: ${error.message}`)
        } else {
          console.log(`   ✅ Staj ID ${staj.id} pasif öğretmen referansı kaldırıldı`)
          fixes.push(`Staj ID ${staj.id} pasif öğretmen referansı kaldırıldı`)
        }
      }
    }
  }
  
  console.log('\n📊 DÜZELTME SONUÇLARI:')
  console.log(`════════════════════════════════════════════════════════════════`)
  
  if (fixes.length === 0) {
    console.log('ℹ️ Hiçbir düzeltme yapılmadı.')
  } else {
    console.log(`✅ ${fixes.length} düzeltme yapıldı:`)
    fixes.forEach((fix, index) => {
      console.log(`${index + 1}. ${fix}`)
    })
  }
  
  return fixes
}

async function main() {
  console.log('🚀 VERİ TUTARSIZLIĞI TESPIT VE DÜZELTME ARACI')
  console.log('════════════════════════════════════════════════════════════════')
  
  const issues = await detectDataInconsistencies()
  
  if (issues.length > 0) {
    console.log('\n❓ Tespit edilen sorunları düzeltmek istiyor musunuz? (y/n)')
    
    // Bu bir örnek script olduğu için otomatik düzeltme yapıyoruz
    // Gerçek kullanımda kullanıcı onayı istenebilir
    const shouldFix = true
    
    if (shouldFix) {
      const fixes = await fixDataInconsistencies(issues)
      console.log('\n✅ Düzeltmeler tamamlandı!')
      console.log('\nYeniden kontrol ediliyor...')
      
      const remainingIssues = await detectDataInconsistencies()
      if (remainingIssues.length === 0) {
        console.log('🎉 Tüm veri tutarsızlıkları düzeltildi!')
      } else {
        console.log(`⚠️ ${remainingIssues.length} sorun hala mevcut. Manuel müdahale gerekebilir.`)
      }
    } else {
      console.log('ℹ️ Hiçbir düzeltme yapılmadı.')
    }
  }
}

// Script'i çalıştır
main().catch(console.error)