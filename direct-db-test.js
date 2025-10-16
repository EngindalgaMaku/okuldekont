const { PrismaClient } = require("@prisma/client");
const { v4: uuidv4 } = require("uuid");

async function directDatabaseTest() {
  const prisma = new PrismaClient();

  try {
    console.log("🧪 Direct database test starting...\n");

    // İlk bir öğrenci alalım
    const student = await prisma.student.findFirst({
      select: {
        id: true,
        name: true,
        surname: true,
        number: true,
        tcNo: true,
      },
    });

    if (!student) {
      console.log("❌ No students found");
      return;
    }

    console.log("👤 Test student:", student.name, student.surname);

    // Aktif eğitim yılını alalım
    const educationYear = await prisma.egitimYili.findFirst({
      where: { active: true },
    });

    if (!educationYear) {
      console.log("❌ No active education year found");
      return;
    }

    console.log("📅 Education year:", educationYear.year);

    // İlk bir company alalım
    const company = await prisma.companyProfile.findFirst({
      select: { id: true, name: true },
    });

    if (!company) {
      console.log("❌ No companies found");
      return;
    }

    console.log("🏢 Test company:", company.name);

    // Test monthly payment kaydı oluşturalım
    const testPayment = {
      id: uuidv4(),
      studentId: student.id,
      companyId: company.id, // Gerçek company ID
      educationYearId: educationYear.id,
      month: 10,
      year: 2024,
      amount: 1500.0,
      paymentType: "GOVERNMENT_CONTRIBUTION",
      status: "IMPORTED",
      importSource: "direct-test",
      importBatch: uuidv4(),
      importedBy: "test",
      studentName: student.name,
      studentSurname: student.surname,
      studentNumber: student.number,
      studentTcNo: student.tcNo,
      verificationStatus: "PENDING",
      archived: false,
    };

    console.log("💾 Creating test payment record...");

    // Prisma ile kayıt oluştur
    const createdPayment = await prisma.monthlyPayment.create({
      data: testPayment,
    });

    console.log("✅ Payment record created:", createdPayment.id);

    // Kontrol et
    const paymentCount = await prisma.monthlyPayment.count();
    console.log("📊 Total monthly payments after insert:", paymentCount);

    // Kaydı geri alalım
    const retrievedPayment = await prisma.monthlyPayment.findFirst({
      where: { id: createdPayment.id },
    });

    if (retrievedPayment) {
      console.log("✅ Record retrieved successfully");
      console.log("💰 Amount:", retrievedPayment.amount);
      console.log(
        "📅 Month/Year:",
        retrievedPayment.month + "/" + retrievedPayment.year
      );
    }

    // Test kaydını sil
    await prisma.monthlyPayment.delete({
      where: { id: createdPayment.id },
    });

    console.log("🗑️ Test record cleaned up");

    const finalCount = await prisma.monthlyPayment.count();
    console.log("📊 Final count:", finalCount);
  } catch (error) {
    console.error("❌ Test error:", error.message);

    // Eğer model bulunamazsa
    if (error.message.includes("monthlyPayment")) {
      console.log("\n🔍 Checking available Prisma models...");
      console.log("Available models:", Object.keys(prisma));
    }

    // Eğer tablo bulunamazsa
    if (error.message.includes("monthly_payments")) {
      console.log("\n🔍 Checking database tables...");
      const tables = await prisma.$queryRaw`SHOW TABLES`;
      console.log("Available tables:", tables);
    }
  } finally {
    await prisma.$disconnect();
  }
}

directDatabaseTest();
