const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

// Decryption function from the codebase
function decryptFinancialData(encryptedData) {
  if (!encryptedData || typeof encryptedData !== "string") {
    return null;
  }

  try {
    // Check if it's already a plain number
    if (/^\d+\.?\d*$/.test(encryptedData)) {
      return encryptedData;
    }

    // If it contains colons, it's encrypted
    if (encryptedData.includes(":")) {
      // For now, return null for encrypted data since we can't decrypt without key
      console.log(
        `⚠️ Found encrypted data: ${encryptedData.substring(0, 30)}...`
      );
      return null;
    }

    return encryptedData;
  } catch (error) {
    console.error("Decryption error:", error);
    return null;
  }
}

async function fixAmountDataMigration() {
  try {
    console.log("🔍 Starting amount field data analysis...");

    // Get all dekont records with amount
    const allDekontlar = await prisma.dekont.findMany({
      where: {
        amount: {
          not: null,
        },
      },
      select: {
        id: true,
        amount: true,
        month: true,
        year: true,
      },
    });

    console.log(`📊 Total records with amount: ${allDekontlar.length}`);

    let plainNumbers = 0;
    let encryptedData = 0;
    let invalidData = 0;
    let updates = [];

    // Analyze all records
    for (const dekont of allDekontlar) {
      const amount = dekont.amount;

      if (/^\d+\.?\d*$/.test(amount)) {
        // Plain number - these will convert fine
        plainNumbers++;
      } else if (amount.includes(":") && amount.length > 20) {
        // Encrypted data - problematic
        encryptedData++;
        console.log(
          `🔒 Encrypted: ID ${dekont.id}, Amount: ${amount.substring(0, 30)}...`
        );

        // Set encrypted amounts to null for now
        updates.push({
          id: dekont.id,
          amount: null,
        });
      } else {
        // Unknown format
        invalidData++;
        console.log(`❓ Invalid: ID ${dekont.id}, Amount: "${amount}"`);

        // Try to extract number or set to null
        const numberMatch = amount.match(/\d+\.?\d*/);
        if (numberMatch) {
          updates.push({
            id: dekont.id,
            amount: parseFloat(numberMatch[0]),
          });
        } else {
          updates.push({
            id: dekont.id,
            amount: null,
          });
        }
      }
    }

    console.log(`\n📋 Analysis Results:`);
    console.log(`✅ Plain numbers: ${plainNumbers} (will convert fine)`);
    console.log(`🔒 Encrypted data: ${encryptedData} (will be set to null)`);
    console.log(`❓ Invalid data: ${invalidData} (will be cleaned or nulled)`);
    console.log(`🔧 Records needing updates: ${updates.length}`);

    if (updates.length > 0) {
      console.log("\n⚠️ The following records will be updated:");
      updates.forEach((update, index) => {
        console.log(
          `${index + 1}. ID: ${update.id} -> Amount: ${update.amount}`
        );
      });

      console.log(
        "\n🛠️ To proceed with data cleanup, run the migration with these updates."
      );

      // Uncomment to actually perform updates
      /*
      for (const update of updates) {
        await prisma.dekont.update({
          where: { id: update.id },
          data: { amount: update.amount ? update.amount.toString() : null }
        });
      }
      console.log('✅ Data cleanup completed');
      */
    } else {
      console.log("\n✅ All data is clean, migration can proceed safely!");
    }
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

fixAmountDataMigration();
