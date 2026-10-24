const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkRecentInternships() {
  console.log('🔍 Son eklenen stajların koordinatör öğretmen durumu kontrol ediliyor...\n');
  
  try {
    // Son 7 günde eklenen stajları getir
    const lastWeek = new Date();
    lastWeek.setDate(lastWeek.getDate() - 7);
    
    // Son 30 günde eklenen stajları getir
    const lastMonth = new Date();
    lastMonth.setDate(lastMonth.getDate() - 30);

    console.log(`📅 Son 7 gün: ${lastWeek.toISOString()}`);
    console.log(`📅 Son 30 gün: ${lastMonth.toISOString()}\n`);

    // Son eklenen stajları tarih sırasına göre getir
    const recentInternships = await prisma.staj.findMany({
      where: {
        createdAt: {
          gte: lastMonth
        }
      },
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
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    console.log(`📊 Son 30 günde eklenen staj sayısı: ${recentInternships.length}\n`);

    if (recentInternships.length === 0) {
      console.log('ℹ️ Son 30 günde yeni staj ataması yapılmamış.');
      
      // En son eklenen 10 stajı kontrol et
      console.log('\n📊 En son eklenen 10 stajı kontrol ediliyor...');
      const lastInternships = await prisma.staj.findMany({
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
              name: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: 10
      });

      console.log(`\n🔍 En son eklenen stajlar:`);
      lastInternships.forEach((staj, index) => {
        console.log(`${index + 1}. Öğrenci: ${staj.student.name} ${staj.student.surname}`);
        console.log(`   İşletme: ${staj.company.name}`);
        console.log(`   Koordinatör: ${staj.teacher ? `${staj.teacher.name} ${staj.teacher.surname}` : '❌ YOK'}`);
        console.log(`   Oluşturulma: ${staj.createdAt.toLocaleString('tr-TR')}`);
        console.log(`   Durum: ${staj.status}`);
        console.log('   ---');
      });
      
      return;
    }

    // Koordinatör öğretmeni olan/olmayan stajları ayır
    const withTeacher = recentInternships.filter(staj => staj.teacherId !== null);
    const withoutTeacher = recentInternships.filter(staj => staj.teacherId === null);

    console.log(`✅ Koordinatör öğretmeni olan: ${withTeacher.length}`);
    console.log(`❌ Koordinatör öğretmeni olmayan: ${withoutTeacher.length}\n`);

    if (withoutTeacher.length > 0) {
      console.log('❌ Koordinatör öğretmeni olmayan son stajlar:');
      console.log('='.repeat(60));
      withoutTeacher.forEach((staj, index) => {
        console.log(`${index + 1}. Öğrenci: ${staj.student.name} ${staj.student.surname}`);
        console.log(`   İşletme: ${staj.company.name}`);
        console.log(`   İşletme Öğretmeni: ${staj.company.teacher ? 
          `${staj.company.teacher.name} ${staj.company.teacher.surname}` : '❌ YOK'}`);
        console.log(`   Oluşturulma: ${staj.createdAt.toLocaleString('tr-TR')}`);
        console.log(`   Durum: ${staj.status}`);
        console.log('   ---');
      });
    }

    // Son 7 gündekileri özellikle kontrol et
    const lastWeekInternships = recentInternships.filter(staj => staj.createdAt >= lastWeek);
    if (lastWeekInternships.length > 0) {
      console.log(`\n🔥 Son 7 günde eklenen stajlar (${lastWeekInternships.length} adet):`);
      const lastWeekWithoutTeacher = lastWeekInternships.filter(staj => staj.teacherId === null);
      console.log(`   ❌ Koordinatör öğretmeni olmayan: ${lastWeekWithoutTeacher.length}`);
      
      if (lastWeekWithoutTeacher.length > 0) {
        lastWeekWithoutTeacher.forEach((staj, index) => {
          console.log(`   ${index + 1}. ${staj.student.name} ${staj.student.surname} -> ${staj.company.name}`);
        });
      }
    }

    // İstatistikler
    console.log('\n📈 Son 30 gün İstatistikleri:');
    console.log(`   - Toplam yeni staj: ${recentInternships.length}`);
    if (recentInternships.length > 0) {
      console.log(`   - Koordinatör öğretmeni var: ${withTeacher.length} (${(withTeacher.length/recentInternships.length*100).toFixed(1)}%)`);
      console.log(`   - Koordinatör öğretmeni yok: ${withoutTeacher.length} (${(withoutTeacher.length/recentInternships.length*100).toFixed(1)}%)`);
    }

  } catch (error) {
    console.error('❌ Hata:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkRecentInternships();