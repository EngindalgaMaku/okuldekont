const { PrismaClient } = require("@prisma/client");
require("dotenv").config();
const prisma = new PrismaClient();

async function createTestDekont() {
  try {
    await prisma.$connect();
    console.log("🧪 CREATING TEST DEKONT FOR ELIF TO REPRODUCE BUG");
    console.log("═".repeat(70));

    // Get Elif's active internship (Osman Çoban)
    const activeInternship = await prisma.staj.findFirst({
      where: {
        student: {
          name: "Elif",
          surname: "Poyraz",
        },
        status: "ACTIVE",
      },
      include: {
        student: { select: { id: true, name: true, surname: true } },
        company: { select: { id: true, name: true } },
        teacher: { select: { id: true, name: true, surname: true } },
      },
    });

    if (!activeInternship) {
      console.log("❌ Active internship not found for Elif");
      return;
    }

    console.log("📋 ACTIVE INTERNSHIP FOUND:");
    console.log(`   Company: ${activeInternship.company?.name}`);
    console.log(`   Status: ${activeInternship.status}`);

    // Check if dekont already exists for December 2025
    const existingDekont = await prisma.dekont.findFirst({
      where: {
        stajId: activeInternship.id,
        month: 12,
        year: 2025,
      },
    });

    if (existingDekont) {
      console.log("✅ Test dekont already exists for December 2025");
      console.log(`   Amount: ${existingDekont.amount}₺`);
      console.log(`   Status: ${existingDekont.status}`);
      return;
    }

    // Create test dekont for December 2025
    const testDekont = await prisma.dekont.create({
      data: {
        stajId: activeInternship.id,
        companyId: activeInternship.companyId,
        teacherId: activeInternship.teacherId,
        studentId: activeInternship.studentId,
        amount: 1547.33,
        paymentDate: new Date(),
        month: 12,
        year: 2025,
        sequenceNumber: 1,
        status: "APPROVED",
        fileUrl: "/test/dekont.pdf",
      },
    });

    console.log("✅ TEST DEKONT CREATED:");
    console.log(`   ID: ${testDekont.id}`);
    console.log(`   Amount: ${testDekont.amount}₺`);
    console.log(`   Month: ${testDekont.month}/${testDekont.year}`);
    console.log(`   Status: ${testDekont.status}`);

    console.log("\n🐛 NOW THE BUG SHOULD BE REPRODUCIBLE:");
    console.log("   - Elif has dekont for ACTIVE internship (Osman Çoban)");
    console.log(
      '   - But dekont-status API will show "Dekont var" for BOTH internships'
    );
    console.log(
      "   - Including the TERMINATED Özlem Görünmez internship (wrong!)"
    );
  } catch (error) {
    console.error("❌ Error:", error.message);
    console.error("Stack:", error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

createTestDekont();
