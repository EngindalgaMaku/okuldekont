const { PrismaClient } = require("@prisma/client");
require("dotenv").config();
const prisma = new PrismaClient();

async function testDekontFix() {
  try {
    await prisma.$connect();
    console.log("✅ TESTING DEKONT VAR INDICATOR FIX");
    console.log("═".repeat(70));

    const month = 12;
    const year = 2025;
    const elifStudentId = "cmfzckrej00utnn0lgapp5wm0";

    // Get Elif's internships
    const elifInternships = await prisma.staj.findMany({
      where: {
        studentId: elifStudentId,
        archived: false,
      },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            surname: true,
            number: true,
          },
        },
        company: {
          select: {
            id: true,
            name: true,
            companyType: true,
          },
        },
        teacher: {
          select: {
            id: true,
            name: true,
            surname: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    console.log("📋 ELIF'S INTERNSHIPS:");
    console.log("─".repeat(50));

    elifInternships.forEach((staj, i) => {
      console.log(`   ${i + 1}. Company: ${staj.company?.name}`);
      console.log(`      Status: ${staj.status}`);
      console.log(`      ID: ${staj.id}`);
      console.log("");
    });

    // Get dekontlar for December 2025
    const dekontlar = await prisma.dekont.findMany({
      where: {
        month: month,
        year: year,
        archived: false,
      },
      include: {
        staj: {
          include: {
            student: {
              select: {
                id: true,
                name: true,
                surname: true,
              },
            },
            company: {
              select: {
                id: true,
                name: true,
              },
            },
            teacher: {
              select: {
                id: true,
                name: true,
                surname: true,
              },
            },
          },
        },
      },
    });

    console.log("💰 DEKONTLAR FOR DECEMBER 2025:");
    console.log("─".repeat(50));

    dekontlar.forEach((dekont, i) => {
      console.log(
        `   ${i + 1}. Student: ${dekont.staj?.student?.name} ${
          dekont.staj?.student?.surname
        }`
      );
      console.log(`      Company: ${dekont.staj?.company?.name}`);
      console.log(`      Amount: ${dekont.amount}₺`);
      console.log(`      Status: ${dekont.status}`);
      console.log(`      StajId: ${dekont.stajId}`);
      console.log("");
    });

    console.log("🧪 TESTING FIXED LOGIC:");
    console.log("─".repeat(50));

    // Test the FIXED logic for each internship
    for (const staj of elifInternships) {
      console.log(`\n🏢 ${staj.company?.name} (${staj.status}):`);

      // This is the FIXED logic - check by internship ID
      const hasDekontFixed = dekontlar.some((d) => d.stajId === staj.id);

      // This was the BUGGY logic - check by student ID
      const hasDekontBuggy = dekontlar.some(
        (d) => d.staj?.student?.id === staj.studentId
      );

      console.log(`   ✅ FIXED has_dekont: ${hasDekontFixed ? "YES" : "NO"}`);
      console.log(
        `   🐛 OLD BUGGY has_dekont: ${hasDekontBuggy ? "YES" : "NO"}`
      );

      // Check if this is the expected result
      const isActive = staj.status === "ACTIVE";
      const expectedResult = isActive; // Only active internships should show dekont

      console.log(`   🎯 Expected: ${expectedResult ? "YES" : "NO"}`);
      console.log(
        `   ${hasDekontFixed === expectedResult ? "✅ CORRECT!" : "❌ WRONG!"}`
      );
    }

    console.log("\n📊 SUMMARY:");
    console.log("─".repeat(50));

    const activeStaj = elifInternships.find((s) => s.status === "ACTIVE");
    const terminatedStaj = elifInternships.find(
      (s) => s.status === "TERMINATED"
    );

    if (activeStaj && terminatedStaj) {
      const activeHasDekont = dekontlar.some((d) => d.stajId === activeStaj.id);
      const terminatedHasDekont = dekontlar.some(
        (d) => d.stajId === terminatedStaj.id
      );

      console.log(
        `Active internship (${activeStaj.company?.name}): ${
          activeHasDekont ? "✅ HAS DEKONT" : "❌ NO DEKONT"
        }`
      );
      console.log(
        `Terminated internship (${terminatedStaj.company?.name}): ${
          terminatedHasDekont
            ? "❌ HAS DEKONT (WRONG!)"
            : "✅ NO DEKONT (CORRECT!)"
        }`
      );

      if (activeHasDekont && !terminatedHasDekont) {
        console.log("\n🎉 SUCCESS: Fix is working correctly!");
        console.log("   - Active internship shows dekont indicator ✅");
        console.log(
          "   - Terminated internship does NOT show dekont indicator ✅"
        );
      } else {
        console.log("\n❌ ISSUE: Fix may not be working as expected");
      }
    }
  } catch (error) {
    console.error("❌ Error:", error.message);
    console.error("Stack:", error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

testDekontFix();
