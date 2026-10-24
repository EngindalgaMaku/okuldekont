const { PrismaClient } = require("@prisma/client");
require("dotenv").config();

const prisma = new PrismaClient();

async function findElifPoyrazRecord() {
  try {
    console.log("🔍 Elif Poyraz staj kaydı aranıyor...\n");
    console.log(
      "════════════════════════════════════════════════════════════════"
    );

    // Öğrenci bilgileri
    const targetStudent = {
      name: "Elif",
      surname: "Poyraz",
      number: "202423",
      className: "11-MeSeM",
      fieldName: "MUHASEBE-FİNANS",
    };

    console.log("📋 Aranan öğrenci bilgileri:");
    console.log(`   Ad Soyad: ${targetStudent.name} ${targetStudent.surname}`);
    console.log(`   Numara: ${targetStudent.number}`);
    console.log(`   Sınıf: ${targetStudent.className}`);
    console.log(`   Alan: ${targetStudent.fieldName}`);
    console.log(
      "════════════════════════════════════════════════════════════════\n"
    );

    // Önce öğrenciyi bul
    console.log("🔍 1. Öğrenci kaydı aranıyor...");

    const student = await prisma.student.findFirst({
      where: {
        name: {
          contains: targetStudent.name,
        },
        surname: {
          contains: targetStudent.surname,
        },
        number: targetStudent.number,
      },
      include: {
        alan: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
        class: {
          select: {
            id: true,
            name: true,
          },
        },
        company: {
          select: {
            id: true,
            name: true,
            contact: true,
          },
        },
      },
    });

    if (!student) {
      console.log("❌ Öğrenci bulunamadı!");
      console.log("\n🔍 Benzer öğrencileri aranıyor...");

      // Benzer öğrencileri ara
      const similarStudents = await prisma.student.findMany({
        where: {
          OR: [
            {
              name: {
                contains: targetStudent.name,
              },
            },
            {
              surname: {
                contains: targetStudent.surname,
              },
            },
            {
              number: {
                contains: targetStudent.number,
              },
            },
          ],
        },
        include: {
          alan: {
            select: {
              name: true,
            },
          },
        },
        take: 10,
      });

      if (similarStudents.length > 0) {
        console.log(`\n📋 ${similarStudents.length} benzer öğrenci bulundu:`);
        similarStudents.forEach((s, index) => {
          console.log(
            `   ${index + 1}. ${s.name} ${s.surname} (${
              s.number || "Numara yok"
            }) - ${s.className} - ${s.alan?.name || "Alan bilgisi yok"}`
          );
        });
      } else {
        console.log("   Benzer öğrenci bulunamadı.");
      }

      await prisma.$disconnect();
      return;
    }

    console.log("✅ Öğrenci bulundu!");
    console.log(
      "────────────────────────────────────────────────────────────────"
    );
    console.log("👤 ÖĞRENCİ BİLGİLERİ:");
    console.log(`   ID: ${student.id}`);
    console.log(`   Ad Soyad: ${student.name} ${student.surname}`);
    console.log(`   Numara: ${student.number || "Belirtilmemiş"}`);
    console.log(`   Sınıf: ${student.className}`);
    console.log(`   TC No: ${student.tcNo || "Belirtilmemiş"}`);
    console.log(`   Telefon: ${student.phone || "Belirtilmemiş"}`);
    console.log(`   E-posta: ${student.email || "Belirtilmemiş"}`);
    console.log(
      `   Alan: ${student.alan?.name || "Belirtilmemiş"} (ID: ${
        student.alanId
      })`
    );
    console.log(
      `   Sınıf: ${student.class?.name || "Belirtilmemiş"} (ID: ${
        student.classId || "Yok"
      })`
    );
    console.log(
      `   Şirket: ${student.company?.name || "Atanmamış"} (ID: ${
        student.companyId || "Yok"
      })`
    );

    // Öğrencinin staj kayıtlarını bul
    console.log("\n🔍 2. Staj kayıtları aranıyor...");

    const internships = await prisma.staj.findMany({
      where: {
        studentId: student.id,
      },
      include: {
        company: {
          select: {
            id: true,
            name: true,
            contact: true,
            phone: true,
            email: true,
            address: true,
            teacherId: true,
          },
        },
        teacher: {
          select: {
            id: true,
            name: true,
            surname: true,
            phone: true,
            email: true,
          },
        },
        educationYear: {
          select: {
            id: true,
            year: true,
            active: true,
          },
        },
        lastModifiedByUser: {
          select: {
            id: true,
            email: true,
          },
        },
        terminatedByUser: {
          select: {
            id: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    if (internships.length === 0) {
      console.log("❌ Bu öğrenciye ait staj kaydı bulunamadı!");
    } else {
      console.log(`✅ ${internships.length} staj kaydı bulundu!`);

      internships.forEach((internship, index) => {
        console.log(
          "\n════════════════════════════════════════════════════════════════"
        );
        console.log(`📋 STAJ KAYDI #${index + 1}:`);
        console.log(
          "────────────────────────────────────────────────────────────────"
        );
        console.log(`   🆔 Staj ID: ${internship.id}`);
        console.log(`   👤 Öğrenci ID: ${internship.studentId}`);
        console.log(`   🏢 Şirket ID: ${internship.companyId}`);
        console.log(
          `   👨‍🏫 Öğretmen ID: ${internship.teacherId || "ATANMAMIŞ"}`
        );
        console.log(`   📅 Eğitim Yılı ID: ${internship.educationYearId}`);
        console.log(`   📊 Durum: ${internship.status}`);
        console.log(
          `   🗓️ Başlangıç: ${internship.startDate.toLocaleDateString("tr-TR")}`
        );
        console.log(
          `   🗓️ Bitiş: ${internship.endDate.toLocaleDateString("tr-TR")}`
        );
        console.log(
          `   ⛔ Sonlandırma Tarihi: ${
            internship.terminationDate
              ? internship.terminationDate.toLocaleDateString("tr-TR")
              : "YOK"
          }`
        );
        console.log(
          `   📝 Sonlandırma Nedeni: ${internship.terminationReason || "YOK"}`
        );
        console.log(
          `   📄 Sonlandırma Notları: ${internship.terminationNotes || "YOK"}`
        );
        console.log(
          `   ⏰ Oluşturulma: ${internship.createdAt.toLocaleDateString(
            "tr-TR"
          )} ${internship.createdAt.toLocaleTimeString("tr-TR")}`
        );
        console.log(
          `   ⏰ Son Düzenleme: ${
            internship.lastModifiedAt
              ? internship.lastModifiedAt.toLocaleDateString("tr-TR") +
                " " +
                internship.lastModifiedAt.toLocaleTimeString("tr-TR")
              : "YOK"
          }`
        );
        console.log(
          `   👤 Son Düzenleyen: ${
            internship.lastModifiedByUser?.email || "YOK"
          }`
        );
        console.log(
          `   👤 Sonlandıran: ${internship.terminatedByUser?.email || "YOK"}`
        );
        console.log(
          `   📁 Arşiv Durumu: ${internship.archived ? "ARŞİVLENMİŞ" : "AKTİF"}`
        );

        // Şirket bilgileri
        if (internship.company) {
          console.log("\n   🏢 ŞİRKET BİLGİLERİ:");
          console.log(`      Ad: ${internship.company.name}`);
          console.log(`      İletişim: ${internship.company.contact}`);
          console.log(
            `      Telefon: ${internship.company.phone || "Belirtilmemiş"}`
          );
          console.log(
            `      E-posta: ${internship.company.email || "Belirtilmemiş"}`
          );
          console.log(
            `      Adres: ${internship.company.address || "Belirtilmemiş"}`
          );
          console.log(
            `      Koordinatör ID: ${
              internship.company.teacherId || "ATANMAMIŞ"
            }`
          );
        }

        // Öğretmen bilgileri
        if (internship.teacher) {
          console.log("\n   👨‍🏫 KOORDINATÖR BİLGİLERİ:");
          console.log(
            `      Ad Soyad: ${internship.teacher.name} ${internship.teacher.surname}`
          );
          console.log(
            `      Telefon: ${internship.teacher.phone || "Belirtilmemiş"}`
          );
          console.log(
            `      E-posta: ${internship.teacher.email || "Belirtilmemiş"}`
          );
        } else {
          console.log("\n   👨‍🏫 KOORDINATÖR: ATANMAMIŞ");
        }

        // Eğitim yılı bilgileri
        if (internship.educationYear) {
          console.log("\n   📚 EĞİTİM YILI:");
          console.log(`      Yıl: ${internship.educationYear.year}`);
          console.log(
            `      Aktif: ${internship.educationYear.active ? "EVET" : "HAYIR"}`
          );
        }
      });
    }

    // İlgili dekont kayıtlarını kontrol et
    console.log("\n🔍 3. İlgili dekont kayıtları kontrol ediliyor...");

    const dekonts = await prisma.dekont.findMany({
      where: {
        studentId: student.id,
      },
      include: {
        staj: {
          select: {
            id: true,
            status: true,
          },
        },
        company: {
          select: {
            name: true,
          },
        },
      },
      orderBy: [{ year: "desc" }, { month: "desc" }],
    });

    if (dekonts.length === 0) {
      console.log("❌ Bu öğrenciye ait dekont kaydı bulunamadı!");
    } else {
      console.log(`✅ ${dekonts.length} dekont kaydı bulundu!`);
      console.log("\n📄 DEKONT ÖZETİ:");
      console.log(
        "────────────────────────────────────────────────────────────────"
      );
      dekonts.forEach((dekont, index) => {
        console.log(
          `   ${index + 1}. ${dekont.year}/${dekont.month
            .toString()
            .padStart(2, "0")} - ${dekont.amount || "Belirtilmemiş"} TL - ${
            dekont.status
          } - ${dekont.company?.name || "Şirket bilgisi yok"}`
        );
      });
    }

    console.log(
      "\n════════════════════════════════════════════════════════════════"
    );
    console.log("✅ Arama tamamlandı!");
    console.log(
      "⚠️  NOT: Bu sadece OKUMA işlemidir, herhangi bir değişiklik yapılmamıştır."
    );
    console.log(
      "════════════════════════════════════════════════════════════════"
    );
  } catch (error) {
    console.error("❌ Hata oluştu:", error.message);
    console.error("📋 Hata detayları:", error);
  } finally {
    await prisma.$disconnect();
  }
}

// Script'i çalıştır
findElifPoyrazRecord();
