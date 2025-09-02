const { PrismaClient } = require('@prisma/client')
require('dotenv').config()

const prisma = new PrismaClient()

async function checkCoordinators() {
  try {
    console.log('🔍 Aktif stajlar ve koordinatörleri kontrol ediliyor...')
    
    const internships = await prisma.staj.findMany({
      where: {
        status: 'ACTIVE'
      },
      include: {
        student: true,
        company: true,
        teacher: true
      },
      orderBy: [
        { company: { name: 'asc' } },
        { student: { name: 'asc' } }
      ]
    })
    
    console.log(`\n📊 Toplam ${internships.length} aktif staj bulundu:\n`)
    
    let currentCompany = ''
    internships.forEach((staj, index) => {
      const companyName = staj.company?.name || 'Bilinmeyen Şirket'
      const studentName = `${staj.student?.name || ''} ${staj.student?.surname || ''}`.trim()
      const teacherName = staj.teacher?.name || 'ATANMAMIŞ'
      
      if (companyName !== currentCompany) {
        if (currentCompany !== '') console.log('')
        console.log(`🏢 ${companyName}:`)
        currentCompany = companyName
      }
      
      console.log(`  👤 ${studentName} → 👨‍🏫 ${teacherName}`)
    })
    
    // Koordinatör atanmamış stajları kontrol et
    const unassignedInternships = internships.filter(staj => !staj.teacher)
    if (unassignedInternships.length > 0) {
      console.log(`\n⚠️ ${unassignedInternships.length} stajda koordinatör atanmamış!`)
    }
    
    await prisma.$disconnect()
  } catch (error) {
    console.error('❌ Hata:', error)
    await prisma.$disconnect()
  }
}

checkCoordinators()
