const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function resetAdminPassword() {
  try {
    console.log('🔄 Admin şifre sıfırlama işlemi başlatılıyor...')

    // Önce admin@ozdilek kullanıcısını bul
    const adminUser = await prisma.user.findUnique({
      where: { email: 'admin@ozdilek' },
      include: {
        adminProfile: true
      }
    })

    if (!adminUser) {
      console.log('❌ admin@ozdilek kullanıcısı bulunamadı!')
      
      // Tüm kullanıcıları listele
      const allUsers = await prisma.user.findMany({
        where: { role: 'ADMIN' },
        include: {
          adminProfile: true
        }
      })
      
      console.log('\n📋 Mevcut admin kullanıcıları:')
      allUsers.forEach(user => {
        console.log(`- ${user.email} (${user.role})`)
      })
      
      return
    }

    console.log(`✅ Admin kullanıcısı bulundu: ${adminUser.email}`)
    
    // Yeni şifreyi hash'le
    const newPassword = '123456'
    const hashedPassword = await bcrypt.hash(newPassword, 12)
    
    // Şifreyi güncelle
    await prisma.user.update({
      where: { email: 'admin@ozdilek' },
      data: {
        password: hashedPassword,
        role: 'ADMIN'
      }
    })
    
    // Admin profili kontrol et ve varsa güncelle, yoksa oluştur
    if (adminUser.adminProfile) {
      await prisma.adminProfile.update({
        where: { userId: adminUser.id },
        data: {
          name: 'Özdilek Admin',
          email: 'admin@ozdilek',
          role: 'ADMIN'
        }
      })
      console.log('✅ Admin profili güncellendi')
    } else {
      await prisma.adminProfile.create({
        data: {
          name: 'Özdilek Admin',
          email: 'admin@ozdilek',
          role: 'ADMIN',
          userId: adminUser.id
        }
      })
      console.log('✅ Admin profili oluşturuldu')
    }

    console.log('\n🎉 Şifre başarıyla sıfırlandı!')
    console.log('📧 Email: admin@ozdilek')
    console.log('🔐 Yeni Şifre: 123456')
    console.log('\n🌐 Giriş için: https://ozdilek.kodleon.com/admin/login')

  } catch (error) {
    console.error('❌ Hata:', error)
  } finally {
    await prisma.$disconnect()
  }
}

resetAdminPassword()