const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function checkDuplicateDekontRecords() {
  try {
    console.log("🔍 Çoklu dekont kayıtlarını kontrol ediliyor...\n");

    // Aynı staj/month/year kombinasyonu için birden fazla dekont var mı kontrol et
    const duplicates = await prisma.$queryRaw`
      SELECT 
        stajId,
        month,
        year,
        COUNT(*) as dekont_count,
        GROUP_CONCAT(id) as dekont_ids,
        GROUP_CONCAT(createdAt) as created_dates,
        GROUP_CONCAT(fileUrl) as file_urls
      FROM dekonts 
      WHERE archived = false
      GROUP BY stajId, month, year 
      HAVING COUNT(*) > 1
      ORDER BY dekont_count DESC, year DESC, month DESC
    `;

    console.log(
      `📊 Çoklu dekont kaydı bulunan kombinasyon sayısı: ${duplicates.length}\n`
    );

    if (duplicates.length > 0) {
      console.log("⚠️  ÇOKLU DEKONT KAYITLARI BULUNDU:\n");

      for (let i = 0; i < duplicates.length && i < 10; i++) {
        const dup = duplicates[i];
        console.log(`${i + 1}. Staj ID: ${dup.stajId}`);
        console.log(`   Ay/Yıl: ${dup.month}/${dup.year}`);
        console.log(`   Dekont Sayısı: ${dup.dekont_count}`);
        console.log(`   Dekont ID'leri: ${dup.dekont_ids}`);
        console.log(`   Oluşturulma Tarihleri: ${dup.created_dates}`);
        console.log(`   Dosya URL'leri: ${dup.file_urls || "NULL"}`);
        console.log("   ---\n");
      }

      if (duplicates.length > 10) {
        console.log(`... ve ${duplicates.length - 10} tane daha.\n`);
      }

      // En çok çoklu kayıt olan kombinasyonları göster
      console.log("📈 EN ÇOK ÇOKLU KAYIT OLAN DURUMLAR:\n");
      const topDuplicates = duplicates.slice(0, 5);
      topDuplicates.forEach((dup, index) => {
        console.log(
          `${index + 1}. ${dup.dekont_count} adet - Staj: ${dup.stajId} (${
            dup.month
          }/${dup.year})`
        );
      });
    } else {
      console.log("✅ Çoklu dekont kaydı bulunamadı.");
    }

    // Toplam istatistikler
    const totalDekonts = await prisma.dekont.count({
      where: { archived: false },
    });

    const uniqueCombinations = await prisma.$queryRaw`
      SELECT COUNT(DISTINCT CONCAT(stajId, '-', month, '-', year)) as unique_count
      FROM dekonts 
      WHERE archived = false
    `;

    console.log("\n📊 GENEL İSTATİSTİKLER:");
    console.log(`   Toplam Dekont Kayıtları: ${totalDekonts}`);
    console.log(
      `   Benzersiz Staj/Ay/Yıl Kombinasyonları: ${uniqueCombinations[0].unique_count}`
    );
    console.log(`   Çoklu Kayıt Olan Kombinasyonlar: ${duplicates.length}`);

    // Detaylı bir örnek al
    if (duplicates.length > 0) {
      console.log("\n🔍 DETAYLI ÖRNEK ANALİZ:");
      const sampleStajId = duplicates[0].stajId;
      const sampleMonth = duplicates[0].month;
      const sampleYear = duplicates[0].year;

      const detailsQuery = await prisma.dekont.findMany({
        where: {
          stajId: sampleStajId,
          month: sampleMonth,
          year: sampleYear,
          archived: false,
        },
        include: {
          staj: {
            include: {
              student: true,
              company: true,
              teacher: true,
            },
          },
        },
        orderBy: {
          createdAt: "asc",
        },
      });

      console.log(
        `Staj ID: ${sampleStajId} - ${sampleMonth}/${sampleYear} için detaylar:`
      );
      detailsQuery.forEach((dekont, index) => {
        console.log(`  ${index + 1}. Dekont ID: ${dekont.id}`);
        console.log(
          `     Öğrenci: ${dekont.staj.student.name} ${dekont.staj.student.surname}`
        );
        console.log(`     İşletme: ${dekont.staj.company.name}`);
        console.log(
          `     Öğretmen: ${dekont.staj.teacher?.name || "Atanmamış"}`
        );
        console.log(`     Oluşturulma: ${dekont.createdAt}`);
        console.log(`     Durum: ${dekont.status}`);
        console.log(`     Dosya: ${dekont.fileUrl ? "Var" : "Yok"}`);
        console.log(`     Tutar: ${dekont.amount || "Belirtilmemiş"}`);
        console.log("     ---");
      });
    }
  } catch (error) {
    console.error("❌ Hata:", error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDuplicateDekontRecords();
