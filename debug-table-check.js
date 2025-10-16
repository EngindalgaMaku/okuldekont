const { PrismaClient } = require("@prisma/client");

async function checkTables() {
  const prisma = new PrismaClient();

  try {
    console.log("🔍 Veritabanı tabloları kontrol ediliyor...\n");

    // Tablo varlığını kontrol et
    try {
      const result = await prisma.$queryRaw`
        SELECT TABLE_NAME 
        FROM INFORMATION_SCHEMA.TABLES 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'monthly_payments'
      `;
      console.log(
        "📊 monthly_payments tablosu:",
        result.length > 0 ? "✅ MEVCUT" : "❌ YOK"
      );

      if (result.length > 0) {
        // Tablo yapısını kontrol et
        const columns = await prisma.$queryRaw`
          SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
          FROM INFORMATION_SCHEMA.COLUMNS
          WHERE TABLE_SCHEMA = DATABASE() 
          AND TABLE_NAME = 'monthly_payments'
        `;
        console.log("\n📋 Tablo yapısı:");
        columns.forEach((col) => {
          console.log(
            `  - ${col.COLUMN_NAME}: ${col.DATA_TYPE} ${
              col.IS_NULLABLE === "YES" ? "(nullable)" : "(not null)"
            }`
          );
        });

        // Kayıt sayısını kontrol et
        const count = await prisma.monthlyPayment.count();
        console.log(`\n📈 Toplam kayıt sayısı: ${count}`);

        if (count > 0) {
          const sample = await prisma.monthlyPayment.findFirst();
          console.log("\n📋 Örnek kayıt:");
          console.log(JSON.stringify(sample, null, 2));
        }
      }
    } catch (error) {
      console.error("❌ Tablo kontrolü hatası:", error.message);
    }

    // Öğrenci sayısını kontrol et
    try {
      const studentCount = await prisma.student.count();
      console.log(`\n👥 Toplam öğrenci sayısı: ${studentCount}`);
    } catch (error) {
      console.error("❌ Öğrenci kontrolü hatası:", error.message);
    }
  } catch (error) {
    console.error("❌ Genel hata:", error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkTables();
