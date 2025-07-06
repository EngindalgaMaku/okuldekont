import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

async function createAdminUser() {
  console.log('🔐 ADMİN KULLANICI OLUŞTURULUYOR...')
  console.log('==================================')

  try {
    // Admin kullanıcısı bilgileri
    const adminEmail = 'admin@okul.com'
    const adminPassword = 'AdminOkul2025!' // Güçlü şifre
    const adminName = 'System Administrator'

    console.log('📧 E-posta:', adminEmail)
    console.log('🔑 Şifre:', adminPassword)
    console.log('👤 Ad Soyad:', adminName)
    console.log('')

    // Supabase Auth ile kullanıcı oluştur (e-posta onayını atla)
    const { data, error } = await supabase.auth.signUp({
      email: adminEmail,
      password: adminPassword,
      options: {
        emailRedirectTo: undefined,
        data: {
          full_name: adminName,
          role: 'admin',
          is_admin: true
        }
      }
    })

    if (error) {
      console.error('❌ Hata:', error.message)
      
      if (error.message.includes('already registered')) {
        console.log('ℹ️ Bu e-posta zaten kayıtlı. Giriş yapmayı deneyin.')
        console.log('')
        console.log('📋 GİRİŞ BİLGİLERİ:')
        console.log('E-posta:', adminEmail)
        console.log('Şifre:', adminPassword)
        return
      }
      
      return
    }

    if (data.user) {
      console.log('✅ Admin kullanıcısı başarıyla oluşturuldu!')
      console.log('User ID:', data.user.id)
      console.log('E-posta:', data.user.email)
      console.log('')
      console.log('📋 GİRİŞ BİLGİLERİ:')
      console.log('E-posta:', adminEmail)
      console.log('Şifre:', adminPassword)
      console.log('')
      console.log('🌐 Admin paneline giriş için:')
      console.log('http://localhost:3000/admin/login')
    }

  } catch (error) {
    console.error('❌ Beklenmeyen hata:', error)
  }
}

createAdminUser()