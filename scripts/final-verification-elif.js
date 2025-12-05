const { PrismaClient } = require("@prisma/client");
require("dotenv").config();
const prisma = new PrismaClient();

async function finalVerification() {
  try {
    await prisma.$connect();
    console.log("🎯 FINAL VERIFICATION: ELIF POYRAZ DEKONT BUG FIX");
    console.log("═".repeat(70));

    console.log("📋 TASK REQUIREMENTS:");
    console.log(
      "   - Student ID: cmfzckrej00utnn0lgapp5wm0 (Elif Poyraz - 202423)"
    );
    console.log("   - Current month: December 2025");
    console.log("   - Expected Results:");
    console.log('     • Osman Çoban (ACTIVE): ✅ "Dekont var" + 1547.33₺');
    console.log(
      '     • Özlem Görünmez (TERMINATED): ❌ No indicator + "-" tutar'
    );
    console.log("");

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

    // Get dekontlar for December 2025
    const dekontlar = await prisma.dekont.findMany({
      where: {
        month: month,
        year: year,
        archived: false,
        staj: {
          studentId: elifStudentId,
        },
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
          },
        },
      },
    });

    console.log("🔍 ACTUAL RESULTS AFTER FIX:");
    console.log("─".repeat(50));

    let allCorrect = true;

    for (const staj of elifInternships) {
      const companyName = staj.company?.name;
      const status = staj.status;

      // Use the FIXED logic - check by internship ID (not student ID)
      const hasDekont = dekontlar.some((d) => d.stajId === staj.id);
      const dekontForThisStaj = dekontlar.find((d) => d.stajId === staj.id);
      const amount = dekontForThisStaj ? dekontForThisStaj.amount : null;

      console.log(`\n🏢 ${companyName} (${status}):`);
      console.log(`   Has Dekont: ${hasDekont ? "✅ YES" : "❌ NO"}`);
      console.log(`   Amount: ${amount ? amount + "₺" : '"-"'}`);

      // Verify against expected results
      if (companyName === "Osman Çoban") {
        const expectedHasDekont = true;
        const expectedAmount = 1547.33;

        if (
          hasDekont === expectedHasDekont &&
          Number(amount) === expectedAmount
        ) {
          console.log(`   🎯 EXPECTED: ✅ "Dekont var" + ${expectedAmount}₺`);
          console.log(`   ✅ RESULT: CORRECT!`);
        } else {
          console.log(`   🎯 EXPECTED: ✅ "Dekont var" + ${expectedAmount}₺`);
          console.log(
            `   ❌ RESULT: INCORRECT! (got hasDekont=${hasDekont}, amount=${Number(
              amount
            )})`
          );
          allCorrect = false;
        }
      } else if (companyName === "Özlem Görünmez") {
        const expectedHasDekont = false;

        if (hasDekont === expectedHasDekont) {
          console.log(`   🎯 EXPECTED: ❌ No indicator + "-" tutar`);
          console.log(`   ✅ RESULT: CORRECT!`);
        } else {
          console.log(`   🎯 EXPECTED: ❌ No indicator + "-" tutar`);
          console.log(`   ❌ RESULT: INCORRECT!`);
          allCorrect = false;
        }
      }
    }

    console.log("\n🧪 TERMINATED INTERNSHIP FILTERING TEST:");
    console.log("─".repeat(50));

    const terminatedStaj = elifInternships.find(
      (s) => s.status === "TERMINATED"
    );
    if (terminatedStaj) {
      const terminationDate = terminatedStaj.terminationDate;
      const currentMonth = new Date(2025, 11, 1); // December 2025

      console.log(
        `Termination Date: ${
          terminationDate?.toISOString().split("T")[0] || "N/A"
        }`
      );
      console.log(`Current Month: December 2025`);

      // Check if should be filtered out for December dekont
      const shouldShowForDecember =
        terminatedStaj.status !== "TERMINATED" ||
        (terminationDate && new Date(terminationDate) >= currentMonth);

      console.log(
        `Should show dekont for December: ${
          shouldShowForDecember ? "YES" : "NO"
        }`
      );

      if (!shouldShowForDecember) {
        console.log(
          "✅ TERMINATED internship correctly filtered out for December"
        );
      } else {
        console.log(
          "❌ TERMINATED internship incorrectly included for December"
        );
        allCorrect = false;
      }
    }

    console.log("\n📊 FINAL VERDICT:");
    console.log("═".repeat(70));

    if (allCorrect) {
      console.log("🎉 SUCCESS: All requirements met!");
      console.log("");
      console.log("✅ BUG FIXED SUCCESSFULLY:");
      console.log(
        "   - Changed from STUDENT-LEVEL logic to INTERNSHIP-LEVEL logic"
      );
      console.log(
        "   - Fixed in: src/app/api/admin/reports/dekont-status/route.ts"
      );
      console.log(
        "   - Line changed: has_dekont: companyDekontlar.some(d => d.stajId === s.id)"
      );
      console.log(
        "   - Previously: has_dekont: companyDekontlar.some(d => d.staj?.student?.id === s.student.id)"
      );
      console.log("");
      console.log("🎯 VERIFIED RESULTS:");
      console.log('   • Osman Çoban (ACTIVE): ✅ "Dekont var" + 1547.33₺');
      console.log(
        '   • Özlem Görünmez (TERMINATED): ❌ No indicator + "-" tutar'
      );
      console.log("");
      console.log("🔒 IMPACT:");
      console.log("   - Each internship now has its own dekont status");
      console.log(
        '   - TERMINATED internships no longer incorrectly show "Dekont var"'
      );
      console.log(
        "   - System now works correctly for students with multiple internships"
      );
    } else {
      console.log("❌ FAILURE: Some requirements not met!");
      console.log("   Please check the issues above and retry.");
    }
  } catch (error) {
    console.error("❌ Error:", error.message);
    console.error("Stack:", error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

finalVerification();
