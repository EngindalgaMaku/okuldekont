#!/usr/bin/env node

// Migration script to assign sequence_number = 1 to existing dekonts
// This ensures all existing dekont records have proper sequence numbers

const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function migrateExistingDekontSequenceNumbers() {
  try {
    console.log("🔄 Starting dekont sequence number migration...");

    // Get all existing dekonts that might not have sequence numbers properly set
    const dekonts = await prisma.dekont.findMany({
      select: {
        id: true,
        stajId: true,
        month: true,
        year: true,
        sequenceNumber: true,
        createdAt: true,
      },
      orderBy: [
        { stajId: "asc" },
        { year: "asc" },
        { month: "asc" },
        { createdAt: "asc" },
      ],
    });

    console.log(`📊 Found ${dekonts.length} dekont records to process`);

    // Group dekonts by stajId, year, month to assign proper sequence numbers
    const groupedDekonts = {};

    dekonts.forEach((dekont) => {
      const key = `${dekont.stajId}-${dekont.year}-${dekont.month}`;
      if (!groupedDekonts[key]) {
        groupedDekonts[key] = [];
      }
      groupedDekonts[key].push(dekont);
    });

    let updateCount = 0;
    let skippedCount = 0;

    console.log(
      `🔧 Processing ${
        Object.keys(groupedDekonts).length
      } unique month/staj combinations...`
    );

    for (const [key, dekontGroup] of Object.entries(groupedDekonts)) {
      console.log(
        `   Processing group: ${key} (${dekontGroup.length} dekonts)`
      );

      // Sort by creation date to maintain chronological sequence
      dekontGroup.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

      for (let i = 0; i < dekontGroup.length; i++) {
        const dekont = dekontGroup[i];
        const expectedSequenceNumber = i + 1;

        // Only update if sequence number is different from expected
        if (dekont.sequenceNumber !== expectedSequenceNumber) {
          try {
            await prisma.dekont.update({
              where: { id: dekont.id },
              data: { sequenceNumber: expectedSequenceNumber },
            });

            console.log(
              `     ✅ Updated dekont ${dekont.id}: sequence ${dekont.sequenceNumber} → ${expectedSequenceNumber}`
            );
            updateCount++;
          } catch (error) {
            console.error(
              `     ❌ Failed to update dekont ${dekont.id}:`,
              error.message
            );
          }
        } else {
          console.log(
            `     ⏭️  Skipped dekont ${dekont.id}: already has correct sequence ${expectedSequenceNumber}`
          );
          skippedCount++;
        }
      }
    }

    console.log("\n📈 Migration Summary:");
    console.log(`   📝 Total dekonts processed: ${dekonts.length}`);
    console.log(`   ✅ Records updated: ${updateCount}`);
    console.log(`   ⏭️  Records skipped (already correct): ${skippedCount}`);
    console.log(
      `   🏁 Groups processed: ${Object.keys(groupedDekonts).length}`
    );

    // Verification: Check for any constraint violations
    console.log("\n🔍 Performing verification checks...");

    const duplicateCheck = await prisma.$queryRaw`
      SELECT stajId, month, year, sequenceNumber, COUNT(*) as count
      FROM dekonts
      GROUP BY stajId, month, year, sequenceNumber
      HAVING COUNT(*) > 1
    `;

    if (duplicateCheck.length > 0) {
      console.error("⚠️  Warning: Found duplicate sequence numbers:");
      duplicateCheck.forEach((dup) => {
        console.error(
          `   - stajId: ${dup.stajId}, month: ${dup.month}, year: ${dup.year}, sequence: ${dup.sequenceNumber} (${dup.count} duplicates)`
        );
      });
    } else {
      console.log(
        "✅ Verification passed: No duplicate sequence numbers found"
      );
    }

    console.log("✨ Dekont sequence number migration completed successfully!");
  } catch (error) {
    console.error("❌ Migration failed:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the migration
migrateExistingDekontSequenceNumbers()
  .then(() => {
    console.log("🎉 Migration script completed");
    process.exit(0);
  })
  .catch((error) => {
    console.error("💥 Migration script failed:", error);
    process.exit(1);
  });
