const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function testAdminLogin() {
  try {
    console.log('🔍 Admin login debug testi başlatılıyor...')

    // admin@ozdilek kullanıcısını bul
    const user = await prisma.user.findUnique({
      where: { email: 'admin@ozdilek' },
      include: {
        adminProfile: true
      }
    })

    if (!user) {
      console.log('❌ admin@ozdilek kullanıcısı bulunamadı!')
      return
    }

    console.log('✅ User bulundu:')
    console.log('  - Email:', user.email)
    console.log('  - Role:', user.role)
    console.log('  - Password hash var:', user.password ? 'EVET' : 'HAYIR')
    console.log('  - Admin profile var:', user.adminProfile ? 'EVET' : 'HAYIR')

    if (user.adminProfile) {
      console.log('  - Admin profile name:', user.adminProfile.name)
      console.log('  - Admin profile email:', user.adminProfile.email)
    }

    // Şifre test et
    const testPassword = '123456'
    const isValid = await bcrypt.compare(testPassword, user.password)
    
    console.log('\n🔐 Şifre testi:')
    console.log('  - Test şifre:', testPassword)
    console.log('  - Hash doğrulama:', isValid ? '✅ DOĞRU' : '❌ YANLIŞ')
    
    if (!isValid) {
      console.log('\n🔄 Şifreyi yeniden hash\'leyip güncelleyeceğim...')
      const newHash = await bcrypt.hash(testPassword, 12)
      
      await prisma.user.update({
        where: { email: 'admin@ozdilek' },
        data: { password: newHash }
      })
      
      console.log('✅ Şifre hash\'i yeniden oluşturuldu')
      
      // Tekrar test et
      const user2 = await prisma.user.findUnique({
        where: { email: 'admin@ozdilek' }
      })
      
      const isValid2 = await bcrypt.compare(testPassword, user2.password)
      console.log('  - Yeni hash doğrulama:', isValid2 ? '✅ DOĞRU' : '❌ YANLIŞ')
    }

  } catch (error) {
    console.error('❌ Hata:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testAdminLogin()