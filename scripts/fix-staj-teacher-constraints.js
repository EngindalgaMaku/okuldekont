const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function fixStajTeacherConstraints() {
  console.log('🔧 Staj-Öğretmen Kısıtlamaları Düzeltiliyor...')
  console.log('════════════════════════════════════════════════════════════════')
  
  try {
    // 1. Önce staj tablosundaki ogretmen_id alanını nullable yap
    console.log('📋 1. Staj tablosundaki ogretmen_id constraint\'i kaldırılıyor...')
    
    const { error: alterError } = await supabase.rpc('exec_sql', {
      query: 'ALTER TABLE stajlar ALTER COLUMN ogretmen_id DROP NOT NULL;'
    })
    
    if (alterError) {
      console.log('⚠️  Constraint kaldırma hatası (zaten kaldırılmış olabilir):', alterError.message)
    } else {
      console.log('✅ Constraint başarıyla kaldırıldı')
    }

    // 2. Eksik öğretmen ID'lerini tespit et ve null yap
    console.log('\n📋 2. Eksik öğretmen ID\'leri tespit ediliyor...')
    
    const { data: stajlar } = await supabase
      .from('stajlar')
      .select('id, ogretmen_id')
      .not('ogretmen_id', 'is', null)
    
    if (!stajlar) {
      console.log('❌ Staj verileri alınamadı')
      return
    }
    
    console.log(`📊 ${stajlar.length} staj kaydı kontrol ediliyor...`)
    
    let fixedCount = 0
    let checkedCount = 0
    
    for (const staj of stajlar) {
      checkedCount++
      if (checkedCount % 10 === 0) {
        console.log(`   İşlenen: ${checkedCount}/${stajlar.length}`)
      }
      
      // Öğretmen var mı kontrol et
      const { data: teacher } = await supabase
        .from('ogretmenler')
        .select('id, ad, soyad, aktif')
        .eq('id', staj.ogretmen_id)
        .single()
      
      if (!teacher) {
        // Öğretmen yoksa ogretmen_id'yi null yap
        const { error: updateError } = await supabase
          .from('stajlar')
          .update({ ogretmen_id: null })
          .eq('id', staj.id)
        
        if (updateError) {
          console.log(`❌ Staj ${staj.id} güncellenemedi:`, updateError.message)
        } else {
          fixedCount++
        }
      }
    }
    
    console.log(`\n✅ ${fixedCount} staj kaydından eksik öğretmen referansı kaldırıldı`)
    
    // 3. Öğretmenlerin aktif durumlarını kontrol et ve düzelt
    console.log('\n📋 3. Öğretmenlerin aktif durumları kontrol ediliyor...')
    
    const { data: ogretmenler } = await supabase
      .from('ogretmenler')
      .select('id, ad, soyad, aktif')
      .or('aktif.is.null,aktif.eq.undefined')
    
    if (ogretmenler && ogretmenler.length > 0) {
      console.log(`📊 ${ogretmenler.length} öğretmenin aktif durumu düzeltiliyor...`)
      
      for (const ogretmen of ogretmenler) {
        const { error: updateError } = await supabase
          .from('ogretmenler')
          .update({ aktif: true })
          .eq('id', ogretmen.id)
        
        if (updateError) {
          console.log(`❌ Öğretmen ${ogretmen.ad} ${ogretmen.soyad} güncellenemedi:`, updateError.message)
        } else {
          console.log(`✅ ${ogretmen.ad} ${ogretmen.soyad} aktif durumu düzeltildi`)
        }
      }
    }
    
    // 4. Ali Doğan'ı özel olarak kontrol et
    console.log('\n📋 4. Ali Doğan özel kontrolü...')
    
    const { data: aliDogan } = await supabase
      .from('ogretmenler')
      .select('id, ad, soyad, aktif, tc_kimlik, telefon, email')
      .or('ad.ilike.%Ali%,soyad.ilike.%Doğan%')
    
    if (aliDogan && aliDogan.length > 0) {
      console.log('\n🔍 Ali Doğan bilgileri:')
      aliDogan.forEach((ogretmen, index) => {
        console.log(`   ${index + 1}. ${ogretmen.ad} ${ogretmen.soyad}`)
        console.log(`      ID: ${ogretmen.id}`)
        console.log(`      Aktif: ${ogretmen.aktif}`)
        console.log(`      TC: ${ogretmen.tc_kimlik}`)
        console.log(`      Tel: ${ogretmen.telefon}`)
        console.log(`      Email: ${ogretmen.email}`)
        console.log()
      })
    }
    
    // 5. İşletmelerdeki koordinatör durumlarını kontrol et
    console.log('\n📋 5. İşletmelerdeki koordinatör durumları kontrol ediliyor...')
    
    const { data: isletmeler } = await supabase
      .from('isletmeler')
      .select('id, ad, koordinator_id')
      .not('koordinator_id', 'is', null)
    
    if (isletmeler) {
      console.log(`📊 ${isletmeler.length} işletmede koordinatör tanımlı`)
      
      for (const isletme of isletmeler) {
        const { data: coordinator } = await supabase
          .from('ogretmenler')
          .select('id, ad, soyad, aktif')
          .eq('id', isletme.koordinator_id)
          .single()
        
        if (!coordinator) {
          console.log(`❌ ${isletme.ad} işletmesinde koordinatör bulunamadı (ID: ${isletme.koordinator_id})`)
          
          // Koordinatörü kaldır
          const { error: updateError } = await supabase
            .from('isletmeler')
            .update({ koordinator_id: null })
            .eq('id', isletme.id)
          
          if (!updateError) {
            console.log(`✅ ${isletme.ad} işletmesinden koordinatör kaldırıldı`)
          }
        } else {
          console.log(`✅ ${isletme.ad} -> ${coordinator.ad} ${coordinator.soyad} (Aktif: ${coordinator.aktif})`)
        }
      }
    }
    
    console.log('\n✅ Tüm düzeltmeler tamamlandı!')
    
  } catch (error) {
    console.error('❌ Genel hata:', error)
  }
}

// RPC fonksiyonu için SQL exec özelliğini ekle
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
  await fixStajTeacherConstraints()
}

main()