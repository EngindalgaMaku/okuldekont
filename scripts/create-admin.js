const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function createAdminUser() {
  try {
    // Şifreyi hash'le
    const hashedPassword = await bcrypt.hash('123456', 12)
    
    // Önce mevcut admin@ozdilek kullanıcısını kontrol et
    const existingUser = await prisma.user.findUnique({
      where: { email: 'admin@ozdilek' }
    })

    if (existingUser) {
      console.log('Mevcut admin kullanıcısı bulundu, şifre güncelleniyor...')
      
      // Şifreyi güncelle
      await prisma.user.update({
        where: { email: 'admin@ozdilek' },
        data: {
          password: hashedPassword,
          role: 'ADMIN'
        }
      })

      // AdminProfile'ı kontrol et ve oluştur
      const adminProfile = await prisma.adminProfile.findUnique({
        where: { userId: existingUser.id }
      })

      if (!adminProfile) {
        await prisma.adminProfile.create({
          data: {
            name: 'System Administrator',
            email: 'admin@ozdilek',
            role: 'ADMIN',
            userId: existingUser.id
          }
        })
        console.log('Admin profili oluşturuldu.')
      }

      console.log('✅ Admin kullanıcısı güncellendi!')
      console.log('📧 Email: admin@ozdilek')
      console.log('🔒 Şifre: 123456')
      
    } else {
      console.log('Yeni admin kullanıcısı oluşturuluyor...')
      
      // Yeni kullanıcı oluştur
      const newUser = await prisma.user.create({
        data: {
          email: 'admin@ozdilek',
          password: hashedPassword,
          role: 'ADMIN'
        }
      })

      // Admin profili oluştur
      await prisma.adminProfile.create({
        data: {
          name: 'System Administrator',
          email: 'admin@ozdilek',
          role: 'ADMIN',
          userId: newUser.id
        }
      })

      console.log('✅ Admin kullanıcısı başarıyla oluşturuldu!')
      console.log('📧 Email: admin@ozdilek')
      console.log('🔒 Şifre: 123456')
    }

  } catch (error) {
    console.error('❌ Hata:', error)
    
    if (error.code === 'P2002') {
      console.log('Bu email adresi zaten kayıtlı.')
    }
  } finally {
    await prisma.$disconnect()
  }
}

// Script'i çalıştır
createAdminUser()