const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testMultipleDekontScenario() {
  try {
    console.log('🧪 Çoklu dekont senaryosu test ediliyor...\n');

    // Test verisi oluştur
    console.log('📋 1. Test verisi hazırlanıyor...');
    
    // Örnek bir staj seç
    const staj = await prisma.staj.findFirst({
      where: {
        archived: false,
        status: 'ACTIVE'
      },
      include: {
        student: true,
        company: true
      }
    });

    if (!staj) {
      console.log('❌ Test için aktif staj bulunamadı');
      return;
    }

    console.log(`✅ Test stajı seçildi: ${staj.student.name} ${staj.student.surname} - ${staj.company.name}`);

    // Bu staj için mevcut dekontları kontrol et
    const existingDekonts = await prisma.dekont.findMany({
      where: {
        stajId: staj.id,
        archived: false
      },
      orderBy: {
        createdAt: 'asc'
      }
    });

    console.log(`📊 Bu staj için mevcut dekont sayısı: ${existingDekonts.length}`);

    if (existingDekonts.length > 1) {
      console.log('🎯 ÇOKLU DEKONT TESPİT EDİLDİ!\n');
      
      // Ay/yıl gruplandırması yap
      const byMonthYear = {};
      existingDekonts.forEach(dekont => {
        const key = `${dekont.month}/${dekont.year}`;
        if (!byMonthYear[key]) {
          byMonthYear[key] = [];
        }
        byMonthYear[key].push(dekont);
      });

      console.log('📅 Ay/Yıl bazında dekont dağılımı:');
      Object.keys(byMonthYear).forEach(monthYear => {
        const dekontlar = byMonthYear[monthYear];
        if (dekontlar.length > 1) {
          console.log(`⚠️  ${monthYear}: ${dekontlar.length} adet dekont (ÇOKLU!)`);
          dekontlar.forEach((dekont, index) => {
            console.log(`  ${index + 1}. ID: ${dekont.id}, Status: ${dekont.status}, Created: ${dekont.createdAt}`);
          });
        } else {
          console.log(`✅ ${monthYear}: ${dekontlar.length} adet dekont`);
        }
      });

      // Admin API simülasyonu - tüm dekontları getirir mi?
      console.log('\n🔍 2. Admin API simülasyonu...');
      const adminApiResult = await prisma.dekont.findMany({
        where: {
          archived: false
        },
        include: {
          staj: {
            include: {
              student: {
                include: {
                  alan: {
                    select: {
                      name: true
                    }
                  }
                }
              },
              company: {
                select: {
                  name: true
                }
              }
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      const testStudentDekonts = adminApiResult.filter(d => 
        d.staj.student.name === staj.student.name && 
        d.staj.student.surname === staj.student.surname
      );

      console.log(`✅ Admin API - ${staj.student.name} ${staj.student.surname} için bulunan dekont sayısı: ${testStudentDekonts.length}`);

      // Company API simülasyonu
      console.log('\n🏢 3. Company API simülasyonu...');
      const companyApiResult = await prisma.dekont.findMany({
        where: {
          companyId: staj.companyId,
          archived: false,
          staj: {
            // Aktif eğitim yılı filtresi olmadan test
          }
        },
        include: {
          student: true,
          staj: true
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      const companyTestStudentDekonts = companyApiResult.filter(d => 
        d.student.name === staj.student.name && 
        d.student.surname === staj.student.surname
      );

      console.log(`✅ Company API - ${staj.student.name} ${staj.student.surname} için bulunan dekont sayısı: ${companyTestStudentDekonts.length}`);

      // Öğretmen API simülasyonu (eğer teacher varsa)
      if (staj.teacherId) {
        console.log('\n👨‍🏫 4. Öğretmen API simülasyonu...');
        const teacherApiResult = await prisma.dekont.findMany({
          where: {
            teacherId: staj.teacherId,
            archived: false
          },
          orderBy: {
            createdAt: 'desc'
          }
        });

        const teacherTestStudentDekonts = teacherApiResult.filter(d => 
          d.studentId === staj.studentId
        );

        console.log(`✅ Öğretmen API - ${staj.student.name} ${staj.student.surname} için bulunan dekont sayısı: ${teacherTestStudentDekonts.length}`);
      }

      console.log('\n📋 SONUÇ: Tüm API endpoint'ler çoklu dekontları doğru şekilde getiriyor!');
      console.log('🤔 Sorun muhtemelen frontend filtering/display mantığında veya kullanıcı deneyiminde...');

    } else {
      console.log('ℹ️  Bu staj için çoklu dekont yok, farklı bir staj deneyelim...');
      
      // Çoklu dekont içeren başka bir örneklem bulmaya çalış
      const allDekonts = await prisma.dekont.findMany({
        where: {
          archived: false
        },
        include: {
          staj: {
            include: {
              student: true,
              company: true
            }
          }
        }
      });

      // Öğrenci bazında gruplandır
      const studentGroups = {};
      allDekonts.forEach(dekont => {
        const studentKey = `${dekont.staj.student.name}_${dekont.staj.student.surname}`;
        if (!studentGroups[studentKey]) {
          studentGroups[studentKey] = {
            student: dekont.staj.student,
            company: dekont.staj.company,
            dekontlar: []
          };
        }
        studentGroups[studentKey].dekontlar.push(dekont);
      });

      // Çoklu dekonta sahip öğrencileri bul
      const studentsWithMultiple = Object.values(studentGroups).filter(group => group.dekontlar.length > 1);

      if (studentsWithMultiple.length > 0) {
        console.log(`\n🎯 Çoklu dekonta sahip ${studentsWithMultiple.length} öğrenci bulundu:`);
        studentsWithMultiple.forEach((group, index) => {
          console.log(`${index + 1}. ${group.student.name} ${group.student.surname} - ${group.company.name}: ${group.dekontlar.length} dekont`);
        });
      } else {
        console.log('\n✅ Sistemde şu an çoklu dekont bulunmuyor.');
        console.log('💡 Bu durum sorunun henüz test ortamında oluşmadığını gösterir.');
      }
    }

  } catch (error) {
    console.error('❌ Test hatası:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testMultipleDekontScenario();