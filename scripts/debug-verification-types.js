const { PrismaClient } = require("@prisma/client");
require("dotenv").config();
const prisma = new PrismaClient();

async function debugTypes() {
  try {
    await prisma.$connect();
    console.log("🔍 DEBUGGING VERIFICATION TYPE ISSUES");
    console.log("═".repeat(70));

    const month = 12;
    const year = 2025;
    const elifStudentId = "cmfzckrej00utnn0lgapp5wm0";

    // Get dekontlar for December 2025
    const dekontlar = await prisma.dekont.findMany({
      where: {
        month: month,
        year: year,
        archived: false,
        staj: {
          studentId: elifStudentId,
        },
      },
      include: {
        staj: {
          include: {
            company: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    console.log("💰 DEKONT DATA TYPES:");
    console.log("─".repeat(50));

    dekontlar.forEach((dekont, i) => {
      console.log(`\n${i + 1}. Dekont for ${dekont.staj?.company?.name}:`);
      console.log(`   Amount value: ${dekont.amount}`);
      console.log(`   Amount type: ${typeof dekont.amount}`);
      console.log(`   Amount constructor: ${dekont.amount?.constructor?.name}`);
      console.log(`   Amount === 1547.33: ${dekont.amount === 1547.33}`);
      console.log(`   Amount == 1547.33: ${dekont.amount == 1547.33}`);
      console.log(
        `   Number(amount) === 1547.33: ${Number(dekont.amount) === 1547.33}`
      );
      console.log(
        `   parseFloat(amount) === 1547.33: ${
          parseFloat(dekont.amount) === 1547.33
        }`
      );
    });

    console.log("\n🧪 TESTING COMPARISONS:");
    console.log("─".repeat(50));

    const testAmount = dekontlar[0]?.amount;
    const expectedAmount = 1547.33;

    console.log(`Test amount: ${testAmount} (${typeof testAmount})`);
    console.log(
      `Expected amount: ${expectedAmount} (${typeof expectedAmount})`
    );
    console.log(`Direct comparison (===): ${testAmount === expectedAmount}`);
    console.log(`Loose comparison (==): ${testAmount == expectedAmount}`);
    console.log(`Number conversion: ${Number(testAmount) === expectedAmount}`);
    console.log(
      `parseFloat conversion: ${parseFloat(testAmount) === expectedAmount}`
    );

    console.log("\n✅ RECOMMENDED FIX:");
    console.log("   Use Number() conversion for comparison");
    console.log(`   if (Number(amount) === expectedAmount) { ... }`);
  } catch (error) {
    console.error("❌ Error:", error.message);
    console.error("Stack:", error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

debugTypes();
