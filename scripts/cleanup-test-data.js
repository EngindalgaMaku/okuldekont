const { PrismaClient } = require('@prisma/client')
require('dotenv').config()

const prisma = new PrismaClient()

async function cleanupTestData() {
  try {
    console.log('🧹 Bugünkü test verilerini temizliyoruz...')
    
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    
    console.log(`📅 Temizlenecek tarih aralığı: ${today.toISOString()} - ${tomorrow.toISOString()}`)
    
    // Bugünkü staj işlemlerini bul
    const todaysInternships = await prisma.staj.findMany({
      where: {
        OR: [
          {
            createdAt: {
              gte: today,
              lt: tomorrow
            }
          },
          {
            lastModifiedAt: {
              gte: today,
              lt: tomorrow
            }
          },
          {
            terminationDate: {
              gte: today,
              lt: tomorrow
            }
          }
        ]
      },
      include: {
        student: true,
        company: true,
        teacher: true
      }
    })
    
    console.log(`📊 Bulunan bugünkü staj kayıtları: ${todaysInternships.length}`)
    
    if (todaysInternships.length > 0) {
      console.log('📋 Silinecek stajlar:')
      todaysInternships.forEach((staj, index) => {
        console.log(`  ${index + 1}. ${staj.student?.name} ${staj.student?.surname} - ${staj.company?.name} (${staj.status})`)
      })
    }
    
    // Bugünkü audit trail kayıtlarını bul
    let todaysAuditTrails = []
    try {
      todaysAuditTrails = await prisma.internshipHistory.findMany({
        where: {
          createdAt: {
            gte: today,
            lt: tomorrow
          }
        }
      })
    } catch (error) {
      console.log('⚠️ InternshipHistory tablosu bulunamadı, atlanıyor...')
      todaysAuditTrails = []
    }
    
    console.log(`📊 Bulunan bugünkü audit trail kayıtları: ${todaysAuditTrails.length}`)
    
    // Bugünkü teacher assignment history kayıtlarını bul
    let todaysTeacherAssignments = []
    try {
      todaysTeacherAssignments = await prisma.teacherAssignmentHistory.findMany({
        where: {
          assignedAt: {
            gte: today,
            lt: tomorrow
          }
        }
      })
    } catch (error) {
      console.log('⚠️ TeacherAssignmentHistory tablosu bulunamadı, atlanıyor...')
      todaysTeacherAssignments = []
    }
    
    console.log(`📊 Bulunan bugünkü öğretmen atama kayıtları: ${todaysTeacherAssignments.length}`)
    
    // Kullanıcıdan onay al
    const readline = require('readline')
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    })
    
    const answer = await new Promise((resolve) => {
      rl.question('❓ Bu kayıtları silmek istediğinizden emin misiniz? (y/N): ', resolve)
    })
    
    rl.close()
    
    if (answer.toLowerCase() !== 'y' && answer.toLowerCase() !== 'yes') {
      console.log('❌ İşlem iptal edildi.')
      return
    }
    
    // Transaction ile tüm kayıtları sil
    await prisma.$transaction(async (tx) => {
      // Audit trail kayıtlarını sil (eğer tablo varsa)
      if (todaysAuditTrails.length > 0) {
        try {
          const deletedAuditTrails = await prisma.internshipHistory.deleteMany({
            where: {
              createdAt: {
                gte: today,
                lt: tomorrow
              }
            }
          })
          console.log(`🗑️ ${deletedAuditTrails.count} audit trail kaydı silindi`)
        } catch (error) {
          console.log('⚠️ Audit trail kayıtları silinemedi, atlanıyor...')
        }
      }
      
      // Teacher assignment history kayıtlarını sil (eğer tablo varsa)
      if (todaysTeacherAssignments.length > 0) {
        try {
          await prisma.teacherAssignmentHistory.deleteMany({
            where: {
              assignedAt: {
                gte: today,
                lt: tomorrow
              }
            }
          })
          console.log(`✅ ${todaysTeacherAssignments.length} öğretmen atama kaydı silindi`)
        } catch (error) {
          console.log('⚠️ Öğretmen atama kayıtları silinemedi, atlanıyor...')
        }
      }
      
      // Bugün oluşturulan stajları sil
      const createdTodayInternships = todaysInternships.filter(staj => 
        staj.createdAt >= today && staj.createdAt < tomorrow
      )
      
      if (createdTodayInternships.length > 0) {
        for (const staj of createdTodayInternships) {
          await tx.staj.delete({
            where: { id: staj.id }
          })
        }
        console.log(`🗑️ ${createdTodayInternships.length} bugün oluşturulan staj kaydı silindi`)
      }
      
      // Bugün feshedilen stajları aktif duruma getir
      const terminatedTodayInternships = todaysInternships.filter(staj => 
        staj.terminationDate && staj.terminationDate >= today && staj.terminationDate < tomorrow
      )
      
      if (terminatedTodayInternships.length > 0) {
        for (const staj of terminatedTodayInternships) {
          await tx.staj.update({
            where: { id: staj.id },
            data: {
              status: 'ACTIVE',
              terminationDate: null,
              lastModifiedAt: staj.createdAt, // Orijinal oluşturulma tarihine geri döndür
              lastModifiedBy: null
            }
          })
        }
        console.log(`🔄 ${terminatedTodayInternships.length} bugün feshedilen staj aktif duruma getirildi`)
      }
      
      // Bugün koordinatörü değiştirilen stajları eski haline getir
      const coordinatorChangedInternships = todaysInternships.filter(staj => 
        staj.lastModifiedAt && staj.lastModifiedAt >= today && staj.lastModifiedAt < tomorrow &&
        !staj.terminationDate && staj.createdAt < today
      )
      
      if (coordinatorChangedInternships.length > 0) {
        console.log(`⚠️ ${coordinatorChangedInternships.length} stajın koordinatörü bugün değiştirilmiş. Bu değişiklikleri geri almak için manuel kontrol gerekebilir.`)
      }
    })
    
    console.log('✅ Test verileri başarıyla temizlendi!')
    
  } catch (error) {
    console.error('❌ Hata:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Script'i çalıştır
cleanupTestData()
