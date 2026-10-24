const { PrismaClient } = require("@prisma/client");
require("dotenv").config();

const prisma = new PrismaClient();

async function findEmreYegulRecord() {
  try {
    console.log(
      "🔍 Emre Yegül - Ömer Koçak Mühendislik staj kaydı aranıyor...\n"
    );
    console.log(
      "════════════════════════════════════════════════════════════════"
    );

    // Target student and company info
    const targetStudent = {
      name: "Emre",
      surname: "Yegül",
    };

    const targetCompany = {
      name: "Ömer Koçak Mühendislik",
    };

    console.log("📋 Aranan bilgiler:");
    console.log(`   Öğrenci: ${targetStudent.name} ${targetStudent.surname}`);
    console.log(`   İşletme: ${targetCompany.name}`);
    console.log(
      "════════════════════════════════════════════════════════════════\n"
    );

    // Find the student first
    console.log("🔍 1. Öğrenci kaydı aranıyor...");

    const students = await prisma.student.findMany({
      where: {
        name: {
          contains: targetStudent.name,
        },
        surname: {
          contains: targetStudent.surname,
        },
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

    if (students.length === 0) {
      console.log("❌ Emre Yegül adlı öğrenci bulunamadı!");

      // Search for similar students
      const similarStudents = await prisma.student.findMany({
        where: {
          OR: [
            {
              name: {
                contains: "Emre",
              },
            },
            {
              surname: {
                contains: "Yegül",
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

    console.log(`✅ ${students.length} Emre Yegül kaydı bulundu!`);

    // Search for the company
    console.log("\n🔍 2. İşletme kaydı aranıyor...");

    const companies = await prisma.companyProfile.findMany({
      where: {
        name: {
          contains: "Ömer Koçak",
        },
      },
      include: {
        teacher: {
          select: {
            id: true,
            name: true,
            surname: true,
          },
        },
      },
    });

    if (companies.length === 0) {
      console.log("❌ Ömer Koçak Mühendislik işletmesi bulunamadı!");

      // Search for similar companies
      const similarCompanies = await prisma.companyProfile.findMany({
        where: {
          OR: [
            {
              name: {
                contains: "Ömer",
              },
            },
            {
              name: {
                contains: "Koçak",
              },
            },
            {
              name: {
                contains: "Mühendislik",
              },
            },
          ],
        },
        take: 10,
      });

      if (similarCompanies.length > 0) {
        console.log(`\n📋 ${similarCompanies.length} benzer işletme bulundu:`);
        similarCompanies.forEach((c, index) => {
          console.log(`   ${index + 1}. ${c.name} - ${c.contact}`);
        });
      }

      await prisma.$disconnect();
      return;
    }

    console.log(`✅ ${companies.length} Ömer Koçak işletmesi bulundu!`);

    // Now search for internships that match both student and company
    console.log("\n🔍 3. Staj kayıtları aranıyor...");

    let foundInternships = [];

    for (const student of students) {
      for (const company of companies) {
        const internships = await prisma.staj.findMany({
          where: {
            studentId: student.id,
            companyId: company.id,
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

        if (internships.length > 0) {
          foundInternships.push(...internships);
        }
      }
    }

    if (foundInternships.length === 0) {
      console.log(
        "❌ Emre Yegül - Ömer Koçak Mühendislik eşleşmesi bulunamadı!"
      );

      console.log("\n📋 Bulunan öğrenciler:");
      students.forEach((s, index) => {
        console.log(
          `   ${index + 1}. ${s.name} ${s.surname} (ID: ${s.id}) - ${
            s.className
          }`
        );
      });

      console.log("\n📋 Bulunan işletmeler:");
      companies.forEach((c, index) => {
        console.log(`   ${index + 1}. ${c.name} (ID: ${c.id}) - ${c.contact}`);
      });

      // Show all internships for found students
      console.log("\n📋 Bulunan öğrencilerin tüm staj kayıtları:");
      for (const student of students) {
        const allInternships = await prisma.staj.findMany({
          where: {
            studentId: student.id,
          },
          include: {
            company: {
              select: {
                name: true,
              },
            },
          },
        });

        console.log(`\n   👤 ${student.name} ${student.surname}:`);
        if (allInternships.length === 0) {
          console.log("      ❌ Staj kaydı yok");
        } else {
          allInternships.forEach((int, idx) => {
            console.log(
              `      ${idx + 1}. ${int.company.name} - ${int.status}`
            );
          });
        }
      }
    } else {
      console.log(`✅ ${foundInternships.length} eşleşen staj kaydı bulundu!`);

      foundInternships.forEach((internship, index) => {
        console.log(
          "\n════════════════════════════════════════════════════════════════"
        );
        console.log(`📋 STAJ KAYDI #${index + 1}:`);
        console.log(
          "────────────────────────────────────────────────────────────────"
        );
        console.log(`   🆔 Staj ID: ${internship.id}`);
        console.log(
          `   👤 Öğrenci: ${internship.student.name} ${internship.student.surname} (${internship.student.number})`
        );
        console.log(`   🏢 İşletme: ${internship.company.name}`);
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

        // Company details
        if (internship.company) {
          console.log("\n   🏢 İŞLETME BİLGİLERİ:");
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
        }

        // Teacher details
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

        // Education year details
        if (internship.educationYear) {
          console.log("\n   📚 EĞİTİM YILI:");
          console.log(`      Yıl: ${internship.educationYear.year}`);
          console.log(
            `      Aktif: ${internship.educationYear.active ? "EVET" : "HAYIR"}`
          );
        }

        // Target termination date check
        console.log("\n   🎯 FESİH TARİHİ ANALİZİ:");
        console.log(
          `      Mevcut Fesih Tarihi: ${
            internship.terminationDate
              ? internship.terminationDate.toLocaleDateString("tr-TR")
              : "YOK"
          }`
        );
        console.log(`      Hedef Fesih Tarihi: 31.10.2025`);

        if (internship.terminationDate) {
          const currentTermDate = internship.terminationDate
            .toISOString()
            .split("T")[0];
          const targetTermDate = "2025-10-31";
          if (currentTermDate === targetTermDate) {
            console.log(`      ✅ Fesih tarihi zaten doğru!`);
          } else {
            console.log(`      ❌ Fesih tarihi düzeltilmesi gerekiyor!`);
            console.log(
              `      📝 Güncelleme: ${currentTermDate} → ${targetTermDate}`
            );
          }
        } else {
          console.log(`      ❌ Fesih tarihi eksik, eklenmesi gerekiyor!`);
        }

        if (internship.status !== "TERMINATED") {
          console.log(
            `      📊 Status güncellenmesi gerekiyor: ${internship.status} → TERMINATED`
          );
        } else {
          console.log(`      ✅ Status zaten TERMINATED`);
        }
      });

      // Print summary for fix script
      if (foundInternships.length === 1) {
        const internship = foundInternships[0];
        console.log(
          "\n════════════════════════════════════════════════════════════════"
        );
        console.log("📋 GÜNCELLEME SCRIPT İÇİN GEREKLI BİLGİLER:");
        console.log(
          "────────────────────────────────────────────────────────────────"
        );
        console.log(`const emreStudentId = "${internship.student.id}";`);
        console.log(`const omerKocakCompanyId = "${internship.company.id}";`);
        console.log(`const emreStajId = "${internship.id}";`);
        console.log(
          "────────────────────────────────────────────────────────────────"
        );
      } else if (foundInternships.length > 1) {
        console.log(
          `\n⚠️  UYARI: ${foundInternships.length} staj kaydı bulundu. Hangisinin güncelleneceğine karar verilmesi gerekiyor.`
        );
      }
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
findEmreYegulRecord();
