const { PrismaClient } = require("@prisma/client");
const XLSX = require("xlsx");

async function createTestExcel() {
  const prisma = new PrismaClient();

  try {
    console.log("📋 Test Excel dosyası oluşturuluyor...\n");

    // İlk 5 öğrenciyi al
    const students = await prisma.student.findMany({
      take: 5,
      select: {
        id: true,
        name: true,
        surname: true,
        number: true,
        tcNo: true,
        className: true,
      },
    });

    console.log(`👥 ${students.length} öğrenci alındı`);

    // Test verisi oluştur
    const testData = students.map((student, index) => ({
      Ad: student.name,
      Soyad: student.surname,
      "Öğrenci No": student.number,
      TC: student.tcNo,
      Sınıf: student.className,
      Tutar: (index + 1) * 500 + 1000, // 1500, 2000, 2500, 3000, 3500
      Ay: 10,
      Yıl: 2024,
    }));

    console.log("📊 Test verisi:");
    testData.forEach((data, index) => {
      console.log(`  ${index + 1}. ${data.Ad} ${data.Soyad} - ${data.Tutar}₺`);
    });

    // Excel dosyası oluştur
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(testData);
    XLSX.utils.book_append_sheet(wb, ws, "OdemeBilgileri");
    XLSX.writeFile(wb, "test-payments.xlsx");

    console.log("\n✅ test-payments.xlsx dosyası oluşturuldu");
    console.log(
      "📝 Sütunlar: Ad, Soyad, Öğrenci No, TC, Sınıf, Tutar, Ay, Yıl"
    );

    console.log("\n🔍 Mevcut ödeme kayıtları kontrol ediliyor...");
    const currentPayments = await prisma.monthlyPayment.count();
    console.log(`📊 Şu anki ödeme kayıt sayısı: ${currentPayments}`);

    console.log(
      "\n📤 Artık admin panelinden Excel dosyasını import edebilirsiniz:"
    );
    console.log("   1. http://localhost:3000/admin/dekontlar sayfasına gidin");
    console.log('   2. "Excel İçe Aktar" butonuna tıklayın');
    console.log("   3. test-payments.xlsx dosyasını seçin");
    console.log("   4. Ay: 10, Yıl: 2024 seçin");
    console.log('   5. "İçe Aktar" butonuna tıklayın');
  } catch (error) {
    console.error("❌ Hata:", error.message);
  } finally {
    await prisma.$disconnect();
  }
}

createTestExcel();
