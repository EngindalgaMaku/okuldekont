const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

function getRandomElement(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function getRandomDate(start, end) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

async function createInternshipAssignments() {
  console.log('🚀 100 öğrenciye staj ataması yapılıyor...');
  
  try {
    // Mevcut verileri al
    const students = await prisma.student.findMany({
      where: { companyId: null } // Henüz işletmeye atanmamış öğrenciler
    });
    
    const companies = await prisma.companyProfile.findMany({
      include: { teacher: true }
    });
    
    const teachers = await prisma.teacherProfile.findMany();
    
    // Aktif eğitim yılını al
    let educationYear = await prisma.egitimYili.findFirst({
      where: { active: true }
    });
    
    // Eğer yoksa oluştur
    if (!educationYear) {
      educationYear = await prisma.egitimYili.create({
        data: {
          year: '2024-2025',
          startDate: new Date('2024-09-01'),
          endDate: new Date('2025-06-15'),
          active: true
        }
      });
    }

    console.log(`📊 Mevcut veriler:`);
    console.log(`   - ${students.length} öğrenci bulundu`);
    console.log(`   - ${companies.length} işletme bulundu`);
    console.log(`   - ${teachers.length} öğretmen bulundu`);

    // En fazla 100 öğrenci seç
    const studentsToAssign = students.slice(0, Math.min(100, students.length));
    
    console.log(`\n🎯 ${studentsToAssign.length} öğrenci işletmelere atanacak...`);

    let assignedCount = 0;
    const createdInternships = [];

    for (const student of studentsToAssign) {
      // Rastgele bir işletme seç
      const company = getRandomElement(companies);
      
      // İşletmeye atanan öğretmeni kullan, yoksa rastgele bir öğretmen seç
      let teacher = company.teacher;
      if (!teacher) {
        teacher = getRandomElement(teachers);
      }

      // Staj başlangıç tarihi (son 3 ay içinde)
      const startDate = getRandomDate(
        new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), // 90 gün önce
        new Date() // bugün
      );

      // Staj bitiş tarihi (başlangıçtan 6 ay sonra)
      const endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + 6);

      // Öğrenciyi işletmeye ata
      await prisma.student.update({
        where: { id: student.id },
        data: { companyId: company.id }
      });

      // Staj kaydı oluştur
      const internship = await prisma.staj.create({
        data: {
          studentId: student.id,
          companyId: company.id,
          teacherId: teacher.id,
          educationYearId: educationYear.id,
          startDate: startDate,
          endDate: endDate,
          status: 'ACTIVE'
        }
      });

      createdInternships.push(internship);
      assignedCount++;

      if (assignedCount % 10 === 0) {
        console.log(`   ✅ ${assignedCount} öğrenci atandı...`);
      }
    }

    console.log(`\n🎉 ${assignedCount} öğrenci başarıyla işletmelere atandı!`);

    // Şimdi 20 stajı fesih et
    console.log('\n🔥 20 stajın feshini gerçekleştiriliyor...');
    
    const internshipsToTerminate = createdInternships.slice(0, 20);
    
    for (let i = 0; i < internshipsToTerminate.length; i++) {
      const internship = internshipsToTerminate[i];
      
      // Fesih tarihi (staj başlangıcından sonra rastgele bir tarih)
      const terminationDate = getRandomDate(
        internship.startDate,
        new Date()
      );

      const terminationReasons = [
        'Öğrenci isteği ile fesih',
        'İşletme isteği ile fesih', 
        'Karşılıklı anlaşma ile fesih',
        'Devamsızlık nedeni ile fesih',
        'İş güvenliği ihlali nedeni ile fesih',
        'Disiplin problemi nedeni ile fesih'
      ];

      // Stajı fesih et
      await prisma.staj.update({
        where: { id: internship.id },
        data: {
          status: 'TERMINATED',
          terminationDate: terminationDate,
          terminationReason: getRandomElement(terminationReasons)
          // terminatedBy alanını boş bırakıyoruz çünkü foreign key constraint var
        }
      });

      console.log(`   🔴 Staj feshedildi: ${i + 1}/20`);
    }

    console.log('\n📈 Özet:');
    console.log(`   ✅ Toplam atanan öğrenci: ${assignedCount}`);
    console.log(`   🔴 Feshedilen staj sayısı: 20`);
    console.log(`   ✅ Aktif staj sayısı: ${assignedCount - 20}`);
    console.log('\n🎊 Tüm işlemler tamamlandı!');

  } catch (error) {
    console.error('❌ Staj ataması yapılırken hata:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createInternshipAssignments();