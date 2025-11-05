const XLSX = require("xlsx");
const path = require("path");

async function testFixedComparison() {
  console.log("=".repeat(80));
  console.log("TESTING FIXED COMPARISON LOGIC");
  console.log("=".repeat(80));

  try {
    // 1. Parse Excel with correct column mapping
    console.log("\n1. PARSING EXCEL WITH CORRECTED MAPPING");
    console.log("-".repeat(40));

    const excelPath = path.join(
      process.cwd(),
      "01. Eylül 2025 - Mesem - TÜM.xlsx"
    );
    const workbook = XLSX.readFile(excelPath);
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    // Find header row
    let headerRowIndex = -1;
    for (let i = 0; i < Math.min(10, jsonData.length); i++) {
      if (
        jsonData[i] &&
        jsonData[i].some(
          (cell) => typeof cell === "string" && cell.includes("Sınıf")
        )
      ) {
        headerRowIndex = i;
        break;
      }
    }

    if (headerRowIndex === -1) {
      throw new Error("Header row not found");
    }

    const headers = jsonData[headerRowIndex];
    console.log("Headers found:", headers);

    // Column mapping based on debug results
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
      companyName: headers.findIndex((h) => h && h.includes("İşletmenin Adı")),
    };

    console.log("Column mapping:", columnMap);

    // Parse Excel data with correct mapping
    const excelStudents = [];
    const dataStartRow = headerRowIndex + 1;

    for (let i = dataStartRow; i < jsonData.length; i++) {
      const row = jsonData[i];
      if (
        row &&
        row.some((cell) => cell !== undefined && cell !== "" && cell !== null)
      ) {
        const fullName = row[columnMap.fullName];
        if (!fullName || typeof fullName !== "string") continue;

        const nameParts = fullName.trim().split(" ");
        if (nameParts.length < 2) continue;

        const name = nameParts[0];
        const surname = nameParts.slice(1).join(" ");
        const studentNumber = String(row[columnMap.studentNumber] || "");
        const className = String(row[columnMap.className] || "");
        const alanName = String(row[columnMap.alanName] || "").replace(
          /\r\n/g,
          " "
        );
        const teacherName = String(row[columnMap.teacherName] || "");
        const companyName = String(row[columnMap.companyName] || "");

        if (!name || !surname || !studentNumber || !className) continue;

        excelStudents.push({
          name,
          surname,
          studentNumber,
          className,
          alanName,
          teacherName,
          companyName,
        });
      }
    }

    console.log(
      `Successfully parsed ${excelStudents.length} students from Excel`
    );
    console.log("Sample parsed student:", excelStudents[0]);

    // 2. Test the comparison API
    console.log("\n2. TESTING COMPARISON API");
    console.log("-".repeat(40));

    const apiUrl = "http://localhost:3000/api/admin/students-comparison";

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        excelStudents,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API request failed: ${response.status} - ${errorText}`);
    }

    const result = await response.json();

    console.log("API Response Status:", response.status);
    console.log("\n3. COMPARISON RESULTS");
    console.log("-".repeat(40));

    console.log(`New Records: ${result.newRecords?.length || 0}`);
    console.log(`Updated Records: ${result.updatedRecords?.length || 0}`);
    console.log(`Removed Records: ${result.removedRecords?.length || 0}`);

    if (result.newRecords?.length > 0) {
      console.log("\nNew Records Sample:");
      result.newRecords.slice(0, 3).forEach((record, index) => {
        console.log(
          `  ${index + 1}. ${record.name} ${record.surname} (${
            record.studentNumber
          }) - ${record.className}`
        );
        console.log(`     Company: ${record.companyName}`);
        console.log(`     Teacher: ${record.teacherName}`);
      });
    }

    if (result.updatedRecords?.length > 0) {
      console.log("\nUpdated Records Sample:");
      result.updatedRecords.slice(0, 3).forEach((record, index) => {
        console.log(
          `  ${index + 1}. ${record.new.name} ${record.new.surname} (${
            record.new.studentNumber
          })`
        );
        console.log(
          `     Changes detected in: ${
            record.old.changes?.join(", ") || "various fields"
          }`
        );
        if (record.old.companyName !== record.new.companyName) {
          console.log(
            `     Company: ${record.old.companyName} → ${record.new.companyName}`
          );
        }
      });
    }

    if (result.removedRecords?.length > 0) {
      console.log("\nRemoved Records Sample:");
      result.removedRecords.slice(0, 3).forEach((record, index) => {
        console.log(
          `  ${index + 1}. ${record.fullName} (${record.number}) - ${
            record.className
          }`
        );
        console.log(`     Last Company: ${record.companyName}`);
        console.log(`     Reason: ${record.reason || "not found in Excel"}`);
      });
    }

    // 4. Analysis
    console.log("\n4. ANALYSIS");
    console.log("-".repeat(40));

    const totalChanges =
      (result.newRecords?.length || 0) +
      (result.updatedRecords?.length || 0) +
      (result.removedRecords?.length || 0);

    if (totalChanges === 0) {
      console.log("⚠️  No changes detected! This might indicate:");
      console.log("   - Excel data matches database perfectly (unlikely)");
      console.log("   - Matching logic still needs refinement");
      console.log("   - Data format issues");
    } else if (totalChanges > excelStudents.length * 0.8) {
      console.log(
        "⚠️  Very high number of changes detected! This might indicate:"
      );
      console.log("   - Matching logic is too sensitive");
      console.log("   - Database is mostly empty or very different");
      console.log("   - Data format mismatches");
    } else {
      console.log("✅ Reasonable number of changes detected.");
      console.log("   The comparison logic appears to be working correctly.");
    }

    console.log(`\nTotal Excel students: ${excelStudents.length}`);
    console.log(`Total changes detected: ${totalChanges}`);
    console.log(
      `Change ratio: ${((totalChanges / excelStudents.length) * 100).toFixed(
        1
      )}%`
    );

    return {
      success: true,
      excelCount: excelStudents.length,
      results: result,
      totalChanges,
    };
  } catch (error) {
    console.error("Test failed:", error.message);
    if (error.stack) {
      console.error("Stack trace:", error.stack);
    }
    return {
      success: false,
      error: error.message,
    };
  }
}

// Run the test
if (require.main === module) {
  testFixedComparison()
    .then((result) => {
      if (result.success) {
        console.log("\n✅ Test completed successfully!");
      } else {
        console.log("\n❌ Test failed!");
        process.exit(1);
      }
    })
    .catch(console.error);
}

module.exports = { testFixedComparison };
