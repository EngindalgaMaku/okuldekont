const { PrismaClient } = require("@prisma/client");
require("dotenv").config();

const prisma = new PrismaClient();

async function verifyEmreYegulUpdate() {
  console.log("🔍 VERIFYING EMRE YEGÜL TERMINATION DATE UPDATE");
  console.log("═".repeat(60));

  try {
    await prisma.$connect();

    // Known data from investigation
    const emreStudentId = "cmfzckpoc00hqnn0lkxeklmr3";
    const omerKocakCompanyId = "cmfzckob1007jnn0lvx0iy1fz";
    const emreStajId = "cmfzckpol00hunn0laaebof13";
    const targetTerminationDate = "2025-10-31";

    console.log("\n1️⃣ RECORD VERIFICATION");

    // Get current record state
    const record = await prisma.staj.findUnique({
      where: { id: emreStajId },
      include: {
        student: {
          select: {
            name: true,
            surname: true,
            number: true,
          },
        },
        company: {
          select: {
            name: true,
            contact: true,
          },
        },
        educationYear: {
          select: {
            year: true,
            active: true,
          },
        },
        lastModifiedByUser: {
          select: {
            email: true,
          },
        },
      },
    });

    if (!record) {
      console.error("❌ Staj record not found!");
      return false;
    }

    console.log(
      `   👤 Student: ${record.student?.name} ${record.student?.surname} (${record.student?.number})`
    );
    console.log(`   🏢 Company: ${record.company?.name}`);
    console.log(`   📚 Education Year: ${record.educationYear?.year}`);
    console.log(`   📊 Status: ${record.status}`);
    console.log(
      `   📅 Current Termination Date: ${
        record.terminationDate?.toISOString().split("T")[0]
      }`
    );
    console.log(`   🎯 Expected Termination Date: ${targetTerminationDate}`);
    console.log(`   ⏰ Last Modified: ${record.lastModifiedAt?.toISOString()}`);
    console.log(
      `   👤 Last Modified By: ${record.lastModifiedByUser?.email || "System"}`
    );

    console.log("\n2️⃣ DATE VERIFICATION");

    const currentTerminationDate = record.terminationDate
      ?.toISOString()
      .split("T")[0];
    const isDateCorrect = currentTerminationDate === targetTerminationDate;
    const isStatusCorrect = record.status === "TERMINATED";

    console.log(
      `   📊 Termination Date Check: ${currentTerminationDate} === ${targetTerminationDate} → ${
        isDateCorrect ? "✅ PASS" : "❌ FAIL"
      }`
    );
    console.log(
      `   📊 Status Check: ${record.status} === TERMINATED → ${
        isStatusCorrect ? "✅ PASS" : "❌ FAIL"
      }`
    );

    console.log("\n3️⃣ SYSTEM BEHAVIOR VERIFICATION");

    // Test November 2025 filtering
    const novemberStart = new Date(2025, 10, 1); // November 1, 2025
    const terminationDate = record.terminationDate;

    if (terminationDate) {
      const shouldBeExcludedFromNovember = terminationDate < novemberStart;
      console.log(
        `   📊 Termination: ${terminationDate.toISOString().split("T")[0]}`
      );
      console.log(
        `   📊 November Start: ${novemberStart.toISOString().split("T")[0]}`
      );
      console.log(
        `   🎯 Excluded from November list: ${
          shouldBeExcludedFromNovember ? "✅ YES" : "❌ NO"
        }`
      );
    }

    // Check if student appears in current expected lists
    const expectedStudentsActive = await prisma.staj.findMany({
      where: {
        archived: false,
        status: { not: "TERMINATED" },
      },
      select: { studentId: true },
    });

    const activeStudentIds = new Set(
      expectedStudentsActive.map((s) => s.studentId)
    );
    const emreInActiveList = activeStudentIds.has(emreStudentId);

    console.log(`   📊 Total active students: ${activeStudentIds.size}`);
    console.log(
      `   🎯 Emre in active list: ${
        emreInActiveList ? "❌ YES (should be NO)" : "✅ NO"
      }`
    );

    // Check dekont records
    const dekontCount = await prisma.dekont.count({
      where: {
        studentId: emreStudentId,
        staj: {
          status: { not: "TERMINATED" },
        },
      },
    });

    console.log(`   📊 Active dekont records: ${dekontCount} (should be 0)`);

    // Check recent dekont records to ensure they still exist
    const allDekontRecords = await prisma.dekont.findMany({
      where: {
        studentId: emreStudentId,
      },
      orderBy: [{ year: "desc" }, { month: "desc" }],
      take: 5,
    });

    console.log(`   📊 Total dekont records: ${allDekontRecords.length}`);
    if (allDekontRecords.length > 0) {
      console.log(
        `   📊 Most recent dekont: ${
          allDekontRecords[0].year
        }/${allDekontRecords[0].month.toString().padStart(2, "0")}`
      );
    }

    console.log("\n4️⃣ COMPREHENSIVE VERIFICATION SUMMARY");
    console.log("─".repeat(60));

    const allChecksPass = [
      isDateCorrect,
      isStatusCorrect,
      !emreInActiveList,
      dekontCount === 0,
      terminationDate && terminationDate < novemberStart,
    ].every((check) => check);

    if (allChecksPass) {
      console.log("🎉 ✅ ALL VERIFICATION CHECKS PASSED!");
      console.log("🎯 Emre Yegül's termination date update is SUCCESSFUL");
      console.log("📊 Student correctly excluded from expected lists");
      console.log("🏆 Fix is complete and working as expected");
    } else {
      console.log("❌ VERIFICATION FAILED - Some checks did not pass");
      console.log("⚠️  Please review the checks above");
    }

    console.log("\n5️⃣ DETAILED VERIFICATION RESULTS");
    console.log("─".repeat(60));

    const checks = [
      {
        name: "Termination Date Correct",
        status: isDateCorrect,
        expected: targetTerminationDate,
        actual: currentTerminationDate,
      },
      {
        name: "Status is TERMINATED",
        status: isStatusCorrect,
        expected: "TERMINATED",
        actual: record.status,
      },
      {
        name: "Not in Active Lists",
        status: !emreInActiveList,
        expected: "false",
        actual: emreInActiveList.toString(),
      },
      {
        name: "No Active Dekonts",
        status: dekontCount === 0,
        expected: "0",
        actual: dekontCount.toString(),
      },
      {
        name: "Excluded from November",
        status: terminationDate && terminationDate < novemberStart,
        expected: "true",
        actual: (terminationDate && terminationDate < novemberStart).toString(),
      },
    ];

    checks.forEach((check, index) => {
      const statusIcon = check.status ? "✅" : "❌";
      console.log(`   ${index + 1}. ${statusIcon} ${check.name}`);
      console.log(`      Expected: ${check.expected}`);
      console.log(`      Actual: ${check.actual}`);
      console.log();
    });

    console.log("─".repeat(60));
    console.log(
      `✅ Final Result: ${allChecksPass ? "SUCCESS" : "NEEDS REVIEW"}`
    );
    console.log("─".repeat(60));

    return allChecksPass;
  } catch (error) {
    console.error("❌ Verification failed:", error);
    console.error("Stack:", error.stack);
    return false;
  } finally {
    await prisma.$disconnect();
  }
}

// Run verification
verifyEmreYegulUpdate()
  .then((success) => {
    console.log(
      `\n🎯 Verification completed: ${success ? "SUCCESS" : "FAILED"}`
    );
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error("❌ Verification error:", error);
    process.exit(1);
  });
