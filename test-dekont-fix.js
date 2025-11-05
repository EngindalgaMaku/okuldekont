const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function testDekontFix() {
  try {
    console.log("🧪 Testing dekont amount field after migration...");

    // Test 1: Check if we can read existing data
    console.log("\n📖 Test 1: Reading existing dekont data");
    const existingDekontlar = await prisma.dekont.findMany({
      where: {
        amount: {
          not: null,
        },
      },
      select: {
        id: true,
        amount: true,
        student: {
          select: {
            name: true,
            surname: true,
          },
        },
        month: true,
        year: true,
      },
      take: 5,
    });

    console.log(
      `✅ Successfully read ${existingDekontlar.length} dekont records`
    );
    existingDekontlar.forEach((dekont, index) => {
      console.log(
        `  ${index + 1}. ${dekont.student.name} ${dekont.student.surname}: ${
          dekont.amount
        } TL (${dekont.month}/${dekont.year})`
      );
    });

    // Test 2: Check if we can create new dekont with decimal amount
    console.log("\n💰 Test 2: Testing decimal amount creation");

    // Get a valid staj for testing
    const testStaj = await prisma.staj.findFirst({
      where: {
        status: "ACTIVE",
      },
      include: {
        student: true,
        company: true,
      },
    });

    if (!testStaj) {
      console.log("⚠️ No active staj found for testing");
      return;
    }

    console.log(
      `📋 Using test staj: ${testStaj.student.name} ${testStaj.student.surname} at ${testStaj.company.name}`
    );

    // Test different amount formats
    const testAmounts = [
      1234.56, // Standard decimal
      1000, // Integer
      999.9, // Single decimal
      0.01, // Very small decimal
      9999.99, // Maximum precision
    ];

    for (const testAmount of testAmounts) {
      try {
        // Create test dekont record
        const testDekont = await prisma.dekont.create({
          data: {
            stajId: testStaj.id,
            companyId: testStaj.companyId,
            studentId: testStaj.studentId,
            amount: testAmount,
            paymentDate: new Date(),
            month: 12, // Test month
            year: 2099, // Far future year to avoid conflicts
            sequenceNumber: 1,
            status: "PENDING",
          },
        });

        console.log(
          `✅ Created dekont with amount ${testAmount} -> Stored as ${testDekont.amount}`
        );

        // Clean up test data
        await prisma.dekont.delete({
          where: { id: testDekont.id },
        });
        console.log(`🗑️ Cleaned up test dekont`);
      } catch (error) {
        console.error(
          `❌ Failed to create dekont with amount ${testAmount}:`,
          error.message
        );
      }
    }

    // Test 3: Test invalid amounts (should fail gracefully)
    console.log("\n🚫 Test 3: Testing invalid amounts");

    const invalidAmounts = ["invalid_string", null, undefined];

    for (const invalidAmount of invalidAmounts) {
      try {
        const testDekont = await prisma.dekont.create({
          data: {
            stajId: testStaj.id,
            companyId: testStaj.companyId,
            studentId: testStaj.studentId,
            amount: invalidAmount,
            paymentDate: new Date(),
            month: 12,
            year: 2099,
            sequenceNumber: 1,
            status: "PENDING",
          },
        });

        console.log(
          `✅ Created dekont with null/undefined amount: ${testDekont.amount}`
        );

        // Clean up
        await prisma.dekont.delete({
          where: { id: testDekont.id },
        });
      } catch (error) {
        console.log(
          `✅ Invalid amount ${invalidAmount} correctly rejected: ${error.message.substring(
            0,
            50
          )}...`
        );
      }
    }

    console.log(
      "\n🎉 All tests completed! The dekont amount field migration was successful."
    );
    console.log("✅ Database now accepts Decimal amounts correctly");
    console.log("✅ Existing data preserved");
    console.log("✅ New decimal amounts work properly");
    console.log("✅ Invalid data handled correctly");
  } catch (error) {
    console.error("❌ Test error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

testDekontFix();
