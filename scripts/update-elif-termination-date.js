const { PrismaClient } = require("@prisma/client");
require("dotenv").config();

const prisma = new PrismaClient({
  log: ["query", "error", "warn"],
  errorFormat: "minimal",
});

// Target record details
const TARGET_RECORD = {
  id: "cmfzckrex00uxnn0l56da78bg",
  studentName: "Elif",
  studentSurname: "Poyraz",
  studentNumber: "202423",
  currentEndDate: "2026-06-12",
  newEndDate: "2025-11-07",
  expectedStatus: "TERMINATED",
};

// Admin user identifier for lastModifiedBy
// Using null to indicate system administrative correction
const ADMIN_USER_ID = null;
const CORRECTION_REASON =
  "Administrative correction: Fixed incorrect termination end date";

let backupData = null;

async function updateElifTerminationDate() {
  console.log("🔧 ELİF POYRAZ STAJ BİTİŞ TARİHİ GÜNCELLEME SCRIPTI");
  console.log(
    "════════════════════════════════════════════════════════════════"
  );
  console.log(`📋 Hedef Kayıt ID: ${TARGET_RECORD.id}`);
  console.log(
    `👤 Öğrenci: ${TARGET_RECORD.studentName} ${TARGET_RECORD.studentSurname} (${TARGET_RECORD.studentNumber})`
  );
  console.log(`📅 Mevcut Bitiş Tarihi: ${TARGET_RECORD.currentEndDate}`);
  console.log(`📅 Yeni Bitiş Tarihi: ${TARGET_RECORD.newEndDate}`);
  console.log(`📝 Güncelleme Nedeni: ${CORRECTION_REASON}`);
  console.log(
    "════════════════════════════════════════════════════════════════\n"
  );

  try {
    await prisma.$connect();
    console.log("✅ Veritabanına bağlanıldı\n");

    // 1. RECORD VERIFICATION - Verify the record matches expected student
    console.log("🔍 1. KAYIT DOĞRULAMASI");
    console.log("─".repeat(50));

    const currentRecord = await prisma.staj.findUnique({
      where: {
        id: TARGET_RECORD.id,
      },
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
      throw new Error(
        `❌ HATA: ID '${TARGET_RECORD.id}' ile staj kaydı bulunamadı!`
      );
    }

    // Verify student details match
    const student = currentRecord.student;
    if (
      student.name !== TARGET_RECORD.studentName ||
      student.surname !== TARGET_RECORD.studentSurname ||
      student.number !== TARGET_RECORD.studentNumber
    ) {
      throw new Error(
        `❌ HATA: Kayıt yanlış öğrenciye ait!\n` +
          `   Beklenen: ${TARGET_RECORD.studentName} ${TARGET_RECORD.studentSurname} (${TARGET_RECORD.studentNumber})\n` +
          `   Bulunan: ${student.name} ${student.surname} (${
            student.number || "Numara yok"
          })`
      );
    }

    // Verify current status
    if (currentRecord.status !== TARGET_RECORD.expectedStatus) {
      throw new Error(
        `❌ HATA: Kayıt durumu beklenen ile uyuşmuyor!\n` +
          `   Beklenen: ${TARGET_RECORD.expectedStatus}\n` +
          `   Mevcut: ${currentRecord.status}`
      );
    }

    // Verify current end date
    const currentEndDateString = currentRecord.endDate
      .toISOString()
      .split("T")[0];
    if (currentEndDateString !== TARGET_RECORD.currentEndDate) {
      console.log(`⚠️  UYARI: Bitiş tarihi beklenenden farklı!`);
      console.log(`   Beklenen: ${TARGET_RECORD.currentEndDate}`);
      console.log(`   Mevcut: ${currentEndDateString}`);
      console.log(`   Devam ediliyor...\n`);
    }

    console.log("✅ Kayıt doğrulandı!");
    console.log(
      `   👤 Öğrenci: ${student.name} ${student.surname} (${student.number})`
    );
    console.log(
      `   🏢 Şirket: ${currentRecord.company?.name || "Belirtilmemiş"}`
    );
    console.log(
      `   📚 Eğitim Yılı: ${
        currentRecord.educationYear?.year || "Belirtilmemiş"
      }`
    );
    console.log(`   📊 Durum: ${currentRecord.status}`);
    console.log(`   📅 Mevcut Bitiş Tarihi: ${currentEndDateString}`);
    console.log(
      `   🗓️  Sonlandırma Tarihi: ${
        currentRecord.terminationDate
          ? currentRecord.terminationDate.toISOString().split("T")[0]
          : "YOK"
      }\n`
    );

    // 2. CREATE BACKUP - Store original data before changes
    console.log("🗃️  2. YEDEKLEME");
    console.log("─".repeat(50));

    backupData = {
      recordId: currentRecord.id,
      originalData: {
        endDate: currentRecord.endDate,
        lastModifiedAt: currentRecord.lastModifiedAt,
        lastModifiedBy: currentRecord.lastModifiedBy,
        status: currentRecord.status,
        terminationDate: currentRecord.terminationDate,
        terminationReason: currentRecord.terminationReason,
        terminationNotes: currentRecord.terminationNotes,
      },
      backupTime: new Date(),
      studentInfo: {
        name: student.name,
        surname: student.surname,
        number: student.number,
      },
    };

    console.log("✅ Orijinal veri yedeği oluşturuldu!");
    console.log("📋 Yedeklenen veriler:");
    console.log(
      `   📅 Bitiş Tarihi: ${backupData.originalData.endDate.toISOString()}`
    );
    console.log(
      `   ⏰ Son Düzenleme: ${
        backupData.originalData.lastModifiedAt
          ? backupData.originalData.lastModifiedAt.toISOString()
          : "YOK"
      }`
    );
    console.log(
      `   👤 Son Düzenleyen: ${backupData.originalData.lastModifiedBy || "YOK"}`
    );
    console.log(
      "   🚀 Yedekleme Zamanı: " + backupData.backupTime.toISOString() + "\n"
    );

    // 3. TRANSACTION UPDATE - Perform the actual update within a transaction
    console.log("💾 3. GÜVENLİ GÜNCELLEME (TRANSAKSİYON)");
    console.log("─".repeat(50));

    const updateResult = await prisma.$transaction(async (tx) => {
      // Prepare new date
      const newEndDate = new Date(`${TARGET_RECORD.newEndDate}T00:00:00.000Z`);
      const updateTimestamp = new Date();

      console.log(`🔄 Güncelleme işlemi başlatıldı...`);
      console.log(`   📅 Yeni Bitiş Tarihi: ${newEndDate.toISOString()}`);
      console.log(`   ⏰ Güncelleme Zamanı: ${updateTimestamp.toISOString()}`);
      console.log(`   👤 Güncelleme Yapan: ${ADMIN_USER_ID}\n`);

      // Perform the update
      const updatedRecord = await tx.staj.update({
        where: {
          id: TARGET_RECORD.id,
        },
        data: {
          endDate: newEndDate,
          lastModifiedAt: updateTimestamp,
          lastModifiedBy: ADMIN_USER_ID,
        },
        include: {
          student: {
            select: {
              name: true,
              surname: true,
              number: true,
            },
          },
        },
      });

      console.log("✅ Kayıt başarıyla güncellendi!");
      return updatedRecord;
    });

    // 4. VERIFICATION - Display before/after values
    console.log("\n📊 4. GÜNCELLEME DOĞRULAMA");
    console.log("─".repeat(50));
    console.log("🔍 ÖNCE ve SONRA KARŞILAŞTIRMA:");
    console.log("");
    console.log("📅 BİTİŞ TARİHİ:");
    console.log(`   Önce : ${backupData.originalData.endDate.toISOString()}`);
    console.log(`   Sonra: ${updateResult.endDate.toISOString()}`);
    console.log(
      `   ✅ Değişiklik: ${
        backupData.originalData.endDate.toISOString() !==
        updateResult.endDate.toISOString()
          ? "BAŞARILI"
          : "DEĞİŞMEDİ"
      }`
    );
    console.log("");
    console.log("⏰ SON DÜZENLEMe TARİHİ:");
    console.log(
      `   Önce : ${
        backupData.originalData.lastModifiedAt
          ? backupData.originalData.lastModifiedAt.toISOString()
          : "YOK"
      }`
    );
    console.log(`   Sonra: ${updateResult.lastModifiedAt.toISOString()}`);
    console.log(`   ✅ Değişiklik: BAŞARILI`);
    console.log("");
    console.log("👤 SON DÜZENLEyeN:");
    console.log(`   Önce : ${backupData.originalData.lastModifiedBy || "YOK"}`);
    console.log(`   Sonra: ${updateResult.lastModifiedBy || "YOK"}`);
    console.log(`   ✅ Değişiklik: BAŞARILI`);

    // Final verification
    console.log("\n🎯 HEDEF KONTROL:");
    const targetEndDate = new Date(`${TARGET_RECORD.newEndDate}T00:00:00.000Z`);
    const isCorrectEndDate =
      updateResult.endDate.getTime() === targetEndDate.getTime();

    if (isCorrectEndDate) {
      console.log("✅ Bitiş tarihi hedef değerle tam olarak eşleşiyor!");
    } else {
      throw new Error("❌ HATA: Bitiş tarihi hedef değerle eşleşmiyor!");
    }

    console.log("\n" + "═".repeat(64));
    console.log("🎉 GÜNCELLEME BAŞARILI!");
    console.log("═".repeat(64));
    console.log(
      `✅ ${TARGET_RECORD.studentName} ${TARGET_RECORD.studentSurname} (${TARGET_RECORD.studentNumber}) öğrencisinin`
    );
    console.log(
      `   staj bitiş tarihi ${TARGET_RECORD.currentEndDate} tarihinden`
    );
    console.log(
      `   ${TARGET_RECORD.newEndDate} tarihine başarıyla güncellendi.`
    );
    console.log("");
    console.log("📋 Güncellenen Alanlar:");
    console.log(`   • endDate: ${TARGET_RECORD.newEndDate}`);
    console.log(`   • lastModifiedAt: ${new Date().toISOString()}`);
    console.log(`   • lastModifiedBy: ${ADMIN_USER_ID}`);
    console.log("");
    console.log(
      "💾 Yedek veriler bellekte saklandı (rollback için kullanılabilir)"
    );
    console.log("🔒 Tüm değişiklikler transaction içinde güvenle yapıldı");
    console.log("═".repeat(64));
  } catch (error) {
    console.error("\n" + "═".repeat(64));
    console.error("❌ HATA OLUŞTU!");
    console.error("═".repeat(64));
    console.error("🚨 Hata Mesajı:", error.message);

    if (error.code) {
      console.error("📋 Hata Kodu:", error.code);
    }

    console.error("\n🔙 ROLLBACK BİLGİSİ:");
    if (backupData) {
      console.error("✅ Yedek veri mevcut - rollback mümkün");
      console.error("📞 Gerekirse manüel rollback yapılabilir");
      console.error(`   📋 Kayıt ID: ${backupData.recordId}`);
      console.error(
        `   📅 Orijinal Bitiş Tarihi: ${backupData.originalData.endDate.toISOString()}`
      );
    } else {
      console.error(
        "⚠️  Henüz yedek alınmadı - veritabanında değişiklik yapılmadı"
      );
    }

    console.error("\n💡 Öneriler:");
    console.error("1. Hata nedenini kontrol edin");
    console.error("2. Kayıt ID'sinin doğru olduğundan emin olun");
    console.error("3. Gerekirse script'i tekrar çalıştırın");
    console.error("4. Sorun devam ederse manual kontrol yapın");
    console.error("═".repeat(64));

    throw error;
  } finally {
    await prisma.$disconnect();
    console.log("\n🔌 Veritabanı bağlantısı kapatıldı");
  }
}

// ROLLBACK FUNCTION - Emergency rollback capability
async function rollbackChanges() {
  if (!backupData) {
    console.log("❌ Rollback yapılamaz: Yedek veri bulunamadı!");
    return false;
  }

  console.log("\n🔙 ROLLBACK İŞLEMİ BAŞLATILIYOR...");
  console.log("═".repeat(50));

  try {
    await prisma.$connect();

    await prisma.$transaction(async (tx) => {
      await tx.staj.update({
        where: {
          id: backupData.recordId,
        },
        data: {
          endDate: backupData.originalData.endDate,
          lastModifiedAt: backupData.originalData.lastModifiedAt,
          lastModifiedBy: backupData.originalData.lastModifiedBy,
        },
      });
    });

    console.log("✅ Rollback başarıyla tamamlandı!");
    console.log(
      `📅 Bitiş tarihi ${backupData.originalData.endDate.toISOString()} olarak geri yüklendi`
    );
    return true;
  } catch (error) {
    console.error("❌ Rollback başarısız:", error.message);
    return false;
  } finally {
    await prisma.$disconnect();
  }
}

// Main execution with error handling
if (require.main === module) {
  updateElifTerminationDate()
    .then(() => {
      console.log("\n✨ Script başarıyla tamamlandı!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("\n💥 Script başarısız oldu!");
      console.error("Detaylar yukarıda görüntülendi.");
      process.exit(1);
    });
}

// Export functions for potential external use
module.exports = {
  updateElifTerminationDate,
  rollbackChanges,
  TARGET_RECORD,
};
