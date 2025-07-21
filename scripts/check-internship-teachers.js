const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkInternshipTeachers() {
  console.log('🔍 Stajların koordinatör öğretmen durumu kontrol ediliyor...\n');
  
  try {
    // Tüm stajları koordinatör öğretmen bilgisiyle birlikte getir
    const internships = await prisma.staj.findMany({
      include: {
        teacher: {
          select: {
            id: true,
            name: true,
            surname: true
          }
        },
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

    console.log(`📊 Toplam staj sayısı: ${internships.length}\n`);

    // Koordinatör öğretmeni olan/olmayan stajları ayır
    const withTeacher = internships.filter(staj => staj.teacherId !== null);
    const withoutTeacher = internships.filter(staj => staj.teacherId === null);

    console.log(`✅ Koordinatör öğretmeni olan stajlar: ${withTeacher.length}`);
    console.log(`❌ Koordinatör öğretmeni olmayan stajlar: ${withoutTeacher.length}\n`);

    if (withoutTeacher.length > 0) {
      console.log('❌ Koordinatör öğretmeni olmayan stajlar:');
      console.log('='.repeat(50));
      withoutTeacher.forEach((staj, index) => {
        console.log(`${index + 1}. Öğrenci: ${staj.student.name} ${staj.student.surname}`);
        console.log(`   İşletme: ${staj.company.name}`);
        console.log(`   İşletme Öğretmeni: ${staj.company.teacher ? 
          `${staj.company.teacher.name} ${staj.company.teacher.surname}` : 'YOK'}`);
        console.log(`   Durum: ${staj.status}`);
        console.log('   ---');
      });
    }

    if (withTeacher.length > 0) {
      console.log('\n✅ Koordinatör öğretmeni olan stajlar (ilk 10):');
      console.log('='.repeat(50));
      withTeacher.slice(0, 10).forEach((staj, index) => {
        console.log(`${index + 1}. Öğrenci: ${staj.student.name} ${staj.student.surname}`);
        console.log(`   İşletme: ${staj.company.name}`);
        console.log(`   Koordinatör Öğretmen: ${staj.teacher.name} ${staj.teacher.surname}`);
        console.log(`   Durum: ${staj.status}`);
        console.log('   ---');
      });
    }

    // İstatistikler
    console.log('\n📈 İstatistikler:');
    console.log(`   - Toplam staj: ${internships.length}`);
    console.log(`   - Koordinatör öğretmeni var: ${withTeacher.length} (${(withTeacher.length/internships.length*100).toFixed(1)}%)`);
    console.log(`   - Koordinatör öğretmeni yok: ${withoutTeacher.length} (${(withoutTeacher.length/internships.length*100).toFixed(1)}%)`);

  } catch (error) {
    console.error('❌ Hata:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkInternshipTeachers();