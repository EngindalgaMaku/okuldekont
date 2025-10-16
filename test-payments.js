const { PrismaClient } = require("@prisma/client");
const XLSX = require("xlsx");
const { v4: uuidv4 } = require("uuid");

async function createTestExcel() {
  const prisma = new PrismaClient();

  try {
    console.log("📋 Test Excel dosyası oluşturuluyor...");

    // İlk 3 öğrenciyi al
    const students = await prisma.student.findMany({
      take: 3,
      select: {
        id: true,
        name: true,
        surname: true,
        number: true,
        tcNo: true,
        className: true,
      },
    });

    console.log(`👥 ${students.length} öğrenci bulundu`);

    // Test verisi oluştur
    const testData = students.map((student, index) => ({
      Ad: student.name,
      Soyad: student.surname,
      "Öğrenci No": student.number,
      TC: student.tcNo,
      Sınıf: student.className,
      Tutar: (index + 1) * 1000, // 1000, 2000, 3000
      Ay: 10, // Ekim
      Yıl: 2024,
    }));

    console.log("📊 Test verisi:");
    testData.forEach((data, index) => {
      console.log(`  ${index + 1}. ${data.Ad} ${data.Soyad} - ${data.Tutar}₺`);
    });

    // Excel dosyası oluştur
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(testData);
    XLSX.utils.book_append_sheet(wb, ws, "Payments");
    XLSX.writeFile(wb, "test-payments.xlsx");

    console.log("✅ test-payments.xlsx dosyası oluşturuldu");
  } catch (error) {
    console.error("❌ Hata:", error.message);
  } finally {
    await prisma.$disconnect();
  }
}

async function testImportAPI() {
  console.log("\n🧪 Import API test ediliyor...");

  const FormData = require("form-data");
  const fs = require("fs");

  if (!fs.existsSync("test-payments.xlsx")) {
    console.log("❌ Test dosyası bulunamadı");
    return;
  }

  const form = new FormData();
  form.append("file", fs.createReadStream("test-payments.xlsx"));
  form.append("paymentType", "GOVERNMENT_CONTRIBUTION");
  form.append("month", "10");
  form.append("year", "2024");

  try {
    const response = await fetch(
      "http://localhost:3000/api/admin/payments/import",
      {
        method: "POST",
        body: form,
        headers: form.getHeaders(),
      }
    );

    const result = await response.json();
    console.log("📤 API Yanıtı:", JSON.stringify(result, null, 2));

    if (result.success) {
      console.log(
        `✅ ${result.details.successCount} kayıt başarıyla import edildi`
      );
    } else {
      console.log("❌ Import başarısız:", result.message);
    }
  } catch (error) {
    console.error("❌ API test hatası:", error.message);
  }
}

async function main() {
  await createTestExcel();

  // 2 saniye bekle
  setTimeout(async () => {
    await testImportAPI();

    // Import sonrası kayıt sayısını kontrol et
    setTimeout(async () => {
      const prisma = new PrismaClient();
      try {
        const count = await prisma.monthlyPayment.count();
        console.log(`\n📈 Import sonrası kayıt sayısı: ${count}`);

        if (count > 0) {
          const payments = await prisma.monthlyPayment.findMany({ take: 3 });
          console.log("📋 İlk 3 kayıt:");
          payments.forEach((payment, index) => {
            console.log(
              `  ${index + 1}. ${payment.studentName} ${
                payment.studentSurname
              } - ${payment.amount}₺`
            );
          });
        }
      } catch (error) {
        console.error("❌ Kontrol hatası:", error.message);
      } finally {
        await prisma.$disconnect();
      }
    }, 3000);
  }, 2000);
}

main();
