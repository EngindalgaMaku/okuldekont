const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient({
  log: ["query", "error", "warn"],
  errorFormat: "minimal",
});

async function checkInternships() {
  try {
    console.log("🔍 Checking for internship data with Prisma Client...");

    await prisma.$connect();
    console.log("✅ Database connection successful");

    const internshipCount = await prisma.staj.count();
    console.log(`📊 Found ${internshipCount} total internships.`);

    if (internshipCount > 0) {
      const internships = await prisma.staj.findMany({
        take: 5,
        include: {
          student: true,
          company: true,
        },
      });
      console.log("✅ Fetched first 5 internships:");
      console.log(internships);
    }

    console.log("✅ Prisma internship check completed successfully!");
  } catch (error) {
    console.error("❌ Prisma internship check failed:", error);
  } finally {
    await prisma.$disconnect();
    console.log("🔌 Database connection closed.");
  }
}

checkInternships();
