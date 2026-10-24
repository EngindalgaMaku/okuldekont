import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

// Admin client oluştur (service role anahtarı kullanarak)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

// Normal client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

async function createConfirmedAdmin() {
  console.log('🔐 ONAYLANMIŞ ADMİN KULLANICI OLUŞTURULUYOR...')
  console.log('===============================================')

  try {
    // Admin kullanıcısı bilgileri
    const adminEmail = 'admin@sistem.com'
    const adminPassword = 'AdminSistem2025!' // Güçlü şifre
    const adminName = 'System Administrator'

    console.log('📧 E-posta:', adminEmail)
    console.log('🔑 Şifre:', adminPassword)
    console.log('👤 Ad Soyad:', adminName)
    console.log('')

    // Önce mevcut kullanıcıları kontrol et
    console.log('🔍 Mevcut admin kullanıcıları kontrol ediliyor...')
    
    // Admin client ile kullanıcı oluştur (email confirmation bypass)
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true, // E-posta onayını otomatik yap
      user_metadata: {
        full_name: adminName,
        role: 'admin',
        is_admin: true
      }
    })

    if (error) {
      console.error('❌ Admin client hatası:', error.message)
      
      // Normal client ile deneme yap
      console.log('🔄 Normal client ile deneniyor...')
      
      const { data: normalData, error: normalError } = await supabase.auth.signUp({
        email: adminEmail,
        password: adminPassword,
        options: {
          data: {
            full_name: adminName,
            role: 'admin',
            is_admin: true
          }
        }
      })

      if (normalError) {
        if (normalError.message.includes('already registered')) {
          console.log('ℹ️ Bu e-posta zaten kayıtlı.')
          console.log('')
          console.log('📋 GİRİŞ BİLGİLERİ:')
          console.log('E-posta:', adminEmail)
          console.log('Şifre:', adminPassword)
          console.log('')
          console.log('⚠️ E-posta onayı gerekebilir.')
          console.log('🌐 Admin paneline giriş için:')
          console.log('http://localhost:3000/admin/login')
          return
        }
        
        console.error('❌ Normal client hatası:', normalError.message)
        return
      }

      if (normalData.user) {
        console.log('✅ Normal client ile kullanıcı oluşturuldu!')
        console.log('User ID:', normalData.user.id)
        console.log('E-posta:', normalData.user.email)
        console.log('⚠️ E-posta onayı gerekli olabilir.')
      }
    } else if (data.user) {
      console.log('✅ Admin kullanıcısı başarıyla oluşturuldu ve onaylandı!')
      console.log('User ID:', data.user.id)
      console.log('E-posta:', data.user.email)
      console.log('Onay durumu:', data.user.email_confirmed_at ? 'Onaylandı' : 'Onay bekliyor')
    }

    console.log('')
    console.log('📋 GİRİŞ BİLGİLERİ:')
    console.log('E-posta:', adminEmail)
    console.log('Şifre:', adminPassword)
    console.log('')
    console.log('🌐 Admin paneline giriş için:')
    console.log('http://localhost:3000/admin/login')

  } catch (error) {
    console.error('❌ Beklenmeyen hata:', error)
  }
}

createConfirmedAdmin()