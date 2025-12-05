const { PrismaClient } = require("@prisma/client");
require("dotenv").config();
const prisma = new PrismaClient();

async function investigateElifPaymentFiltering() {
  try {
    await prisma.$connect();
    console.log(
      "🔍 ELİF POYRAZ PAYMENT CALCULATION FİLTERİNG SORUNU ARAŞTIRMASI"
    );
    console.log("═".repeat(70));

    // Get Elif's staj record first
    const elifStajId = "cmfzckrex00uxnn0l56da78bg";
    const elifRecord = await prisma.staj.findUnique({
      where: { id: elifStajId },
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
        educationYear: {
          select: {
            id: true,
            year: true,
            active: true,
          },
        },
      },
    });

    if (!elifRecord) {
      console.log("❌ Elif record not found");
      return;
    }

    console.log("📋 ELİF POYRAZ STAJ RECORD:");
    console.log("─".repeat(50));
    console.log(
      `   Student: ${elifRecord.student?.name} ${elifRecord.student?.surname} (${elifRecord.student?.number})`
    );
    console.log(
      `   Company: ${elifRecord.company?.name} (Type: ${elifRecord.company?.companyType})`
    );
    console.log(
      `   Teacher: ${elifRecord.teacher?.name} ${elifRecord.teacher?.surname}`
    );
    console.log(`   Status: ${elifRecord.status}`);
    console.log(
      `   Start: ${elifRecord.startDate?.toISOString().split("T")[0]}`
    );
    console.log(`   End: ${elifRecord.endDate?.toISOString().split("T")[0]}`);
    console.log(
      `   Termination: ${
        elifRecord.terminationDate?.toISOString().split("T")[0] || "N/A"
      }`
    );
    console.log(
      `   Education Year: ${elifRecord.educationYear?.year} (Active: ${elifRecord.educationYear?.active})`
    );
    console.log(`   Archived: ${elifRecord.archived}`);

    // Test for November 2025
    const testMonth = 11; // November
    const testYear = 2025;

    console.log("\n🧪 KASIM 2025 FİLTER TESTLERİ:");
    console.log("─".repeat(50));

    // Test 1: Current BROKEN filter from dashboard-stats
    console.log("\n1. 📊 Dashboard Stats API Filteri (MEVCUT - BROKEN):");
    const dashboardFilter = {
      month: testMonth,
      year: testYear,
      staj: {
        AND: [
          { status: { not: "TERMINATED" } },
          {
            OR: [
              { terminationDate: null },
              {
                terminationDate: {
                  gte: new Date(testYear, testMonth - 1, 1),
                },
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
      `   ❌ Elif in dashboard stats: ${elifInDashboard ? "YES" : "NO"}`
    );
    console.log(`   📊 Total dekontlar found: ${dashboardResult.length}`);

    // Test 2: Current BROKEN filter from dekont-status
    console.log("\n2. 📋 Dekont Status Report Filteri (MEVCUT - BROKEN):");
    const dekontStatusFilter = {
      archived: false,
      educationYear: {
        active: true,
      },
      company: {
        companyType: "PRIVATE",
      },
      AND: [
        { status: { not: "TERMINATED" } },
        {
          OR: [
            { terminationDate: null },
            { terminationDate: { gte: new Date(testYear, testMonth - 1, 1) } },
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
      `   ❌ Elif in dekont status: ${elifInDekontStatus ? "YES" : "NO"}`
    );
    console.log(`   📋 Total stajlar found: ${dekontStatusResult.length}`);

    // Test 3: CORRECT filter (what it should be)
    console.log("\n3. ✅ CORRECT Filter (PROPOSED FIX):");
    const correctFilter = {
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
        // Terminated students whose termination date is after start of the month
        {
          AND: [
            { status: "TERMINATED" },
            { terminationDate: { gte: new Date(testYear, testMonth - 1, 1) } },
          ],
        },
      ],
    };

    const correctResult = await prisma.staj.findMany({
      where: correctFilter,
      include: {
        student: { select: { name: true, surname: true } },
      },
    });

    const elifInCorrectFilter = correctResult.find((s) => s.id === elifStajId);
    console.log(
      `   ✅ Elif in correct filter: ${elifInCorrectFilter ? "YES" : "NO"}`
    );
    console.log(`   📋 Total stajlar found: ${correctResult.length}`);

    // Test 4: Detailed termination date analysis
    console.log("\n4. 🗓️ TERMINATION DATE ANALYSIS:");
    console.log("─".repeat(40));
    const novemberStart = new Date(testYear, testMonth - 1, 1);
    console.log(
      `   November 2025 start date: ${
        novemberStart.toISOString().split("T")[0]
      }`
    );
    console.log(
      `   Elif's termination date: ${
        elifRecord.terminationDate?.toISOString().split("T")[0] || "N/A"
      }`
    );

    if (elifRecord.terminationDate) {
      const isAfterNovemberStart = elifRecord.terminationDate >= novemberStart;
      console.log(
        `   Termination after Nov 1st: ${
          isAfterNovemberStart ? "YES ✅" : "NO ❌"
        }`
      );
      console.log(
        `   → Elif SHOULD be included in November calculations: ${
          isAfterNovemberStart ? "YES" : "NO"
        }`
      );
    } else {
      console.log(`   → No termination date, should be included: YES`);
    }

    // Test 5: All TERMINATED students analysis
    console.log("\n5. 👥 ALL TERMINATED STUDENTS ANALYSIS:");
    console.log("─".repeat(45));
    const allTerminatedStudents = await prisma.staj.findMany({
      where: {
        status: "TERMINATED",
        archived: false,
        educationYear: {
          active: true,
        },
      },
      include: {
        student: { select: { name: true, surname: true } },
        company: { select: { name: true, companyType: true } },
      },
    });

    console.log(
      `   Total TERMINATED students: ${allTerminatedStudents.length}`
    );

    const terminatedInNovember = allTerminatedStudents.filter((s) => {
      if (!s.terminationDate) return false;
      return s.terminationDate >= novemberStart;
    });

    console.log(
      `   TERMINATED after Nov 1st (should be included): ${terminatedInNovember.length}`
    );
    terminatedInNovember.forEach((s, i) => {
      console.log(
        `     ${i + 1}. ${s.student.name} ${s.student.surname} - Terminated: ${
          s.terminationDate?.toISOString().split("T")[0]
        }`
      );
      console.log(
        `        Company: ${s.company?.name} (${s.company?.companyType})`
      );
    });

    console.log("\n💡 DIAGNOSIS SUMMARY:");
    console.log("═".repeat(70));
    console.log(
      "❌ PROBLEM: Both APIs use AND logic that excludes ALL TERMINATED students"
    );
    console.log(
      '   - First condition: status: { not: "TERMINATED" } → Excludes Elif'
    );
    console.log(
      "   - Second condition: terminationDate check → Never evaluated for TERMINATED students"
    );
    console.log("");
    console.log("✅ SOLUTION: Change AND to OR logic:");
    console.log("   - Include ALL non-terminated students");
    console.log(
      "   - Include TERMINATED students whose termination date >= month start"
    );
    console.log(
      "   - This ensures students who worked during the month get paid"
    );
  } catch (error) {
    console.error("❌ Error:", error.message);
    console.error("Stack:", error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

investigateElifPaymentFiltering();
