require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Supabase URL ve Service Role Key gerekli!')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function setupAdminSystem() {
  try {
    console.log('Admin sistem kurulumu başlıyor...')
    
    // 1. Önce admin_kullanicilar tablosuna yetki_seviyesi kolonu ekle
    console.log('1. yetki_seviyesi kolonu ekleniyor...')
    const { error: alterError } = await supabase
      .from('admin_kullanicilar')
      .select('yetki_seviyesi')
      .limit(1)
    
    if (alterError && alterError.code === 'PGRST116') {
      console.log('Yetki seviyesi kolonu yok, ekleme işlemi gerekli')
      // Kolon yok, SQL komutunu çalıştır
      console.log('SQL komutları manuel olarak Supabase dashboard\'da çalıştırılmalı')
    } else {
      console.log('✅ yetki_seviyesi kolonu zaten mevcut')
    }
    
    // 2. Mevcut admin kullanıcıları kontrol et
    console.log('2. Mevcut admin kullanıcıları kontrol ediliyor...')
    const { data: existingAdmins, error: selectError } = await supabase
      .from('admin_kullanicilar')
      .select('*')
    
    if (selectError) {
      console.error('Admin kullanıcılar kontrol edilemedi:', selectError)
    } else {
      console.log('Mevcut admin kullanıcılar:', existingAdmins.length)
      existingAdmins.forEach(admin => {
        console.log(`- ${admin.ad} ${admin.soyad} (${admin.email}) - Yetki: ${admin.yetki_seviyesi || 'Tanımsız'}`)
      })
    }
    
    // 3. Test için varsayılan süper admin oluştur
    console.log('3. Test süper admin kullanıcısı kontrol ediliyor...')
    const testEmail = 'admin@okul.com'
    
    const { data: testAdmin, error: testError } = await supabase
      .from('admin_kullanicilar')
      .select('*')
      .eq('email', testEmail)
      .single()
    
    if (testError && testError.code === 'PGRST116') {
      console.log('Test admin kullanıcısı bulunamadı, oluşturuluyor...')
      
      const { data: insertData, error: insertError } = await supabase
        .from('admin_kullanicilar')
        .insert({
          id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479', // Test UUID
          ad: 'Test',
          soyad: 'Admin',
          email: testEmail,
          yetki_seviyesi: 'super_admin',
          aktif: true
        })
        .select()
      
      if (insertError) {
        console.error('Test admin oluşturulamadı:', insertError)
      } else {
        console.log('✅ Test admin oluşturuldu')
      }
    } else if (testAdmin) {
      console.log('✅ Test admin zaten mevcut:', testAdmin.ad, testAdmin.soyad)
      
      // Yetki seviyesini güncelle
      if (!testAdmin.yetki_seviyesi) {
        const { error: updateError } = await supabase
          .from('admin_kullanicilar')
          .update({ yetki_seviyesi: 'super_admin' })
          .eq('id', testAdmin.id)
        
        if (updateError) {
          console.error('Yetki seviyesi güncellenemedi:', updateError)
        } else {
          console.log('✅ Test admin yetki seviyesi güncellendi')
        }
      }
    }
    
    console.log('\n📋 Kurulum Notları:')
    console.log('1. Supabase Dashboard > SQL Editor\'da aşağıdaki SQL\'i çalıştırın:')
    console.log('   ALTER TABLE admin_kullanicilar ADD COLUMN IF NOT EXISTS yetki_seviyesi TEXT DEFAULT \'operator\';')
    console.log('2. Admin panel ayarlar sayfasında "Admin Yönetimi" sekmesini kontrol edin')
    console.log('3. İlk giriş için admin@okul.com hesabını kullanın')
    
  } catch (error) {
    console.error('Kurulum hatası:', error)
  }
}

setupAdminSystem()