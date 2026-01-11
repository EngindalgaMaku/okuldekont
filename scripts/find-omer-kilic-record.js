const { PrismaClient } = require("@prisma/client");
require("dotenv").config();

const prisma = new PrismaClient();

async function findOmerKilicRecord() {
  console.log("🔍 FINDING ÖMER KILIÇ + CUMA ARAT RECORD");
  console.log("═".repeat(60));

  try {
    await prisma.$connect();

    console.log("\n1️⃣ SEARCHING FOR STUDENT: Ömer Kılıç");

    // Search for Ömer Kılıç (try different name variations)
    const students = await prisma.student.findMany({
      where: {
        OR: [
          {
            AND: [
              { name: { contains: "Ömer" } },
              { surname: { contains: "Kılıç" } },
            ],
          },
          {
            AND: [
              { name: { contains: "ÖMER" } },
              { surname: { contains: "KILIÇ" } },
            ],
          },
          {
            AND: [
              { name: { contains: "Omer" } },
              { surname: { contains: "Kilic" } },
            ],
          },
          {
            AND: [
              { name: { contains: "ömer" } },
              { surname: { contains: "kılıç" } },
            ],
          },
        ],
      },
      select: {
        id: true,
        name: true,
        surname: true,
        number: true,
        className: true,
      },
    });

    if (students.length === 0) {
      console.log("❌ No students found matching 'Ömer Kılıç'");
      return;
    }

    console.log(`   📊 Found ${students.length} student(s):`);
    students.forEach((student, index) => {
      console.log(
        `   ${index + 1}. ${student.name} ${student.surname} (${
          student.number
        }) - ID: ${student.id}`
      );
    });

    console.log("\n2️⃣ SEARCHING FOR COMPANY: Cuma Arat");

    // Search for Cuma Arat company
    const companies = await prisma.companyProfile.findMany({
      where: {
        OR: [
          { name: { contains: "Cuma Arat" } },
          { name: { contains: "CUMA ARAT" } },
          { name: { contains: "Cuma" } },
          { name: { contains: "Arat" } },
          { name: { contains: "cuma arat" } },
          { name: { contains: "cuma" } },
          { name: { contains: "arat" } },
        ],
      },
      select: {
        id: true,
        name: true,
        companyType: true,
      },
    });

    if (companies.length === 0) {
      console.log("❌ No companies found matching 'Cuma Arat'");
      return;
    }

    console.log(`   📊 Found ${companies.length} company/companies:`);
    companies.forEach((company, index) => {
      console.log(
        `   ${index + 1}. ${company.name} (${company.companyType}) - ID: ${
          company.id
        }`
      );
    });

    console.log("\n3️⃣ SEARCHING FOR INTERNSHIP RECORD");

    // Find internship records between these students and companies
    const stajRecords = await prisma.staj.findMany({
      where: {
        studentId: { in: students.map((s) => s.id) },
        companyId: { in: companies.map((c) => c.id) },
      },
      include: {
        student: {
          select: { name: true, surname: true, number: true },
        },
        company: {
          select: { name: true, companyType: true },
        },
      },
    });

    if (stajRecords.length === 0) {
      console.log(
        "❌ No internship records found between Ömer Kılıç and Cuma Arat companies"
      );

      // Show separate searches
      console.log("\n🔍 DEBUGGING - Students internships:");
      for (const student of students) {
        const studentStaj = await prisma.staj.findMany({
          where: { studentId: student.id },
          include: { company: { select: { name: true } } },
          take: 5,
        });
        console.log(
          `   ${student.name} ${student.surname}: ${studentStaj.length} internships`
        );
        studentStaj.forEach((s) => console.log(`     - ${s.company?.name}`));
      }

      console.log("\n🔍 DEBUGGING - Company internships:");
      for (const company of companies) {
        const companyStaj = await prisma.staj.findMany({
          where: { companyId: company.id },
          include: { student: { select: { name: true, surname: true } } },
          take: 5,
        });
        console.log(`   ${company.name}: ${companyStaj.length} internships`);
        companyStaj.forEach((s) =>
          console.log(`     - ${s.student?.name} ${s.student?.surname}`)
        );
      }

      return;
    }

    console.log(`   📊 Found ${stajRecords.length} internship record(s):`);

    stajRecords.forEach((staj, index) => {
      console.log(`\n   🎯 RECORD ${index + 1}:`);
      console.log(`   ├── Staj ID: ${staj.id}`);
      console.log(
        `   ├── Student: ${staj.student?.name} ${staj.student?.surname} (${staj.student?.number})`
      );
      console.log(`   ├── Student ID: ${staj.studentId}`);
      console.log(`   ├── Company: ${staj.company?.name}`);
      console.log(`   ├── Company ID: ${staj.companyId}`);
      console.log(`   ├── Status: ${staj.status}`);
      console.log(
        `   ├── Start Date: ${
          staj.startDate?.toISOString().split("T")[0] || "N/A"
        }`
      );
      console.log(
        `   ├── End Date: ${staj.endDate?.toISOString().split("T")[0] || "N/A"}`
      );
      console.log(
        `   ├── Termination Date: ${
          staj.terminationDate?.toISOString().split("T")[0] || "N/A"
        }`
      );
      console.log(
        `   ├── Created At: ${
          staj.createdAt
            ? new Date(staj.createdAt).toISOString().split("T")[0]
            : "N/A"
        }`
      );
      console.log(
        `   └── Last Modified: ${
          staj.lastModifiedAt?.toISOString().split("T")[0] || "N/A"
        }`
      );
    });

    console.log("\n4️⃣ ANALYSIS FOR FIX");

    const targetRecord = stajRecords[0]; // Assume first record is the one we need
    if (targetRecord) {
      console.log(`\n   🎯 TARGET RECORD FOR FIX:`);
      console.log(
        `   ├── Student: ${targetRecord.student?.name} ${targetRecord.student?.surname}`
      );
      console.log(`   ├── Company: ${targetRecord.company?.name}`);
      console.log(
        `   ├── Current Termination Date: ${
          targetRecord.terminationDate?.toISOString().split("T")[0] || "N/A"
        }`
      );
      console.log(`   ├── Target Termination Date: 2025-10-31`);
      console.log(`   └── Status: ${targetRecord.status}`);

      // Check if already correct
      if (
        targetRecord.terminationDate?.toISOString().split("T")[0] ===
        "2025-10-31"
      ) {
        console.log(`\n   ✅ Termination date is already correct (2025-10-31)`);
      } else {
        console.log(
          `\n   🔧 Termination date needs to be updated to 2025-10-31`
        );
      }

      console.log(`\n📋 IDs FOR FIX SCRIPT:`);
      console.log(`   const omerStudentId = "${targetRecord.studentId}";`);
      console.log(`   const cumaAratCompanyId = "${targetRecord.companyId}";`);
      console.log(`   const omerStajId = "${targetRecord.id}";`);
    }
  } catch (error) {
    console.error("❌ Search failed:", error);
    console.error("Stack:", error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the search
findOmerKilicRecord();
