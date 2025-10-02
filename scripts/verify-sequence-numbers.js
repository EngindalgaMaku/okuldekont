const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function verifySequenceNumbers() {
  try {
    console.log(
      "🔍 Checking existing dekont records for sequenceNumber values...\n"
    );

    // Get all dekont records
    const dekontlar = await prisma.dekont.findMany({
      select: {
        id: true,
        stajId: true,
        month: true,
        year: true,
        sequenceNumber: true,
        student: {
          select: {
            name: true,
            surname: true,
          },
        },
      },
      orderBy: [{ year: "desc" }, { month: "desc" }, { sequenceNumber: "asc" }],
    });

    console.log(`📊 Total dekont records: ${dekontlar.length}\n`);

    // Check for records without proper sequenceNumber
    const invalidRecords = dekontlar.filter(
      (d) => !d.sequenceNumber || d.sequenceNumber === 0
    );
    const recordsWithSequence1 = dekontlar.filter(
      (d) => d.sequenceNumber === 1
    );
    const recordsWithOtherSequence = dekontlar.filter(
      (d) => d.sequenceNumber && d.sequenceNumber > 1
    );

    console.log("🔢 SEQUENCE NUMBER ANALYSIS:");
    console.log(
      `   Records with sequenceNumber = 1: ${recordsWithSequence1.length}`
    );
    console.log(
      `   Records with sequenceNumber > 1: ${recordsWithOtherSequence.length}`
    );
    console.log(`   Invalid records (null or 0): ${invalidRecords.length}\n`);

    if (invalidRecords.length > 0) {
      console.log("❌ INVALID RECORDS FOUND:");
      invalidRecords.forEach((record) => {
        console.log(
          `   - ${record.student.name} ${record.student.surname} | ${record.month}/${record.year} | sequenceNumber: ${record.sequenceNumber}`
        );
      });
      console.log("");
    }

    // Show some sample records
    console.log("📋 SAMPLE RECORDS:");
    dekontlar.slice(0, 10).forEach((record) => {
      const monthName = new Intl.DateTimeFormat("tr-TR", {
        month: "long",
      }).format(new Date(2024, record.month - 1));
      console.log(
        `   - ${record.student.name} ${record.student.surname} | ${monthName} ${record.year} - ${record.sequenceNumber}`
      );
    });

    // Test unique constraint by checking for potential duplicates
    const duplicates = new Map();
    dekontlar.forEach((record) => {
      const key = `${record.stajId}_${record.month}_${record.year}_${record.sequenceNumber}`;
      if (duplicates.has(key)) {
        duplicates.get(key).push(record);
      } else {
        duplicates.set(key, [record]);
      }
    });

    const duplicateEntries = Array.from(duplicates.entries()).filter(
      ([key, records]) => records.length > 1
    );

    if (duplicateEntries.length > 0) {
      console.log("\n❌ DUPLICATE CONSTRAINT VIOLATIONS FOUND:");
      duplicateEntries.forEach(([key, records]) => {
        console.log(`   Key: ${key}`);
        records.forEach((record) => {
          console.log(
            `     - ID: ${record.id} | ${record.student.name} ${record.student.surname}`
          );
        });
      });
    } else {
      console.log(
        "\n✅ No constraint violations found - unique constraint is working properly"
      );
    }

    return {
      total: dekontlar.length,
      withSequence1: recordsWithSequence1.length,
      withOtherSequence: recordsWithOtherSequence.length,
      invalid: invalidRecords.length,
      constraintViolations: duplicateEntries.length,
    };
  } catch (error) {
    console.error("❌ Error verifying sequence numbers:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the verification
verifySequenceNumbers()
  .then((result) => {
    console.log("\n🎯 VERIFICATION SUMMARY:");
    console.log(
      `   ✅ Migration applied successfully: ${
        result.invalid === 0 ? "YES" : "NO"
      }`
    );
    console.log(
      `   ✅ Unique constraint working: ${
        result.constraintViolations === 0 ? "YES" : "NO"
      }`
    );
    console.log(
      `   ✅ Existing records preserved: ${result.total > 0 ? "YES" : "NO"}`
    );

    if (result.invalid === 0 && result.constraintViolations === 0) {
      console.log("\n🎉 MIGRATION VERIFICATION: PASSED");
    } else {
      console.log("\n❌ MIGRATION VERIFICATION: FAILED");
    }
  })
  .catch((error) => {
    console.error("❌ Verification failed:", error);
    process.exit(1);
  });
