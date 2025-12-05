const { PrismaClient } = require("@prisma/client");
require("dotenv").config();
const prisma = new PrismaClient();

async function debugDekontVarLogic() {
  try {
    await prisma.$connect();
    console.log("🐛 DEKONT VAR INDICATOR BUG DIAGNOSIS");
    console.log("═".repeat(70));

    // Get Elif's data
    const elifStudentId = "cmfzckrej00utnn0lgapp5wm0";
    const currentDate = new Date(); // December 2025
    const month = 12; // December
    const year = 2025;

    console.log("📋 ELIF POYRAZ - BOTH INTERNSHIPS:");
    console.log("─".repeat(50));

    // Get both internships for Elif
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
            name: true,
            surname: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    console.log(`Found ${elifInternships.length} internships for Elif:`);
    elifInternships.forEach((staj, i) => {
      console.log(`   ${i + 1}. Company: ${staj.company?.name}`);
      console.log(`      Status: ${staj.status}`);
      console.log(
        `      Termination: ${
          staj.terminationDate?.toISOString().split("T")[0] || "N/A"
        }`
      );
      console.log(`      Company Type: ${staj.company?.companyType}`);
      console.log("");
    });

    console.log("🔍 DEKONT ANALYSIS BY INTERNSHIP:");
    console.log("─".repeat(50));

    // Check dekontlar for each internship separately
    for (const staj of elifInternships) {
      console.log(`\n🏢 INTERNSHIP: ${staj.company?.name} (${staj.status})`);

      // Get dekontlar for THIS specific internship (correct logic)
      const internshipDekontlar = await prisma.dekont.findMany({
        where: {
          stajId: staj.id, // This is the correct way - per internship
          month: month,
          year: year,
          archived: false,
        },
        select: {
          id: true,
          amount: true,
          status: true,
        },
      });

      // Get dekontlar using STUDENT-LEVEL logic (current buggy logic)
      const studentDekontlarForCompany = await prisma.dekont.findMany({
        where: {
          month: month,
          year: year,
          archived: false,
          staj: {
            studentId: elifStudentId, // This is the buggy logic - it sees ALL dekontlar for student
            companyId: staj.companyId, // Only for this company
          },
        },
        select: {
          id: true,
          amount: true,
          status: true,
          staj: {
            select: {
              company: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
      });

      console.log(
        `   ✅ CORRECT LOGIC (per internship): ${internshipDekontlar.length} dekontlar found`
      );
      internshipDekontlar.forEach((dekont, i) => {
        console.log(
          `      ${i + 1}. Amount: ${dekont.amount || "-"}₺ (Status: ${
            dekont.status
          })`
        );
      });

      console.log(
        `   ❌ BUGGY LOGIC (student-level): ${studentDekontlarForCompany.length} dekontlar found`
      );
      studentDekontlarForCompany.forEach((dekont, i) => {
        console.log(
          `      ${i + 1}. Amount: ${dekont.amount || "-"}₺ from ${
            dekont.staj?.company?.name
          }`
        );
      });

      // Check if internship should be filtered out for current month
      const shouldShowForDecember =
        staj.status !== "TERMINATED" ||
        (staj.terminationDate &&
          new Date(staj.terminationDate) >= new Date(year, month - 1, 1));

      console.log(
        `   📅 Should show for December 2025: ${
          shouldShowForDecember ? "✅ YES" : "❌ NO"
        }`
      );

      // Determine correct "has_dekont" indicator
      const correctHasDekont = internshipDekontlar.length > 0;
      const buggyHasDekont = studentDekontlarForCompany.length > 0;

      console.log(
        `   🎯 CORRECT "has_dekont": ${correctHasDekont ? "✅ YES" : "❌ NO"}`
      );
      console.log(
        `   🐛 BUGGY "has_dekont": ${
          buggyHasDekont ? "✅ YES (WRONG!)" : "❌ NO"
        }`
      );
    }

    console.log("\n🧠 SIMULATING DEKONT-STATUS API (CURRENT BUGGY LOGIC):");
    console.log("─".repeat(50));

    // Simulate the current dekont-status API logic (from line 206-208)
    const allDekontlarForMonth = await prisma.dekont.findMany({
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
          },
        },
      },
    });

    console.log(
      `Total dekontlar for ${month}/${year}: ${allDekontlarForMonth.length}`
    );

    // Group by company for teacher view
    const companyGroups = {};
    for (const staj of elifInternships) {
      if (!companyGroups[staj.companyId]) {
        companyGroups[staj.companyId] = {
          company: staj.company,
          students: [],
          dekontlar: [],
        };
      }

      companyGroups[staj.companyId].students.push({
        internship: staj,
        student: staj.student,
      });
    }

    // Add dekontlar to each company group
    allDekontlarForMonth.forEach((dekont) => {
      const companyId = dekont.staj?.company?.id;
      if (companyGroups[companyId]) {
        companyGroups[companyId].dekontlar.push(dekont);
      }
    });

    // Simulate the buggy logic for each company
    Object.values(companyGroups).forEach((group) => {
      console.log(`\n🏢 Company: ${group.company?.name}`);

      group.students.forEach(({ internship, student }) => {
        // This is the BUGGY line from dekont-status/route.ts:206-208
        const buggyHasDekont = group.dekontlar.some(
          (d) => d.staj?.student?.id === student.id
        );

        // This is the CORRECT logic (should check specific internship)
        const correctHasDekont = group.dekontlar.some(
          (d) => d.stajId === internship.id
        );

        console.log(`   Student: ${student.name} ${student.surname}`);
        console.log(`     Internship Status: ${internship.status}`);
        console.log(
          `     🐛 Buggy has_dekont: ${buggyHasDekont ? "YES" : "NO"}`
        );
        console.log(
          `     ✅ Correct has_dekont: ${correctHasDekont ? "YES" : "NO"}`
        );
      });
    });

    console.log("\n💡 BUG SUMMARY:");
    console.log("─".repeat(50));
    console.log("❌ PROBLEM: dekont-status API uses STUDENT-LEVEL logic");
    console.log(
      "   Line 206-208: has_dekont: companyDekontlar.some(d => d.staj?.student?.id === s.student.id)"
    );
    console.log("");
    console.log("✅ SOLUTION: Should use INTERNSHIP-LEVEL logic");
    console.log(
      "   Should be: has_dekont: companyDekontlar.some(d => d.stajId === s.id)"
    );
    console.log("");
    console.log(
      '🎯 IMPACT: Elif shows "Dekont var" for TERMINATED Özlem Görünmez internship'
    );
    console.log(
      "   because dekont exists for her ACTIVE Osman Çoban internship"
    );
  } catch (error) {
    console.error("❌ Error:", error.message);
    console.error("Stack:", error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

debugDekontVarLogic();
