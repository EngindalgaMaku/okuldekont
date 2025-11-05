const { PrismaClient } = require("@prisma/client");
const XLSX = require("xlsx");
const path = require("path");

const prisma = new PrismaClient();

async function debugExcelComparison() {
  console.log("=".repeat(80));
  console.log("DEBUG: Excel Comparison System");
  console.log("=".repeat(80));

  try {
    // 1. Analyze Excel file structure
    console.log("\n1. EXCEL FILE ANALYSIS");
    console.log("-".repeat(40));

    const excelPath = path.join(
      process.cwd(),
      "01. Eylül 2025 - Mesem - TÜM.xlsx"
    );
    console.log(`Reading Excel file: ${excelPath}`);

    const workbook = XLSX.readFile(excelPath);
    const sheetName = workbook.SheetNames[0];
    console.log(`Sheet name: ${sheetName}`);

    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    console.log("\nExcel structure:");
    console.log(`Total rows: ${jsonData.length}`);

    // Find header row (should be row with column names)
    let headerRowIndex = -1;
    for (let i = 0; i < Math.min(10, jsonData.length); i++) {
      if (
        jsonData[i] &&
        jsonData[i].some(
          (cell) =>
            typeof cell === "string" &&
            (cell.includes("Sınıf") ||
              cell.includes("Adı Soyadı") ||
              cell.includes("İşletmenin"))
        )
      ) {
        headerRowIndex = i;
        break;
      }
    }

    console.log(`Header row found at index: ${headerRowIndex}`);
    if (headerRowIndex >= 0) {
      console.log("Excel columns:", jsonData[headerRowIndex]);
    }

    // Show sample data rows
    console.log("\nSample data rows:");
    const dataStartRow = headerRowIndex + 1;
    for (
      let i = dataStartRow;
      i < Math.min(dataStartRow + 5, jsonData.length);
      i++
    ) {
      if (
        jsonData[i] &&
        jsonData[i].some((cell) => cell !== undefined && cell !== "")
      ) {
        console.log(`Row ${i}:`, jsonData[i]);
      }
    }

    // 2. Current interface expectation vs Excel reality
    console.log("\n2. DATA MAPPING ANALYSIS");
    console.log("-".repeat(40));

    const expectedInterface = {
      tcNo: "string",
      name: "string",
      surname: "string",
      className: "string",
      studentNumber: "string",
      alanName: "string",
      companyName: "string",
      teacherName: "string",
    };

    console.log("Current interface expects:");
    Object.entries(expectedInterface).forEach(([key, type]) => {
      console.log(`  ${key}: ${type}`);
    });

    if (headerRowIndex >= 0) {
      console.log("\nExcel provides:");
      jsonData[headerRowIndex].forEach((col, index) => {
        if (col && typeof col === "string" && col.trim()) {
          console.log(`  Column ${index}: "${col}"`);
        }
      });
    }

    // 3. Database analysis
    console.log("\n3. DATABASE ANALYSIS");
    console.log("-".repeat(40));

    const dbStudents = await prisma.student.findMany({
      take: 5,
      include: {
        company: true,
        alan: true,
      },
    });

    console.log(
      `Database students count: ${
        dbStudents.length > 0 ? "Found students" : "No students found"
      }`
    );
    if (dbStudents.length > 0) {
      console.log("Sample database student structure:");
      const sample = dbStudents[0];
      console.log({
        id: sample.id,
        name: sample.name,
        surname: sample.surname,
        className: sample.className,
        number: sample.number,
        tcNo: sample.tcNo,
        companyName: sample.company?.name,
        alanName: sample.alan?.name,
      });
    }

    const dbCompanies = await prisma.companyProfile.findMany({
      take: 5,
      include: {
        teacher: true,
      },
    });

    console.log(`\nDatabase companies count: ${dbCompanies.length}`);
    if (dbCompanies.length > 0) {
      console.log("Sample company:");
      const sample = dbCompanies[0];
      console.log({
        id: sample.id,
        name: sample.name,
        teacherName: sample.teacher
          ? `${sample.teacher.name} ${sample.teacher.surname}`
          : null,
      });
    }

    // 4. Comparison logic analysis
    console.log("\n4. COMPARISON LOGIC ISSUES");
    console.log("-".repeat(40));

    console.log("Issues identified:");
    console.log(
      "1. Excel doesn't have TC numbers - primary key for comparison is missing"
    );
    console.log(
      "2. Excel has combined 'Adı Soyadı' field instead of separate name/surname"
    );
    console.log("3. Column mapping mismatch:");
    console.log("   - Excel 'Sınıf' -> Interface 'className'");
    console.log("   - Excel 'No' -> Interface 'studentNumber'");
    console.log("   - Excel 'Adı Soyadı' -> Interface 'name' + 'surname'");
    console.log("   - Excel 'İşletmenin Adı' -> Interface 'companyName'");
    console.log("   - Excel 'Koordinatör Öğretmen' -> Interface 'teacherName'");
    console.log("   - Excel 'Bölüm' -> Interface 'alanName'");
    console.log("4. Missing TC No means we need alternative matching strategy");

    // 5. Proposed solution
    console.log("\n5. PROPOSED SOLUTIONS");
    console.log("-".repeat(40));

    console.log("Solution 1: Update Excel parsing to map columns correctly");
    console.log(
      "Solution 2: Use alternative matching criteria (name + studentNumber + className)"
    );
    console.log("Solution 3: Add company/internship comparison logic");
    console.log("Solution 4: Include active internship checking");

    // 6. Test Excel parsing with correct mapping
    console.log("\n6. TESTING CORRECTED EXCEL PARSING");
    console.log("-".repeat(40));

    if (headerRowIndex >= 0) {
      const headers = jsonData[headerRowIndex];
      const excelStudents = [];

      // Find column indices
      const columnMap = {
        className: headers.findIndex((h) => h && h.includes("Sınıf")),
        studentNumber: headers.findIndex(
          (h) => h && h.includes("No") && !h.includes("Soyadı")
        ),
        alanName: headers.findIndex((h) => h && h.includes("Bölüm")),
        fullName: headers.findIndex((h) => h && h.includes("Adı Soyadı")),
        teacherName: headers.findIndex(
          (h) => h && h.includes("Koordinatör Öğretmen")
        ),
        companyName: headers.findIndex(
          (h) => h && h.includes("İşletmenin Adı")
        ),
      };

      console.log("Column mapping:", columnMap);

      // Parse a few sample rows
      for (
        let i = dataStartRow;
        i < Math.min(dataStartRow + 3, jsonData.length);
        i++
      ) {
        const row = jsonData[i];
        if (row && row.some((cell) => cell !== undefined && cell !== "")) {
          const fullName = row[columnMap.fullName];
          let name = "",
            surname = "";
          if (fullName && typeof fullName === "string") {
            const nameParts = fullName.trim().split(" ");
            if (nameParts.length >= 2) {
              name = nameParts[0];
              surname = nameParts.slice(1).join(" ");
            }
          }

          const student = {
            className: row[columnMap.className] || "",
            studentNumber: row[columnMap.studentNumber] || "",
            alanName: row[columnMap.alanName] || "",
            name: name,
            surname: surname,
            teacherName: row[columnMap.teacherName] || "",
            companyName: row[columnMap.companyName] || "",
            tcNo: null, // Not available in Excel
          };

          console.log(`Sample parsed student ${i}:`, student);
          excelStudents.push(student);
        }
      }

      console.log(
        `Successfully parsed ${excelStudents.length} sample students`
      );
    }
  } catch (error) {
    console.error("Debug error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  debugExcelComparison()
    .catch(console.error)
    .finally(() => process.exit());
}

module.exports = { debugExcelComparison };
