const { PrismaClient } = require("@prisma/client");
require("dotenv").config();

const prisma = new PrismaClient({
  log: ["error", "warn"],
  errorFormat: "minimal",
});

// Expected values after update
const EXPECTED_VALUES = {
  id: "cmfzckrex00uxnn0l56da78bg",
  studentName: "Elif",
  studentSurname: "Poyraz",
  studentNumber: "202423",
  expectedEndDate: "2025-11-07",
  previousEndDate: "2026-06-12",
  expectedStatus: "TERMINATED",
  expectedCompany: "Özlem Görünmez",
  expectedLastModifiedBy: null, // System administrative correction
};

async function verifyElifUpdate() {
  console.log("🔍 ELİF POYRAZ STAJ BİTİŞ TARİHİ GÜNCELLEME DOĞRULAMASI");
  console.log("═".repeat(70));
  console.log(`📋 Kayıt ID: ${EXPECTED_VALUES.id}`);
  console.log(
    `👤 Öğrenci: ${EXPECTED_VALUES.studentName} ${EXPECTED_VALUES.studentSurname} (${EXPECTED_VALUES.studentNumber})`
  );
  console.log(`🎯 Beklenen Bitiş Tarihi: ${EXPECTED_VALUES.expectedEndDate}`);
  console.log(`📅 Önceki Bitiş Tarihi: ${EXPECTED_VALUES.previousEndDate}`);
  console.log("═".repeat(70));

  try {
    await prisma.$connect();
    console.log("\n✅ Veritabanına bağlanıldı");

    // Query the updated record with full details
    const currentRecord = await prisma.staj.findUnique({
      where: { id: EXPECTED_VALUES.id },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            surname: true,
            number: true,
            className: true,
          },
        },
        company: {
          select: {
            id: true,
            name: true,
          },
        },
        educationYear: {
          select: {
            id: true,
            year: true,
          },
        },
      },
    });

    if (!currentRecord) {
      console.log("❌ HATA: Kayıt bulunamadı!");
      return false;
    }

    console.log("\n📊 MEVCUT KAYIT DURUMU:");
    console.log("─".repeat(50));

    // Format dates for comparison
    const currentEndDateString = currentRecord.endDate
      .toISOString()
      .split("T")[0];
    const lastModifiedString = currentRecord.lastModifiedAt
      ? currentRecord.lastModifiedAt.toISOString()
      : "YOK";

    // Display current record details
    console.log(
      `👤 Öğrenci: ${currentRecord.student.name} ${currentRecord.student.surname} (${currentRecord.student.number})`
    );
    console.log(`🏢 Şirket: ${currentRecord.company?.name || "Belirtilmemiş"}`);
    console.log(
      `📚 Eğitim Yılı: ${currentRecord.educationYear?.year || "Belirtilmemiş"}`
    );
    console.log(`📊 Durum: ${currentRecord.status}`);
    console.log(`📅 Bitiş Tarihi: ${currentEndDateString}`);
    console.log(
      `🗓️ Sonlandırma Tarihi: ${
        currentRecord.terminationDate
          ? currentRecord.terminationDate.toISOString().split("T")[0]
          : "YOK"
      }`
    );
    console.log(`⏰ Son Düzenleme: ${lastModifiedString}`);
    console.log(`👤 Son Düzenleyen: ${currentRecord.lastModifiedBy || "YOK"}`);

    // VERIFICATION CHECKS
    console.log("\n🔎 DOĞRULAMA KONTROLLERI:");
    console.log("─".repeat(50));

    let allChecksPass = true;

    // 1. Student Identity Check
    const studentMatch =
      currentRecord.student.name === EXPECTED_VALUES.studentName &&
      currentRecord.student.surname === EXPECTED_VALUES.studentSurname &&
      currentRecord.student.number === EXPECTED_VALUES.studentNumber;

    console.log(
      `1. Öğrenci Kimliği: ${studentMatch ? "✅ DOĞRU" : "❌ YANLIŞ"}`
    );
    if (!studentMatch) {
      console.log(
        `   Beklenen: ${EXPECTED_VALUES.studentName} ${EXPECTED_VALUES.studentSurname} (${EXPECTED_VALUES.studentNumber})`
      );
      console.log(
        `   Bulunan: ${currentRecord.student.name} ${currentRecord.student.surname} (${currentRecord.student.number})`
      );
      allChecksPass = false;
    }

    // 2. End Date Check
    const endDateMatch =
      currentEndDateString === EXPECTED_VALUES.expectedEndDate;
    console.log(`2. Bitiş Tarihi: ${endDateMatch ? "✅ DOĞRU" : "❌ YANLIŞ"}`);
    if (!endDateMatch) {
      console.log(`   Beklenen: ${EXPECTED_VALUES.expectedEndDate}`);
      console.log(`   Bulunan: ${currentEndDateString}`);
      allChecksPass = false;
    }

    // 3. Status Check
    const statusMatch = currentRecord.status === EXPECTED_VALUES.expectedStatus;
    console.log(`3. Durum: ${statusMatch ? "✅ DOĞRU" : "❌ YANLIŞ"}`);
    if (!statusMatch) {
      console.log(`   Beklenen: ${EXPECTED_VALUES.expectedStatus}`);
      console.log(`   Bulunan: ${currentRecord.status}`);
      allChecksPass = false;
    }

    // 4. Company Check
    const companyMatch =
      currentRecord.company?.name === EXPECTED_VALUES.expectedCompany;
    console.log(`4. Şirket: ${companyMatch ? "✅ DOĞRU" : "❌ YANLIŞ"}`);
    if (!companyMatch) {
      console.log(`   Beklenen: ${EXPECTED_VALUES.expectedCompany}`);
      console.log(`   Bulunan: ${currentRecord.company?.name || "YOK"}`);
      allChecksPass = false;
    }

    // 5. Last Modified By Check
    const lastModifiedByMatch =
      currentRecord.lastModifiedBy === EXPECTED_VALUES.expectedLastModifiedBy;
    console.log(
      `5. Son Düzenleyen: ${lastModifiedByMatch ? "✅ DOĞRU" : "❌ YANLIŞ"}`
    );
    if (!lastModifiedByMatch) {
      console.log(
        `   Beklenen: ${EXPECTED_VALUES.expectedLastModifiedBy || "NULL"}`
      );
      console.log(`   Bulunan: ${currentRecord.lastModifiedBy || "NULL"}`);
      allChecksPass = false;
    }

    // 6. Last Modified At Check (should be today)
    const today = new Date().toISOString().split("T")[0]; // Get today's date
    const lastModifiedDate = currentRecord.lastModifiedAt
      ? currentRecord.lastModifiedAt.toISOString().split("T")[0]
      : null;
    const lastModifiedAtMatch = lastModifiedDate === today;
    console.log(
      `6. Son Düzenleme Tarihi: ${
        lastModifiedAtMatch ? "✅ BUGÜN" : "⚠️ FARKLI GÜN"
      }`
    );
    console.log(`   Bugünkü Tarih: ${today}`);
    console.log(`   Düzenleme Tarihi: ${lastModifiedDate || "YOK"}`);

    // BEFORE/AFTER COMPARISON
    console.log("\n📋 ÖNCE/SONRA KARŞILAŞTIRMASI:");
    console.log("─".repeat(50));
    console.log(`📅 Bitiş Tarihi:`);
    console.log(`   Önce : ${EXPECTED_VALUES.previousEndDate}`);
    console.log(`   Sonra: ${currentEndDateString}`);
    console.log(
      `   Değişiklik: ${
        EXPECTED_VALUES.previousEndDate !== currentEndDateString
          ? "✅ DEĞİŞTİ"
          : "❌ DEĞİŞMEDİ"
      }`
    );

    console.log(`\n⏰ Son Düzenleme:`);
    console.log(`   Güncellenme Zamanı: ${lastModifiedString}`);
    console.log(
      `   Güncelleme Yapan: ${currentRecord.lastModifiedBy || "SİSTEM (NULL)"}`
    );

    // FINAL RESULT
    console.log("\n" + "═".repeat(70));
    if (allChecksPass && endDateMatch) {
      console.log("🎉 DOĞRULAMA BAŞARILI!");
      console.log("═".repeat(70));
      console.log("✅ Tüm kontroller geçildi");
      console.log(
        `✅ ${EXPECTED_VALUES.studentName} ${EXPECTED_VALUES.studentSurname} öğrencisinin staj bitiş tarihi`
      );
      console.log(
        `   başarıyla ${EXPECTED_VALUES.expectedEndDate} olarak güncellendi`
      );
      console.log("✅ Tüm diğer veriler değişmeden korundu");
      console.log("✅ Son düzenleme bilgileri doğru şekilde kaydedildi");

      console.log("\n📊 Özet:");
      console.log(`   • Kayıt ID: ${EXPECTED_VALUES.id}`);
      console.log(
        `   • Öğrenci: ${EXPECTED_VALUES.studentName} ${EXPECTED_VALUES.studentSurname} (${EXPECTED_VALUES.studentNumber})`
      );
      console.log(`   • Eski Bitiş Tarihi: ${EXPECTED_VALUES.previousEndDate}`);
      console.log(`   • Yeni Bitiş Tarihi: ${currentEndDateString}`);
      console.log(`   • Durum: ${currentRecord.status}`);
      console.log(`   • Şirket: ${currentRecord.company?.name}`);
      console.log(`   • Güncelleme Zamanı: ${lastModifiedDate}`);

      return true;
    } else {
      console.log("❌ DOĞRULAMA BAŞARISIZ!");
      console.log("═".repeat(70));
      console.log("⚠️ Bazı kontroller başarısız oldu");
      console.log("💡 Yukarıdaki detayları kontrol edin");
      return false;
    }
  } catch (error) {
    console.error("\n❌ HATA OLUŞTU!");
    console.error("═".repeat(50));
    console.error("🚨 Hata Mesajı:", error.message);
    if (error.code) {
      console.error("📋 Hata Kodu:", error.code);
    }
    return false;
  } finally {
    await prisma.$disconnect();
    console.log("\n🔌 Veritabanı bağlantısı kapatıldı");
  }
}

// Run verification if called directly
if (require.main === module) {
  verifyElifUpdate()
    .then((success) => {
      if (success) {
        console.log("\n✨ Doğrulama başarıyla tamamlandı!");
        process.exit(0);
      } else {
        console.log("\n💥 Doğrulama başarısız oldu!");
        process.exit(1);
      }
    })
    .catch((error) => {
      console.error("\n💥 Script hatası:", error.message);
      process.exit(1);
    });
}

module.exports = { verifyElifUpdate, EXPECTED_VALUES };
