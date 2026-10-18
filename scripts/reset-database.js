const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function resetDatabase() {
  try {
    console.log('🔄 Veritabanı sıfırlanıyor...')

    // Delete all data in the correct order (respecting foreign key constraints)
    await prisma.internshipHistory.deleteMany()
    console.log('✅ InternshipHistory tablosu temizlendi')

    await prisma.dekont.deleteMany()
    console.log('✅ Dekont tablosu temizlendi')

    await prisma.staj.deleteMany()
    console.log('✅ Staj tablosu temizlendi')

    await prisma.belge.deleteMany()
    console.log('✅ Belge tablosu temizlendi')

    await prisma.gorevBelgesi.deleteMany()
    console.log('✅ GorevBelgesi tablosu temizlendi')

    await prisma.notification.deleteMany()
    console.log('✅ Notification tablosu temizlendi')

    await prisma.student.deleteMany()
    console.log('✅ Student tablosu temizlendi')

    await prisma.adminProfile.deleteMany()
    console.log('✅ AdminProfile tablosu temizlendi')

    await prisma.teacherProfile.deleteMany()
    console.log('✅ TeacherProfile tablosu temizlendi')

    await prisma.companyProfile.deleteMany()
    console.log('✅ CompanyProfile tablosu temizlendi')

    await prisma.user.deleteMany()
    console.log('✅ User tablosu temizlendi')

    await prisma.class.deleteMany()
    console.log('✅ Class tablosu temizlendi')

    await prisma.alan.deleteMany()
    console.log('✅ Alan tablosu temizlendi')

    await prisma.egitimYili.deleteMany()
    console.log('✅ EgitimYili tablosu temizlendi')

    await prisma.systemSetting.deleteMany()
    console.log('✅ SystemSetting tablosu temizlendi')

    console.log('\n🎉 Veritabanı başarıyla temizlendi!')
    console.log('📝 Tüm tablolar boşaltıldı, yeni veriler eklenmeye hazır.')

  } catch (error) {
    console.error('❌ Hata:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Script'i çalıştır
resetDatabase()