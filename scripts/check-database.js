const { PrismaClient } = require('@prisma/client')
require('dotenv').config()

const prisma = new PrismaClient()

async function checkDatabase() {
  try {
    console.log('🔍 Veritabanı durumu kontrol ediliyor...\n')
    
    // Aktif stajları kontrol et
    const activeInternships = await prisma.staj.findMany({
      where: {
        status: 'ACTIVE'
      },
      include: {
        student: {
          select: {
            name: true,
            surname: true,
            studentNumber: true
          }
        },
        company: {
          select: {
            name: true
          }
        },
        teacher: {
          select: {
            name: true,
            surname: true
          }
        }
      },
      orderBy: [
        { company: { name: 'asc' } },
        { student: { name: 'asc' } }
      ]
    })
    
    console.log(`📊 Aktif staj sayısı: ${activeInternships.length}\n`)
    
    // Şirket bazında grupla
    const companiesMap = new Map()
    
    activeInternships.forEach(staj => {
      const companyName = staj.company?.name || 'Bilinmeyen Şirket'
      const studentInfo = {
        name: `${staj.student?.name || ''} ${staj.student?.surname || ''}`.trim(),
        number: staj.student?.studentNumber || 'N/A',
        teacher: staj.teacher ? `${staj.teacher.name} ${staj.teacher.surname || ''}`.trim() : 'ATANMAMIŞ',
        teacherId: staj.teacherId
      }
      
      if (!companiesMap.has(companyName)) {
        companiesMap.set(companyName, [])
      }
      companiesMap.get(companyName).push(studentInfo)
    })
    
    // Şirketleri listele
    for (const [companyName, students] of companiesMap) {
      console.log(`🏢 ${companyName}:`)
      students.forEach(student => {
        console.log(`  👤 ${student.name} (${student.number}) → 👨‍🏫 ${student.teacher}`)
      })
      
      // Aynı şirkette farklı koordinatörler var mı kontrol et
      const uniqueTeachers = [...new Set(students.map(s => s.teacherId).filter(Boolean))]
      if (uniqueTeachers.length > 1) {
        console.log(`  ⚠️ Bu şirkette ${uniqueTeachers.length} farklı koordinatör var!`)
      }
      console.log('')
    }
    
    // Koordinatör atanmamış stajlar
    const unassigned = activeInternships.filter(staj => !staj.teacherId)
    if (unassigned.length > 0) {
      console.log(`⚠️ Koordinatör atanmamış ${unassigned.length} staj:`)
      unassigned.forEach(staj => {
        console.log(`  - ${staj.student?.name} ${staj.student?.surname} (${staj.company?.name})`)
      })
      console.log('')
    }
    
    // Öğretmen atama geçmişini kontrol et
    try {
      const recentAssignments = await prisma.teacherAssignmentHistory.findMany({
        orderBy: { assignedAt: 'desc' },
        take: 10,
        include: {
          company: { select: { name: true } },
          teacher: { select: { name: true, surname: true } },
          previousTeacher: { select: { name: true, surname: true } }
        }
      })
      
      if (recentAssignments.length > 0) {
        console.log('📋 Son koordinatör değişiklikleri:')
        recentAssignments.forEach(assignment => {
          const newTeacher = assignment.teacher ? `${assignment.teacher.name} ${assignment.teacher.surname || ''}`.trim() : 'YOK'
          const oldTeacher = assignment.previousTeacher ? `${assignment.previousTeacher.name} ${assignment.previousTeacher.surname || ''}`.trim() : 'YOK'
          console.log(`  ${assignment.company?.name}: ${oldTeacher} → ${newTeacher} (${assignment.assignedAt.toLocaleDateString('tr-TR')})`)
        })
      }
    } catch (error) {
      console.log('⚠️ Öğretmen atama geçmişi tablosu bulunamadı')
    }
    
    await prisma.$disconnect()
  } catch (error) {
    console.error('❌ Hata:', error)
    await prisma.$disconnect()
  }
}

checkDatabase()
