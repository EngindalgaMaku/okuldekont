const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function updateCompaniesTeacher() {
  console.log('🔄 Şirketlere koordinatör öğretmen atanıyor...')

  try {
    // Tüm şirketleri al
    const companies = await prisma.companyProfile.findMany({
      include: {
        stajlar: {
          include: {
            teacher: {
              select: {
                id: true,
                name: true,
                surname: true
              }
            }
          },
          take: 1 // Sadece ilk stajdan öğretmen bilgisini al
        }
      }
    })

    console.log(`📊 ${companies.length} şirket bulundu`)

    let updatedCount = 0

    for (const company of companies) {
      if (company.stajlar.length > 0 && company.stajlar[0].teacher) {
        const teacher = company.stajlar[0].teacher
        
        await prisma.companyProfile.update({
          where: { id: company.id },
          data: {
            teacherId: teacher.id,
            teacherAssignedAt: new Date()
          }
        })

        updatedCount++
        console.log(`✅ ${company.name} -> ${teacher.name} ${teacher.surname}`)
      }
    }

    console.log(`\n🎉 ${updatedCount} şirketin koordinatör öğretmeni güncellendi!`)

  } catch (error) {
    console.error('❌ Güncelleme hatası:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Script çalıştır
updateCompaniesTeacher()
  .catch((error) => {
    console.error('❌ Script hatası:', error)
    process.exit(1)
  })