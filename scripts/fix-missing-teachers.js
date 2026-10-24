const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

function getRandomElement(array) {
  return array[Math.floor(Math.random() * array.length)];
}

async function fixMissingTeachers() {
  console.log('🔧 Koordinatör öğretmeni eksik olan stajlar düzeltiliyor...\n');
  
  try {
    // Koordinatör öğretmeni olmayan stajları bul
    const internshipsWithoutTeacher = await prisma.staj.findMany({
      where: { 
        teacherId: null 
      },
      include: {
        student: {
          select: {
            name: true,
            surname: true
          }
        },
        company: {
          select: {
            name: true,
            teacher: {
              select: {
                id: true,
                name: true,
                surname: true
              }
            }
          }
        }
      }
    });

    if (internshipsWithoutTeacher.length === 0) {
      console.log('✅ Tüm stajlarda koordinatör öğretmen mevcut!');
      return;
    }

    // Tüm aktif öğretmenleri getir
    const teachers = await prisma.teacherProfile.findMany({
      where: { active: true }
    });

    if (teachers.length === 0) {
      console.log('❌ Hiç aktif öğretmen bulunamadı!');
      return;
    }

    console.log(`🔍 ${internshipsWithoutTeacher.length} stajda koordinatör öğretmen eksik`);
    console.log(`📚 ${teachers.length} aktif öğretmen mevcut\n`);

    let fixedCount = 0;

    for (const internship of internshipsWithoutTeacher) {
      let teacherToAssign;

      // Önce işletmenin öğretmenini kontrol et
      if (internship.company.teacher) {
        teacherToAssign = internship.company.teacher;
        console.log(`🏢 ${internship.student.name} ${internship.student.surname} - İşletme öğretmeni atandı: ${teacherToAssign.name} ${teacherToAssign.surname}`);
      } else {
        // İşletmenin öğretmeni yoksa rastgele bir öğretmen seç
        const randomTeacher = getRandomElement(teachers);
        teacherToAssign = randomTeacher;
        console.log(`🎲 ${internship.student.name} ${internship.student.surname} - Rastgele öğretmen atandı: ${teacherToAssign.name} ${teacherToAssign.surname}`);
      }

      // Stajı güncelle
      await prisma.staj.update({
        where: { id: internship.id },
        data: { 
          teacherId: teacherToAssign.id,
          lastModifiedAt: new Date()
        }
      });

      fixedCount++;
    }

    console.log(`\n✅ ${fixedCount} stajın koordinatör öğretmeni başarıyla atandı!`);

    // Tekrar kontrol et
    const remainingWithoutTeacher = await prisma.staj.count({
      where: { teacherId: null }
    });

    console.log(`\n📊 Son durum:`);
    console.log(`   - Koordinatör öğretmeni eksik staj: ${remainingWithoutTeacher}`);

  } catch (error) {
    console.error('❌ Hata:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixMissingTeachers();