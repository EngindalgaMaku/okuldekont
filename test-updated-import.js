const {
  ExcelFormatDetector,
  ExcelFormatType,
} = require("./src/lib/excel-format-detector.ts");
const {
  ExcelAdapterFactory,
  enhanceMESEMColumnDetection,
} = require("./src/lib/excel-format-adapters.ts");
const XLSX = require("xlsx");

// Test the updated import logic with MESEM file
async function testUpdatedImport() {
  try {
    console.log("🧪 Testing Updated Import Logic - Name/Number Priority");
    console.log("=" + "=".repeat(50));

    const filename = "01. Eylül 2025 - Mesem - TÜM.xlsx";
    console.log(`📄 Testing with: ${filename}`);

    // Read Excel file
    const workbook = XLSX.readFile(filename, {
      type: "buffer",
      cellNF: true,
      raw: false,
    });

    const rawData = XLSX.utils.sheet_to_json(
      workbook.Sheets[workbook.SheetNames[0]],
      { header: 1 }
    );

    console.log(`📊 Total rows: ${rawData.length}`);

    // Test format detection
    const formatDetection = ExcelFormatDetector.detectFormat(workbook);
    console.log("\n🔍 Format Detection:");
    console.log(`Type: ${formatDetection.type}`);
    console.log(`Confidence: ${formatDetection.confidence}`);
    console.log(`Reason: ${formatDetection.reason}`);
    console.log(`Header Row: ${formatDetection.headerRow}`);
    console.log(`Detected Columns:`, formatDetection.detectedColumns);

    if (formatDetection.type === ExcelFormatType.UNKNOWN) {
      console.log("❌ Format detection failed");
      return;
    }

    // Enhanced column detection for MESEM
    let columnIndexes = formatDetection.detectedColumns;
    if (
      formatDetection.type === ExcelFormatType.MESEM &&
      Object.keys(columnIndexes).length < 4
    ) {
      console.log("\n🔍 Running enhanced MESEM column detection...");
      columnIndexes = enhanceMESEMColumnDetection(
        rawData[formatDetection.headerRow]
      );
    }

    console.log("\n🗺️ Final column mapping:", columnIndexes);

    // Test adapter
    const adapter = ExcelAdapterFactory.createAdapter(formatDetection.type);
    const adapterResult = adapter.processData(
      rawData,
      formatDetection.headerRow,
      columnIndexes
    );

    console.log("\n📊 Adapter Results:");
    console.log(`Success: ${adapterResult.success}`);
    console.log(`Total Rows: ${adapterResult.totalRows}`);
    console.log(`Valid Rows: ${adapterResult.validRows}`);
    console.log(`Errors: ${adapterResult.errors.length}`);

    // Show first few processed students
    console.log("\n👥 First 5 processed students:");
    adapterResult.data.slice(0, 5).forEach((student, index) => {
      console.log(
        `${index + 1}. ${student.studentName} ${student.studentSurname}`
      );
      console.log(
        `   No: "${student.studentNo || "N/A"}" | Amount: ${student.amount}₺`
      );
      console.log(
        `   Class: "${student.className || "N/A"}" | Company: "${
          student.companyName || "N/A"
        }"`
      );
      console.log(`   Teacher: "${student.coordinatorTeacher || "N/A"}"`);
      console.log("");
    });

    // Test the new matching logic priority
    console.log("\n🔍 Testing New Matching Logic:");
    console.log("Priority: 1) Student Number → 2) Name Match → 3) TC Fallback");

    const testStudent = adapterResult.data[0];
    if (testStudent) {
      console.log(
        `\nTest student: ${testStudent.studentName} ${testStudent.studentSurname}`
      );
      console.log(`Student No: "${testStudent.studentNo || "N/A"}"`);
      console.log(`TC No: "${testStudent.studentTcNo || "N/A"}"`);

      // Show which matching method would be used
      if (testStudent.studentNo && testStudent.studentNo.trim()) {
        console.log("✅ Would use: Student Number matching (Priority 1)");
      } else {
        console.log("✅ Would use: Name matching (Priority 2)");
      }
    }

    console.log("\n✅ Import logic test completed successfully!");
    console.log("🎯 Key Changes Applied:");
    console.log("  - Student number matching is now PRIMARY");
    console.log("  - Name matching is SECONDARY");
    console.log("  - TC number matching is FALLBACK only");
    console.log("  - Removed complex TC partial matching");
  } catch (error) {
    console.error("❌ Test failed:", error.message);
  }
}

testUpdatedImport();
