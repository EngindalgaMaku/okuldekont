const { PrismaClient } = require('@prisma/client')
require('dotenv').config()

const prisma = new PrismaClient()

async function fixCoordinatorData() {
  try {
    console.log('🔧 Koordinatör verilerini düzeltiyoruz...\n')
    
    // Önce mevcut durumu kontrol et
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
        { company: { name: 'asc' } }
      ]
    })
    
    console.log(`📊 Toplam ${activeInternships.length} aktif staj bulundu\n`)
    
    // Şirket bazında grupla ve sorunları tespit et
    const companiesMap = new Map()
    
    activeInternships.forEach(staj => {
      const companyName = staj.company?.name || 'Bilinmeyen Şirket'
      const studentInfo = {
        id: staj.id,
        name: `${staj.student?.name || ''} ${staj.student?.surname || ''}`.trim(),
        number: staj.student?.studentNumber || 'N/A',
        teacher: staj.teacher ? `${staj.teacher.name} ${staj.teacher.surname || ''}`.trim() : 'ATANMAMIŞ',
        teacherId: staj.teacherId,
        companyId: staj.companyId
      }
      
      if (!companiesMap.has(companyName)) {
        companiesMap.set(companyName, [])
      }
      companiesMap.get(companyName).push(studentInfo)
    })
    
    // Sorunlu şirketleri tespit et
    const problematicCompanies = []
    
    for (const [companyName, students] of companiesMap) {
      const uniqueTeachers = [...new Set(students.map(s => s.teacherId).filter(Boolean))]
      
      if (uniqueTeachers.length > 1) {
        console.log(`⚠️ ${companyName}: ${uniqueTeachers.length} farklı koordinatör`)
        students.forEach(student => {
          console.log(`  - ${student.name}: ${student.teacher}`)
        })
        
        problematicCompanies.push({
          companyName,
          students,
          teachers: uniqueTeachers
        })
        console.log('')
      }
    }
    
    if (problematicCompanies.length === 0) {
      console.log('✅ Tüm şirketlerde koordinatör atamaları tutarlı!')
      await prisma.$disconnect()
      return
    }
    
    // Kullanıcıdan onay al
    const readline = require('readline')
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    })
    
    console.log(`\n🔧 ${problematicCompanies.length} şirkette koordinatör tutarsızlığı tespit edildi.`)
    console.log('Her şirket için en son atanan koordinatörü tüm öğrencilere uygulayalım mı? (y/n): ')
    
    const answer = await new Promise(resolve => {
      rl.question('', resolve)
    })
    
    rl.close()
    
    if (answer.toLowerCase() !== 'y' && answer.toLowerCase() !== 'yes') {
      console.log('❌ İşlem iptal edildi.')
      await prisma.$disconnect()
      return
    }
    
    // Sistem kullanıcısını bul
    const systemUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: 'system@okuldekont.com' },
          { role: 'SYSTEM' }
        ]
      }
    })
    
    const systemUserId = systemUser?.id || 'system'
    
    // Her sorunlu şirket için düzeltme yap
    for (const company of problematicCompanies) {
      console.log(`\n🔧 ${company.companyName} şirketi düzeltiliyor...`)
      
      // En son atanan koordinatörü bul (en yüksek ID'li stajdaki koordinatör)
      const latestInternship = company.students
        .filter(s => s.teacherId)
        .sort((a, b) => b.id.localeCompare(a.id))[0]
      
      if (!latestInternship) {
        console.log('  ⚠️ Koordinatör bulunamadı, atlanıyor...')
        continue
      }
      
      const targetTeacherId = latestInternship.teacherId
      const targetTeacherName = latestInternship.teacher
      
      console.log(`  👨‍🏫 Hedef koordinatör: ${targetTeacherName}`)
      
      // Transaction ile tüm öğrencileri güncelle
      await prisma.$transaction(async (tx) => {
        for (const student of company.students) {
          if (student.teacherId !== targetTeacherId) {
            // Stajı güncelle
            await tx.staj.update({
              where: { id: student.id },
              data: { teacherId: targetTeacherId }
            })
            
            // Öğretmen atama geçmişi oluştur
            try {
              await tx.teacherAssignmentHistory.create({
                data: {
                  companyId: student.companyId,
                  previousTeacherId: student.teacherId,
                  teacherId: targetTeacherId,
                  assignedAt: new Date(),
                  assignedBy: systemUserId,
                  reason: 'Koordinatör tutarsızlığı düzeltme'
                }
              })
            } catch (error) {
              console.log('    ⚠️ Atama geçmişi kaydedilemedi (tablo yok)')
            }
            
            console.log(`    ✅ ${student.name} güncellendi`)
          }
        }
      })
    }
    
    console.log('\n✅ Koordinatör düzeltmeleri tamamlandı!')
    await prisma.$disconnect()
    
  } catch (error) {
    console.error('❌ Hata:', error)
    await prisma.$disconnect()
  }
}

fixCoordinatorData()
