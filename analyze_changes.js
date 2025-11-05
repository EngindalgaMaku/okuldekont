const { PrismaClient } = require("@prisma/client");
const xlsx = require("xlsx");
const path = require("path");

const prisma = new PrismaClient();

async function main() {
  try {
    // Read the Excel file
    const filePath = path.join(__dirname, "yeniexel.xlsx");
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames;
    const excelData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

    console.log("--- Excel Data ---");
    console.log(excelData);

    // Fetch data from the database
    const students = await prisma.student.findMany();
    const teachers = await prisma.teacherProfile.findMany();
    const businesses = await prisma.companyProfile.findMany();

    console.log("\n--- Database Data ---");
    console.log("Students:", students);
    console.log("Teachers:", teachers);
    console.log("Businesses:", businesses);
  } catch (error) {
    console.error("An error occurred:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
