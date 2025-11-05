const XLSX = require("xlsx");

// Simple test to verify MESEM Excel structure for name/number matching
async function testMESEMStructure() {
  try {
    console.log("🧪 Testing MESEM Excel Structure for Name/Number Matching");
    console.log("=" + "=".repeat(55));

    const filename = "01. Eylül 2025 - Mesem - TÜM.xlsx";
    console.log(`📄 Analyzing: ${filename}`);

    // Read Excel file
    const workbook = XLSX.readFile(filename, {
      cellNF: true,
      raw: false,
    });

    const rawData = XLSX.utils.sheet_to_json(
      workbook.Sheets[workbook.SheetNames[0]],
      { header: 1 }
    );

    console.log(`📊 Total rows: ${rawData.length}`);

    // Find header row
    let headerRowIndex = -1;
    let headerRow = null;

    for (let i = 0; i < Math.min(20, rawData.length); i++) {
      const row = rawData[i];
      if (row && Array.isArray(row)) {
        const rowStr = row.join(" ").toLowerCase();
        if (
          rowStr.includes("sınıf") &&
          (rowStr.includes("adı soyadı") || rowStr.includes("öğrenci"))
        ) {
          headerRowIndex = i;
          headerRow = row;
          break;
        }
      }
    }

    if (headerRowIndex === -1) {
      console.log("❌ Header row not found");
      return;
    }

    console.log(`\n🎯 Header row found at index ${headerRowIndex}:`);
    headerRow.forEach((col, index) => {
      if (col) {
        console.log(`  [${index}] ${col}`);
      }
    });

    // Analyze key columns for matching
    const columnMapping = {};

    headerRow.forEach((header, index) => {
      if (header) {
        const headerStr = String(header)
          .toLowerCase()
          .replace(/\n/g, " ")
          .trim();

        // Student number column
        if (headerStr === "no" || headerStr.includes("öğrenci no")) {
          columnMapping.studentNo = index;
        }

        // Student name column
        if (
          headerStr.includes("adı soyadı") ||
          headerStr.includes("ad soyad")
        ) {
          columnMapping.studentName = index;
        }

        // TC number column (fallback)
        if (headerStr.includes("tc") || headerStr.includes("kimlik")) {
          columnMapping.tcNo = index;
        }

        // Class column
        if (headerStr === "sınıf" || headerStr.includes("sınıf")) {
          columnMapping.class = index;
        }

        // Amount column
        if (headerStr.includes("öğrencinin") && headerStr.includes("maaş")) {
          columnMapping.amount = index;
        }
      }
    });

    console.log(`\n🗺️ Column mapping for matching:`, columnMapping);

    // Analyze first few data rows
    console.log(`\n👥 First 5 student data rows (for matching analysis):`);
    const dataRows = rawData.slice(headerRowIndex + 1);

    for (let i = 0; i < Math.min(5, dataRows.length); i++) {
      const row = dataRows[i];
      if (row && Array.isArray(row)) {
        console.log(`\nRow ${i + 1}:`);

        // Show what data is available for matching
        const studentNo =
          columnMapping.studentNo !== undefined
            ? row[columnMapping.studentNo]
            : "N/A";
        const studentName =
          columnMapping.studentName !== undefined
            ? row[columnMapping.studentName]
            : "N/A";
        const tcNo =
          columnMapping.tcNo !== undefined ? row[columnMapping.tcNo] : "N/A";
        const amount =
          columnMapping.amount !== undefined
            ? row[columnMapping.amount]
            : "N/A";

        console.log(`  Student No: "${studentNo}"`);
        console.log(`  Name: "${studentName}"`);
        console.log(`  TC No: "${tcNo}"`);
        console.log(`  Amount: "${amount}"`);

        // Show which matching method would be prioritized
        if (studentNo && studentNo !== "N/A" && String(studentNo).trim()) {
          console.log(`  ✅ PRIMARY MATCH: Student Number ("${studentNo}")`);
        } else if (
          studentName &&
          studentName !== "N/A" &&
          String(studentName).trim()
        ) {
          console.log(`  ✅ SECONDARY MATCH: Name ("${studentName}")`);
        } else if (tcNo && tcNo !== "N/A" && String(tcNo).trim()) {
          console.log(`  ✅ FALLBACK MATCH: TC Number ("${tcNo}")`);
        } else {
          console.log(`  ❌ NO MATCHING DATA AVAILABLE`);
        }
      }
    }

    console.log(`\n📋 Summary:`);
    console.log(`- Header found at row: ${headerRowIndex}`);
    console.log(`- Total data rows: ${dataRows.length}`);
    console.log(
      `- Column mapping success: ${
        Object.keys(columnMapping).length > 0 ? "✅" : "❌"
      }`
    );
    console.log(
      `- Student number column: ${
        columnMapping.studentNo !== undefined ? "✅" : "❌"
      }`
    );
    console.log(
      `- Student name column: ${
        columnMapping.studentName !== undefined ? "✅" : "❌"
      }`
    );

    console.log(`\n🎯 New Matching Priority Confirmed:`);
    console.log(
      `1. Student Number (${
        columnMapping.studentNo !== undefined ? "Available" : "Not Available"
      })`
    );
    console.log(
      `2. Name Matching (${
        columnMapping.studentName !== undefined ? "Available" : "Not Available"
      })`
    );
    console.log(
      `3. TC Fallback (${
        columnMapping.tcNo !== undefined ? "Available" : "Not Available"
      })`
    );
  } catch (error) {
    console.error("❌ Test failed:", error.message);
  }
}

testMESEMStructure();
