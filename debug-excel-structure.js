const XLSX = require("xlsx");
const fs = require("fs");

function debugExcelStructure() {
  console.log("=== Excel Structure Debug Tool ===\n");

  // Look for Excel files in the project root
  const excelFiles = fs
    .readdirSync(".")
    .filter(
      (file) =>
        file.endsWith(".xlsx") || file.endsWith(".XLS") || file.endsWith(".xls")
    );

  console.log("Found Excel files:", excelFiles);

  if (excelFiles.length === 0) {
    console.log("No Excel files found in project root");
    return;
  }

  // Debug each Excel file
  for (const excelFile of excelFiles) {
    console.log(`\n=== Analyzing file: ${excelFile} ===`);

    try {
      const workbook = XLSX.readFile(excelFile);
      const sheetNames = workbook.SheetNames;

      console.log(`Worksheets found: ${sheetNames.length}`);
      console.log(`Sheet names: ${sheetNames.join(", ")}`);

      sheetNames.forEach((sheetName, index) => {
        console.log(`\n--- Worksheet ${index + 1}: "${sheetName}" ---`);

        const worksheet = workbook.Sheets[sheetName];
        const range = XLSX.utils.decode_range(worksheet["!ref"] || "A1");

        console.log(`Range: ${worksheet["!ref"] || "No range"}`);
        console.log(`Total rows: ${range.e.r + 1}`);
        console.log(`Total columns: ${range.e.c + 1}`);

        // Check rows 1-15 for structure
        console.log("\n--- Row by row analysis (rows 1-15) ---");
        for (let rowNum = 0; rowNum <= Math.min(14, range.e.r); rowNum++) {
          const values = [];

          for (let colNum = 0; colNum <= Math.min(19, range.e.c); colNum++) {
            const cellAddress = XLSX.utils.encode_cell({
              r: rowNum,
              c: colNum,
            });
            const cell = worksheet[cellAddress];

            if (
              cell &&
              cell.v !== null &&
              cell.v !== undefined &&
              cell.v !== ""
            ) {
              values.push(`Col${colNum + 1}: "${cell.v}"`);
            }
          }

          if (values.length > 0) {
            console.log(`Row ${rowNum + 1}: ${values.join(" | ")}`);
          } else {
            console.log(`Row ${rowNum + 1}: [EMPTY]`);
          }
        }

        // Special focus on rows 6, 7, 8 (mentioned in the task)
        console.log("\n--- Special focus on rows 6-8 ---");
        [5, 6, 7].forEach((rowNum) => {
          // 0-based, so 5, 6, 7 = rows 6, 7, 8
          if (rowNum <= range.e.r) {
            console.log(`\nRow ${rowNum + 1} detailed analysis:`);

            for (let colNum = 0; colNum <= Math.min(19, range.e.c); colNum++) {
              const cellAddress = XLSX.utils.encode_cell({
                r: rowNum,
                c: colNum,
              });
              const cell = worksheet[cellAddress];

              if (
                cell &&
                cell.v !== null &&
                cell.v !== undefined &&
                cell.v !== ""
              ) {
                console.log(
                  `  Column ${colNum + 1} (${getColumnLetter(colNum + 1)}): "${
                    cell.v
                  }" (type: ${typeof cell.v})`
                );
              }
            }
          }
        });

        // Look for potential data rows (non-empty rows with multiple columns)
        console.log("\n--- Potential data rows analysis ---");
        let dataRowsFound = 0;
        let potentialHeaderRow = null;

        for (let rowNum = 0; rowNum <= range.e.r; rowNum++) {
          let nonEmptyCells = 0;
          const rowData = [];

          for (let colNum = 0; colNum <= Math.min(19, range.e.c); colNum++) {
            const cellAddress = XLSX.utils.encode_cell({
              r: rowNum,
              c: colNum,
            });
            const cell = worksheet[cellAddress];

            if (
              cell &&
              cell.v !== null &&
              cell.v !== undefined &&
              cell.v !== ""
            ) {
              nonEmptyCells++;
              rowData.push(cell.v);
            }
          }

          if (nonEmptyCells >= 3) {
            // Consider rows with 3+ non-empty cells as potential data
            if (
              !potentialHeaderRow &&
              rowData.some(
                (val) =>
                  typeof val === "string" &&
                  (val.toLowerCase().includes("sınıf") ||
                    val.toLowerCase().includes("ad") ||
                    val.toLowerCase().includes("soyad") ||
                    val.toLowerCase().includes("bölüm") ||
                    val.toLowerCase().includes("koordinatör") ||
                    val.toLowerCase().includes("no") ||
                    val.toLowerCase().includes("staj"))
              )
            ) {
              potentialHeaderRow = rowNum + 1; // Convert to 1-based
              console.log(
                `POTENTIAL HEADER ROW ${rowNum + 1}: [${rowData
                  .slice(0, 10)
                  .join(" | ")}]`
              );
            } else if (potentialHeaderRow && rowNum + 1 > potentialHeaderRow) {
              dataRowsFound++;
              if (dataRowsFound <= 5) {
                // Show first 5 data rows
                console.log(
                  `Data row ${rowNum + 1}: [${rowData
                    .slice(0, 10)
                    .join(" | ")}]`
                );
              }
            }
          }
        }

        console.log(`\nSUMMARY for "${sheetName}":`);
        console.log(
          `- Potential header row: ${potentialHeaderRow || "Not found"}`
        );
        console.log(`- Potential data rows: ${dataRowsFound}`);
        console.log(
          `- Recommended start row for data: ${
            potentialHeaderRow ? potentialHeaderRow + 1 : "Unknown"
          }`
        );

        // Extract exact column headers if found
        if (potentialHeaderRow) {
          console.log("\n--- EXACT COLUMN HEADERS ---");
          const headerRowNum = potentialHeaderRow - 1; // Convert to 0-based
          const headers = [];

          for (let colNum = 0; colNum <= Math.min(19, range.e.c); colNum++) {
            const cellAddress = XLSX.utils.encode_cell({
              r: headerRowNum,
              c: colNum,
            });
            const cell = worksheet[cellAddress];

            if (
              cell &&
              cell.v !== null &&
              cell.v !== undefined &&
              cell.v !== ""
            ) {
              headers.push(`Column ${colNum + 1}: "${cell.v}"`);
            }
          }

          console.log("Headers found:", headers.join(" | "));
        }
      });
    } catch (error) {
      console.error(`Error reading ${excelFile}:`, error.message);
    }
  }
}

function getColumnLetter(colNumber) {
  let result = "";
  while (colNumber > 0) {
    colNumber--;
    result = String.fromCharCode(65 + (colNumber % 26)) + result;
    colNumber = Math.floor(colNumber / 26);
  }
  return result;
}

debugExcelStructure();
