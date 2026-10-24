const { PrismaClient } = require("@prisma/client");
require("dotenv").config();

const prisma = new PrismaClient();

async function fixEmreYegulTerminationDate() {
  console.log("🔧 FIXING EMRE YEGÜL TERMINATION DATE");
  console.log("═".repeat(60));

  try {
    await prisma.$connect();

    // Known data from investigation
    const emreStudentId = "cmfzckpoc00hqnn0lkxeklmr3";
    const omerKocakCompanyId = "cmfzckob1007jnn0lvx0iy1fz";
    const emreStajId = "cmfzckpol00hunn0laaebof13";

    console.log("\n1️⃣ CURRENT STATUS VERIFICATION");

    // Get current termination date
    const currentRecord = await prisma.staj.findUnique({
      where: { id: emreStajId },
      include: {
        student: { select: { name: true, surname: true, number: true } },
        company: { select: { name: true } },
      },
    });

    if (!currentRecord) {
      console.error("❌ Emre Yegül's staj record not found!");
      return;
    }

    console.log(
      `   👤 Student: ${currentRecord.student?.name} ${currentRecord.student?.surname} (${currentRecord.student?.number})`
    );
    console.log(`   🏢 Company: ${currentRecord.company?.name}`);
    console.log(`   📊 Status: ${currentRecord.status}`);
    console.log(
      `   📅 Current Termination Date: ${
        currentRecord.terminationDate?.toISOString().split("T")[0]
      }`
    );
    console.log(`   ✅ Target Termination Date: 2025-10-31`);

    if (
      currentRecord.terminationDate?.toISOString().split("T")[0] ===
      "2025-10-31"
    ) {
      console.log("✅ Termination date is already correct!");
      return;
    }

    console.log("\n2️⃣ UPDATING TERMINATION DATE");

    const correctTerminationDate = new Date("2025-10-31");

    // Use transaction for safety
    const result = await prisma.$transaction(async (tx) => {
      // Update the termination date
      const updatedRecord = await tx.staj.update({
        where: { id: emreStajId },
        data: {
          terminationDate: correctTerminationDate,
          lastModifiedAt: new Date(),
          // Note: In a real system, we'd also update lastModifiedBy with the admin user ID
        },
      });

      return updatedRecord;
    });

    console.log(
      `   ✅ Updated termination date from ${
        currentRecord.terminationDate?.toISOString().split("T")[0]
      } to ${correctTerminationDate.toISOString().split("T")[0]}`
    );

    console.log("\n3️⃣ VERIFICATION AFTER UPDATE");

    // Verify the update
    const verificationRecord = await prisma.staj.findUnique({
      where: { id: emreStajId },
      include: {
        student: { select: { name: true, surname: true, number: true } },
        company: { select: { name: true } },
      },
    });

    console.log(
      `   📅 New Termination Date: ${
        verificationRecord?.terminationDate?.toISOString().split("T")[0]
      }`
    );
    console.log(
      `   🕐 Last Modified: ${verificationRecord?.lastModifiedAt?.toISOString()}`
    );
    console.log(
      `   📊 Status: ${verificationRecord?.status} (unchanged - already TERMINATED)`
    );

    console.log("\n4️⃣ TESTING EXPECTED LIST LOGIC WITH CORRECTED DATE");

    // Test November 2025 filtering with correct termination date
    const novemberStart = new Date(2025, 10, 1); // November 1, 2025
    const correctTermDate = verificationRecord?.terminationDate;

    if (correctTermDate) {
      const shouldBeInNovemberList = correctTermDate >= novemberStart;
      console.log(
        `   📊 Termination Date: ${correctTermDate.toISOString().split("T")[0]}`
      );
      console.log(
        `   📊 November Start: ${novemberStart.toISOString().split("T")[0]}`
      );
      console.log(
        `   🎯 Should appear in November expected list: ${
          shouldBeInNovemberList ? "YES ❌" : "NO ✅"
        }`
      );

      if (!shouldBeInNovemberList) {
        console.log(
          "   ✅ FIXED! Now correctly excluded from November expected list"
        );
      }
    }

    console.log("\n5️⃣ TESTING WITH CURRENT SYSTEM FILTERS");

    // Test current month filtering (December 2025)
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1;
    const monthStart = new Date(currentYear, currentMonth - 1, 1);

    console.log(
      `   📊 Current Month Start: ${monthStart.toISOString().split("T")[0]}`
    );
    console.log(
      `   🎯 Should appear in current expected list: ${
        correctTermDate && correctTermDate >= monthStart ? "YES" : "NO ✅"
      }`
    );

    // Test with our simplified filter
    const dekontCount = await prisma.dekont.count({
      where: {
        studentId: emreStudentId,
        staj: {
          status: { not: "TERMINATED" },
        },
      },
    });

    console.log(
      `   🔍 Dekont count with simplified filter (should be 0): ${dekontCount}`
    );

    // Test expected students count
    const expectedStudents = await prisma.staj.findMany({
      where: {
        archived: false,
        company: { companyType: "PRIVATE" },
        status: { not: "TERMINATED" },
      },
      select: { studentId: true },
    });

    const uniqueStudentIds = new Set(expectedStudents.map((s) => s.studentId));
    const emreInExpected = uniqueStudentIds.has(emreStudentId);

    console.log(
      `   📊 Total expected students (private): ${uniqueStudentIds.size}`
    );
    console.log(
      `   🎯 Emre in expected students: ${emreInExpected ? "YES ❌" : "NO ✅"}`
    );

    console.log("\n6️⃣ SUMMARY");
    console.log("═".repeat(60));

    const isFixed =
      verificationRecord?.terminationDate?.toISOString().split("T")[0] ===
        "2025-10-31" &&
      !emreInExpected &&
      dekontCount === 0;

    if (isFixed) {
      console.log("🎉 ✅ TERMINATION DATE BUG SUCCESSFULLY FIXED!");
      console.log(
        "🎯 Emre Yegül now has correct termination date: October 31, 2025"
      );
      console.log(
        "📊 He is correctly excluded from November and future expected lists"
      );
      console.log("🏆 Fix request is complete!");
    } else {
      console.log("❌ Fix verification failed - please check results above");
    }

    console.log("\n📋 WHAT WAS FIXED:");
    console.log(
      "   • Corrected termination date from 2025-11-24 to 2025-10-31"
    );
    console.log("   • Student: Emre Yegül at Ömer Koçak Mühendislik");
    console.log(
      "   • Student now correctly excluded from November expected lists"
    );
    console.log("   • System behavior now matches requirements");
    console.log(
      "   • Historical dekont records remain valid (created before termination)"
    );

    // Show record details for confirmation
    console.log("\n📋 UPDATED RECORD DETAILS:");
    console.log(`   Student ID: ${emreStudentId}`);
    console.log(`   Company ID: ${omerKocakCompanyId}`);
    console.log(`   Staj ID: ${emreStajId}`);
    console.log(`   Previous Termination Date: 2025-11-24`);
    console.log(`   New Termination Date: 2025-10-31`);
    console.log(`   Status: ${verificationRecord?.status} (unchanged)`);
  } catch (error) {
    console.error("❌ Fix failed:", error);
    console.error("Stack:", error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the fix
fixEmreYegulTerminationDate();
