const { createClient } = require('@supabase/supabase-js')

// Supabase admin client oluştur
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Supabase URL veya Service Role Key bulunamadı!')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function cleanupExpiredAnonymousUsers() {
  try {
    console.log('🧹 Eski anonymous kullanıcıları temizleniyor...')
    
    // 7 günden eski anonymous kullanıcıları temizle
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    
    console.log(`📅 ${sevenDaysAgo.toISOString()} tarihinden eski anonymous kullanıcılar silinecek`)
    
    // Auth API ile eski anonymous kullanıcıları bul
    const { data: users, error: fetchError } = await supabase.auth.admin.listUsers({
      page: 1,
      perPage: 1000
    })
    
    if (fetchError) {
      console.error('❌ Kullanıcılar getirilemedi:', fetchError)
      return
    }
    
    console.log(`📊 Toplam ${users.users.length} kullanıcı bulundu`)
    
    // Anonymous ve eski kullanıcıları filtrele
    const expiredAnonymousUsers = users.users.filter(user => {
      const isAnonymous = user.is_anonymous || !user.email
      const isOld = new Date(user.created_at) < sevenDaysAgo
      const lastSignIn = user.last_sign_in_at ? new Date(user.last_sign_in_at) : new Date(user.created_at)
      const isInactive = lastSignIn < sevenDaysAgo
      
      return isAnonymous && (isOld || isInactive)
    })
    
    console.log(`🎯 ${expiredAnonymousUsers.length} eski anonymous kullanıcı temizlenecek`)
    
    if (expiredAnonymousUsers.length === 0) {
      console.log('✅ Temizlenecek kullanıcı yok')
      return
    }
    
    // Kullanıcıları tek tek sil
    let deletedCount = 0
    let errorCount = 0
    
    for (const user of expiredAnonymousUsers) {
      try {
        const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id)
        
        if (deleteError) {
          console.error(`❌ Kullanıcı silinemedi ${user.id}:`, deleteError)
          errorCount++
        } else {
          console.log(`✅ Kullanıcı silindi: ${user.id} (${user.created_at})`)
          deletedCount++
        }
        
        // Rate limiting için kısa bekleme
        await new Promise(resolve => setTimeout(resolve, 100))
        
      } catch (error) {
        console.error(`❌ Beklenmeyen hata ${user.id}:`, error)
        errorCount++
      }
    }
    
    console.log('\n📈 Temizlik Raporu:')
    console.log(`✅ Silinen kullanıcı: ${deletedCount}`)
    console.log(`❌ Hata alan: ${errorCount}`)
    console.log(`📊 Toplam işlem: ${expiredAnonymousUsers.length}`)
    
  } catch (error) {
    console.error('❌ Temizlik işlemi sırasında hata:', error)
  }
}

// Detaylı istatistik fonksiyonu
async function getAuthStats() {
  try {
    console.log('\n📊 Auth Kullanıcı İstatistikleri:')
    
    const { data: users, error } = await supabase.auth.admin.listUsers({
      page: 1,
      perPage: 1000
    })
    
    if (error) {
      console.error('❌ İstatistik alınamadı:', error)
      return
    }
    
    const now = new Date()
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    
    const stats = {
      total: users.users.length,
      anonymous: 0,
      withEmail: 0,
      lastDay: 0,
      lastWeek: 0,
      lastMonth: 0,
      inactive: 0
    }
    
    users.users.forEach(user => {
      if (user.is_anonymous || !user.email) {
        stats.anonymous++
      } else {
        stats.withEmail++
      }
      
      const createdAt = new Date(user.created_at)
      if (createdAt > oneDayAgo) stats.lastDay++
      if (createdAt > sevenDaysAgo) stats.lastWeek++
      if (createdAt > thirtyDaysAgo) stats.lastMonth++
      
      const lastSignIn = user.last_sign_in_at ? new Date(user.last_sign_in_at) : createdAt
      if (lastSignIn < sevenDaysAgo) stats.inactive++
    })
    
    console.log(`📊 Toplam kullanıcı: ${stats.total}`)
    console.log(`👤 Anonymous: ${stats.anonymous}`)
    console.log(`📧 Email'li: ${stats.withEmail}`)
    console.log(`🆕 Son 24 saat: ${stats.lastDay}`)
    console.log(`📅 Son 7 gün: ${stats.lastWeek}`)
    console.log(`📆 Son 30 gün: ${stats.lastMonth}`)
    console.log(`😴 7 günden uzun inactive: ${stats.inactive}`)
    
  } catch (error) {
    console.error('❌ İstatistik hatası:', error)
  }
}

// Ana fonksiyon
async function main() {
  console.log('🚀 Supabase Auth Temizlik Aracı Başlatıldı')
  console.log('=' .repeat(50))
  
  // Önce istatistikleri göster
  await getAuthStats()
  
  console.log('\n' + '='.repeat(50))
  
  // Temizlik yap
  await cleanupExpiredAnonymousUsers()
  
  console.log('\n' + '='.repeat(50))
  
  // Temizlik sonrası istatistikleri göster
  await getAuthStats()
  
  console.log('\n✨ Temizlik işlemi tamamlandı!')
}

// Script çalıştır
if (require.main === module) {
  main().catch(console.error)
}

module.exports = { cleanupExpiredAnonymousUsers, getAuthStats }