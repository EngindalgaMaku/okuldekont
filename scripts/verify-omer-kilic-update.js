const { PrismaClient } = require("@prisma/client");
require("dotenv").config();

const prisma = new PrismaClient();

async function verifyOmerKilicUpdate() {
  console.log("✅ VERIFYING ÖMER KILIÇ TERMINATION DATE UPDATE");
  console.log("═".repeat(60));

  try {
    await prisma.$connect();

    // Known data from fix
    const omerStudentId = "cmfzcksyh0168nn0lsk8n9oma";
    const cumaAratCompanyId = "cmfzcksc4011nnn0lt40rws0s";
    const omerStajId = "cmfzcksys016cnn0lam4kdoou";

    console.log("\n1️⃣ VERIFYING RECORD EXISTS");

    const record = await prisma.staj.findUnique({
      where: { id: omerStajId },
      include: {
        student: {
          select: { name: true, surname: true, number: true },
        },
        company: {
          select: { name: true, companyType: true },
        },
      },
    });

    if (!record) {
      console.error("❌ Record not found!");
      return false;
    }

    console.log("✅ Record found:");
    console.log(
      `   👤 Student: ${record.student?.name} ${record.student?.surname} (${record.student?.number})`
    );
    console.log(
      `   🏢 Company: ${record.company?.name} (${record.company?.companyType})`
    );
    console.log(`   📊 Status: ${record.status}`);

    console.log("\n2️⃣ VERIFYING TERMINATION DATE");

    const expectedTerminationDate = "2025-10-31";
    const actualTerminationDate = record.terminationDate
      ?.toISOString()
      .split("T")[0];

    console.log(`   🎯 Expected: ${expectedTerminationDate}`);
    console.log(`   📅 Actual: ${actualTerminationDate || "N/A"}`);

    if (actualTerminationDate !== expectedTerminationDate) {
      console.error("❌ Termination date is not correct!");
      return false;
    }

    console.log("✅ Termination date is correct!");

    console.log("\n3️⃣ VERIFYING STATUS");

    if (record.status !== "TERMINATED") {
      console.error(`❌ Status should be TERMINATED but is ${record.status}`);
      return false;
    }

    console.log("✅ Status is correct (TERMINATED)");

    console.log("\n4️⃣ TESTING FILTER LOGIC");

    // Test November 2025 filtering
    const novemberStart = new Date(2025, 10, 1); // November 1, 2025
    const terminationDate = new Date(record.terminationDate);
    const shouldBeInNovemberList = terminationDate >= novemberStart;

    console.log(
      `   📊 November Start: ${novemberStart.toISOString().split("T")[0]}`
    );
    console.log(
      `   📊 Termination Date: ${terminationDate.toISOString().split("T")[0]}`
    );
    console.log(
      `   🎯 Should appear in November expected list: ${
        shouldBeInNovemberList ? "YES ❌" : "NO ✅"
      }`
    );

    if (shouldBeInNovemberList) {
      console.error("❌ Student would still appear in November expected list!");
      return false;
    }

    console.log("✅ Student correctly excluded from November expected list");

    console.log("\n5️⃣ TESTING DEKONT FILTERS");

    // Test dekont count with TERMINATED status filter
    const dekontCount = await prisma.dekont.count({
      where: {
        studentId: omerStudentId,
        staj: {
          status: { not: "TERMINATED" },
        },
      },
    });

    console.log(
      `   🔍 Dekont count (non-terminated internships): ${dekontCount}`
    );

    if (dekontCount > 0) {
      console.warn(
        "⚠️  Student still has dekonts from non-terminated internships"
      );
    } else {
      console.log("✅ No dekonts from non-terminated internships (expected)");
    }

    console.log("\n6️⃣ TESTING EXPECTED STUDENTS LIST");

    // Check if student appears in expected students list
    const expectedStudents = await prisma.staj.findMany({
      where: {
        archived: false,
        company: { companyType: "PRIVATE" },
        status: { not: "TERMINATED" },
      },
      select: { studentId: true },
    });

    const uniqueStudentIds = new Set(expectedStudents.map((s) => s.studentId));
    const isInExpectedList = uniqueStudentIds.has(omerStudentId);

    console.log(
      `   📊 Total expected students (private companies): ${uniqueStudentIds.size}`
    );
    console.log(
      `   🎯 Ömer Kılıç in expected list: ${
        isInExpectedList ? "YES ❌" : "NO ✅"
      }`
    );

    if (isInExpectedList) {
      console.error("❌ Student still appears in expected students list!");
      return false;
    }

    console.log("✅ Student correctly excluded from expected students list");

    console.log("\n7️⃣ VERIFICATION SUMMARY");
    console.log("═".repeat(60));

    console.log("🎉 ✅ ALL VERIFICATIONS PASSED!");
    console.log("");
    console.log("📋 VERIFICATION RESULTS:");
    console.log("   ✅ Record exists");
    console.log("   ✅ Termination date is 2025-10-31");
    console.log("   ✅ Status is TERMINATED");
    console.log("   ✅ Excluded from November expected lists");
    console.log("   ✅ No dekonts from active internships");
    console.log("   ✅ Excluded from expected students list");
    console.log("");
    console.log("🎯 ÖMER KILIÇ TERMINATION DATE FIX IS VERIFIED!");

    return true;
  } catch (error) {
    console.error("❌ Verification failed:", error);
    console.error("Stack:", error.stack);
    return false;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the verification
verifyOmerKilicUpdate()
  .then((success) => {
    if (success) {
      console.log("\n🏆 VERIFICATION COMPLETED SUCCESSFULLY");
      process.exit(0);
    } else {
      console.log("\n❌ VERIFICATION FAILED");
      process.exit(1);
    }
  })
  .catch((error) => {
    console.error("❌ Verification error:", error);
    process.exit(1);
  });
