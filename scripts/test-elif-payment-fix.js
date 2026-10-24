const { PrismaClient } = require("@prisma/client");
require("dotenv").config();
const prisma = new PrismaClient();

async function testElifPaymentFix() {
  try {
    await prisma.$connect();
    console.log("🧪 ELİF POYRAZ PAYMENT FIX VALİDATİON TESİT");
    console.log("═".repeat(70));

    const elifStajId = "cmfzckrex00uxnn0l56da78bg";

    // Test November 2025 (when Elif worked until Nov 7)
    const testMonth = 11; // November
    const testYear = 2025;
    const monthStart = new Date(testYear, testMonth - 1, 1);

    console.log("📅 TEST PARAMETERS:");
    console.log("─".repeat(50));
    console.log(`   Test Month: ${testMonth}/${testYear} (November 2025)`);
    console.log(
      `   Month Start Date: ${monthStart.toISOString().split("T")[0]}`
    );
    console.log(`   Expected: Elif should be INCLUDED (worked until Nov 7)`);

    // Test 1: Dashboard Stats API Logic (Fixed Filter)
    console.log("\n🧪 TEST 1: DASHBOARD STATS API LOGIC");
    console.log("─".repeat(50));

    const dashboardFilter = {
      month: testMonth,
      year: testYear,
      staj: {
        OR: [
          // Non-terminated students
          { status: { not: "TERMINATED" } },
          // Terminated students who worked during the month
          {
            AND: [
              { status: "TERMINATED" },
              {
                OR: [
                  // Has terminationDate and it's >= month start
                  {
                    AND: [
                      { terminationDate: { not: null } },
                      { terminationDate: { gte: monthStart } },
                    ],
                  },
                  // No terminationDate but endDate >= month start (fallback for data integrity)
                  {
                    AND: [
                      { terminationDate: null },
                      { endDate: { gte: monthStart } },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    };

    const dashboardResult = await prisma.dekont.findMany({
      where: dashboardFilter,
      include: {
        staj: {
          include: {
            student: { select: { name: true, surname: true } },
          },
        },
      },
    });

    const elifInDashboard = dashboardResult.find(
      (d) => d.stajId === elifStajId
    );
    console.log(
      `   Result: Elif in dashboard stats: ${
        elifInDashboard ? "✅ YES" : "❌ NO"
      }`
    );
    console.log(`   Total dekontlar found: ${dashboardResult.length}`);

    if (elifInDashboard) {
      console.log(`   ✅ SUCCESS: Dashboard API now includes Elif!`);
    } else {
      console.log(`   ❌ ISSUE: Dashboard API still excludes Elif`);
    }

    // Test 2: Dekont Status Report API Logic (Fixed Filter)
    console.log("\n🧪 TEST 2: DEKONT STATUS REPORT API LOGIC");
    console.log("─".repeat(50));

    const dekontStatusFilter = {
      archived: false,
      educationYear: {
        active: true,
      },
      company: {
        companyType: "PRIVATE",
      },
      OR: [
        // Non-terminated students
        { status: { not: "TERMINATED" } },
        // Terminated students who worked during the month
        {
          AND: [
            { status: "TERMINATED" },
            {
              OR: [
                // Has terminationDate and it's >= month start
                {
                  AND: [
                    { terminationDate: { not: null } },
                    { terminationDate: { gte: monthStart } },
                  ],
                },
                // No terminationDate but endDate >= month start (fallback for data integrity)
                {
                  AND: [
                    { terminationDate: null },
                    { endDate: { gte: monthStart } },
                  ],
                },
              ],
            },
          ],
        },
      ],
    };

    const dekontStatusResult = await prisma.staj.findMany({
      where: dekontStatusFilter,
      include: {
        student: { select: { name: true, surname: true } },
      },
    });

    const elifInDekontStatus = dekontStatusResult.find(
      (s) => s.id === elifStajId
    );
    console.log(
      `   Result: Elif in dekont status: ${
        elifInDekontStatus ? "✅ YES" : "❌ NO"
      }`
    );
    console.log(`   Total stajlar found: ${dekontStatusResult.length}`);

    if (elifInDekontStatus) {
      console.log(`   ✅ SUCCESS: Dekont Status API now includes Elif!`);
    } else {
      console.log(`   ❌ ISSUE: Dekont Status API still excludes Elif`);
    }

    // Test 3: All TERMINATED students that should be included
    console.log("\n🧪 TEST 3: ALL TERMINATED STUDENTS INCLUDED IN NOVEMBER");
    console.log("─".repeat(50));

    const terminatedStudentsForNov = dekontStatusResult.filter(
      (s) => s.status === "TERMINATED"
    );
    console.log(
      `   TERMINATED students included in November: ${terminatedStudentsForNov.length}`
    );

    terminatedStudentsForNov.forEach((student, i) => {
      const isElif = student.id === elifStajId;
      const effectiveTerminationDate =
        student.terminationDate || student.endDate;
      console.log(
        `     ${i + 1}. ${student.student.name} ${student.student.surname} ${
          isElif ? "← ELİF" : ""
        }`
      );
      console.log(
        `        End Date: ${student.endDate?.toISOString().split("T")[0]}`
      );
      console.log(
        `        Termination Date: ${
          student.terminationDate?.toISOString().split("T")[0] ||
          "NULL (using endDate)"
        }`
      );
      console.log(
        `        Effective Date: ${
          effectiveTerminationDate?.toISOString().split("T")[0]
        }`
      );
    });

    // Test 4: Summary
    console.log("\n💡 FIX VALIDATION SUMMARY:");
    console.log("═".repeat(70));

    const bothAPIsIncludeElif = elifInDashboard && elifInDekontStatus;

    if (bothAPIsIncludeElif) {
      console.log("🎉 SUCCESS: Both APIs now correctly include Elif Poyraz!");
      console.log("");
      console.log("✅ Dashboard Stats API: FIXED");
      console.log("✅ Dekont Status Report API: FIXED");
      console.log("");
      console.log("📋 Issue Resolution:");
      console.log("   - Changed from AND to OR logic in filters");
      console.log("   - Include non-terminated students");
      console.log(
        "   - Include terminated students who worked during the month"
      );
      console.log("   - Handle data integrity issues (null terminationDate)");
      console.log("");
      console.log("🎯 Elif will now appear in:");
      console.log("   - November 2025 payment calculations");
      console.log("   - Dashboard statistics");
      console.log("   - Dekont status reports");
      console.log("   - Expected dekont lists");
    } else {
      console.log("❌ PARTIAL SUCCESS: Some issues remain");
      console.log(
        `   Dashboard API: ${elifInDashboard ? "FIXED ✅" : "STILL BROKEN ❌"}`
      );
      console.log(
        `   Dekont Status API: ${
          elifInDekontStatus ? "FIXED ✅" : "STILL BROKEN ❌"
        }`
      );
    }
  } catch (error) {
    console.error("❌ Error:", error.message);
    console.error("Stack:", error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

testElifPaymentFix();
