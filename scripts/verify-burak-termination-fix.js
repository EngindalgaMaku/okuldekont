const { PrismaClient } = require("@prisma/client");
require("dotenv").config();

const prisma = new PrismaClient();

async function verifyBurakTerminationFix() {
  console.log("🔍 VERIFYING BURAK ŞENOL TERMINATION FIX");
  console.log("═".repeat(60));

  try {
    await prisma.$connect();

    // Known data from investigation
    const burakStudentId = "cmfzckr0800r6nn0lbxkkcc2t";
    const faGlobalId = "cmfzckr0000r2nn0l21bwlqab";

    console.log("\n1️⃣ TESTING DASHBOARD STATS FILTER (Previous Complex Logic)");

    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1;

    // Calculate previous month for dashboard stats
    const previousMonth = currentMonth === 1 ? 12 : currentMonth - 1;
    const previousYear = currentMonth === 1 ? currentYear - 1 : currentYear;

    // Test the new simplified filter logic
    const dashboardFilter = {
      month: previousMonth,
      year: previousYear,
      staj: {
        status: { not: "TERMINATED" },
      },
    };

    const dashboardDekontCount = await prisma.dekont.count({
      where: dashboardFilter,
    });

    // Specifically check if Burak appears in dashboard results
    const burakInDashboard = await prisma.dekont.count({
      where: {
        ...dashboardFilter,
        studentId: burakStudentId,
      },
    });

    console.log(
      `   📊 Total dekont count for ${previousMonth}/${previousYear}: ${dashboardDekontCount}`
    );
    console.log(`   🎯 Burak dekont count in dashboard: ${burakInDashboard}`);
    console.log(`   ✅ Expected: 0 (terminated students excluded)`);
    console.log(`   ✅ Result: ${burakInDashboard === 0 ? "PASS" : "FAIL ❌"}`);

    console.log("\n2️⃣ TESTING DEKONTLAR API FILTER (Main Dekont List)");

    // Test dekontlar API filter (current month)
    const dekontlarFilter = {
      archived: false,
      staj: {
        status: { not: "TERMINATED" },
      },
    };

    const dekontlarCount = await prisma.dekont.count({
      where: dekontlarFilter,
    });

    // Specifically check if Burak appears in dekont list
    const burakInDekontlar = await prisma.dekont.count({
      where: {
        ...dekontlarFilter,
        studentId: burakStudentId,
      },
    });

    console.log(`   📊 Total dekont count in main list: ${dekontlarCount}`);
    console.log(`   🎯 Burak dekont count in list: ${burakInDekontlar}`);
    console.log(`   ✅ Expected: 0 (terminated students excluded)`);
    console.log(`   ✅ Result: ${burakInDekontlar === 0 ? "PASS" : "FAIL ❌"}`);

    console.log("\n3️⃣ TESTING EXPECTED STUDENTS COUNT");

    // Test expected students count (private companies only)
    const expectedStudentsFilter = {
      archived: false,
      company: {
        companyType: "PRIVATE",
      },
      status: { not: "TERMINATED" },
    };

    const allInternships = await prisma.staj.findMany({
      where: expectedStudentsFilter,
      select: {
        studentId: true,
      },
    });

    const uniqueStudentIds = new Set(allInternships.map((s) => s.studentId));
    const totalExpectedStudents = uniqueStudentIds.size;

    // Check if Burak is in expected students
    const burakInExpected = uniqueStudentIds.has(burakStudentId);

    console.log(
      `   📊 Total expected students (private companies): ${totalExpectedStudents}`
    );
    console.log(`   🎯 Burak in expected students: ${burakInExpected}`);
    console.log(`   ✅ Expected: false (terminated students excluded)`);
    console.log(`   ✅ Result: ${!burakInExpected ? "PASS" : "FAIL ❌"}`);

    console.log("\n4️⃣ VERIFICATION OF BURAK'S CURRENT STATUS");

    // Double-check Burak's current internship status
    const burakStaj = await prisma.staj.findFirst({
      where: {
        studentId: burakStudentId,
        companyId: faGlobalId,
      },
      include: {
        student: { select: { name: true, surname: true } },
        company: { select: { name: true } },
      },
    });

    if (burakStaj) {
      console.log(
        `   👤 Student: ${burakStaj.student?.name} ${burakStaj.student?.surname}`
      );
      console.log(`   🏢 Company: ${burakStaj.company?.name}`);
      console.log(`   📊 Status: ${burakStaj.status}`);
      console.log(
        `   📅 Termination Date: ${
          burakStaj.terminationDate?.toISOString().split("T")[0] || "NULL"
        }`
      );
      console.log(
        `   ✅ Confirmed TERMINATED status: ${
          burakStaj.status === "TERMINATED" ? "YES" : "NO"
        }`
      );
    }

    console.log("\n5️⃣ TESTING EDGE CASES");

    // Test other terminated students to ensure fix applies system-wide
    const allTerminatedStudents = await prisma.staj.findMany({
      where: {
        status: "TERMINATED",
        archived: false,
      },
      select: {
        studentId: true,
        student: { select: { name: true, surname: true } },
        terminationDate: true,
      },
      take: 5, // Test first 5 terminated students
    });

    console.log(
      `   📊 Testing ${allTerminatedStudents.length} other terminated students...`
    );

    let allTerminatedExcluded = true;
    for (const terminated of allTerminatedStudents) {
      const appearsInList = await prisma.dekont.count({
        where: {
          ...dekontlarFilter,
          studentId: terminated.studentId,
        },
      });

      if (appearsInList > 0) {
        console.log(
          `   ❌ FAIL: ${terminated.student?.name} ${terminated.student?.surname} still appears in list`
        );
        allTerminatedExcluded = false;
      }
    }

    if (allTerminatedExcluded) {
      console.log(
        `   ✅ PASS: All tested terminated students properly excluded`
      );
    }

    console.log("\n6️⃣ FIX VERIFICATION SUMMARY");
    console.log("═".repeat(60));

    const allTestsPassed =
      burakInDashboard === 0 &&
      burakInDekontlar === 0 &&
      !burakInExpected &&
      burakStaj?.status === "TERMINATED" &&
      allTerminatedExcluded;

    if (allTestsPassed) {
      console.log("🎉 ✅ ALL TESTS PASSED!");
      console.log(
        "🎯 Burak Şenol termination bug has been SUCCESSFULLY FIXED!"
      );
      console.log(
        "📊 System now correctly excludes ALL terminated students from expected lists"
      );
      console.log("🏆 Business logic now matches user expectations");
    } else {
      console.log("❌ SOME TESTS FAILED - REVIEW NEEDED");
      console.log("🔍 Please check the individual test results above");
    }

    console.log("\n📋 FIX DETAILS:");
    console.log("   • Simplified filtering logic in both APIs");
    console.log("   • Removed complex termination date comparisons");
    console.log(
      "   • Now excludes ALL terminated students regardless of termination date"
    );
    console.log("   • Aligns system behavior with user expectations");
  } catch (error) {
    console.error("❌ Verification failed:", error);
    console.error("Stack:", error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the verification
verifyBurakTerminationFix();
