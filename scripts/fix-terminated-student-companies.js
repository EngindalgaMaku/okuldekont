const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixTerminatedStudentCompanies(dryRun = false) {
  if (dryRun) {
    console.log('🔍 DRY-RUN MOD: Sadece kontrol yapılıyor, veritabanı değiştirilmiyor...');
  } else {
    console.log('🔧 Fesih edilmiş stajları olan öğrencilerin işletme atamaları temizleniyor...');
  }
  
  try {
    // Fesih edilmiş stajları olan ama hala işletme ID'si bulunan öğrencileri bul
    const studentsWithIssue = await prisma.student.findMany({
      where: {
        companyId: {
          not: null // İşletme ID'si olan öğrenciler
        }
      },
      include: {
        stajlar: {
          where: {
            status: 'TERMINATED' // Fesih edilmiş stajları
          },
          include: {
            company: true
          }
        },
        company: true
      }
    });

    // Sadece aktif stajı olmayan öğrencileri filtrele
    const studentsToFix = [];
    
    for (const student of studentsWithIssue) {
      // Bu öğrencinin aktif stajı var mı kontrol et
      const activeInternships = await prisma.staj.findMany({
        where: {
          studentId: student.id,
          status: 'ACTIVE'
        }
      });

      // Eğer aktif stajı yoksa ve fesih edilmiş stajı varsa, temizlenmesi gerekiyor
      if (activeInternships.length === 0 && student.stajlar.length > 0) {
        studentsToFix.push(student);
      }
    }

    console.log(`📊 Bulunan veriler:`);
    console.log(`   - İşletme ID'si olan toplam öğrenci: ${studentsWithIssue.length}`);
    console.log(`   - Temizlenmesi gereken öğrenci: ${studentsToFix.length}`);

    if (studentsToFix.length === 0) {
      console.log('✅ Temizlenmesi gereken öğrenci bulunamadı. Tüm veriler tutarlı!');
      return;
    }

    console.log('\n🔍 Temizlenmesi gereken öğrenciler:');
    studentsToFix.forEach((student, index) => {
      const terminatedCount = student.stajlar.length;
      const companyName = student.company?.name || 'Bilinmeyen İşletme';
      console.log(`   ${index + 1}. ${student.name} ${student.surname} (${student.className}) - ${companyName} - ${terminatedCount} fesih edilmiş staj`);
    });

    if (dryRun) {
      console.log('\n[DRY-RUN] Gerçek çalıştırmada bu öğrencilerin işletme atamaları temizlenecek.');
      return;
    }

    console.log('\n🔧 İşletme atamaları temizleniyor...');
    
    let fixedCount = 0;
    
    for (const student of studentsToFix) {
      try {
        await prisma.student.update({
          where: { id: student.id },
          data: { companyId: null }
        });
        
        fixedCount++;
        console.log(`   ✅ ${student.name} ${student.surname} - işletme ataması temizlendi`);
        
      } catch (error) {
        console.error(`   ❌ ${student.name} ${student.surname} - hata: ${error.message}`);
      }
    }

    console.log('\n📈 Özet:');
    console.log(`   ✅ Başarıyla temizlenen öğrenci: ${fixedCount}`);
    console.log(`   ❌ Hata alan öğrenci: ${studentsToFix.length - fixedCount}`);
    console.log('\n🎊 Temizleme işlemi tamamlandı!');

  } catch (error) {
    console.error('❌ Temizleme işlemi sırasında hata:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Script'i çalıştır
// Dry-run için: node fix-terminated-student-companies.js --dry-run
// Gerçek çalıştırma için: node fix-terminated-student-companies.js

const isDryRun = process.argv.includes('--dry-run');
fixTerminatedStudentCompanies(isDryRun);
