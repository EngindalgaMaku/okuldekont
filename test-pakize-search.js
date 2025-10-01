const https = require("http");

async function testAPI(url, description) {
  return new Promise((resolve, reject) => {
    console.log(`\n=== ${description} ===`);
    console.log(`URL: ${url}`);

    const req = https.get(url, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          const parsed = JSON.parse(data);
          console.log(`Status: ${res.statusCode}`);
          console.log(`Total Count: ${parsed.totalCount || 0}`);
          console.log(
            `Students Found: ${parsed.students ? parsed.students.length : 0}`
          );

          if (parsed.students && parsed.students.length > 0) {
            console.log("All Results:");
            parsed.students.forEach((s, i) => {
              console.log(
                `  ${i + 1}. ${s.ad} ${s.soyad} (${s.no}) - Alan: ${
                  s.alan?.name || "N/A"
                }`
              );
            });

            // Check if any of the results actually match "pakize"
            const matchingStudents = parsed.students.filter(
              (s) =>
                s.ad.toLowerCase().includes("pakize") ||
                s.soyad.toLowerCase().includes("pakize")
            );
            console.log(
              `\nMatching "pakize" students: ${matchingStudents.length}`
            );
            if (matchingStudents.length > 0) {
              matchingStudents.forEach((s, i) => {
                console.log(`  Match ${i + 1}: ${s.ad} ${s.soyad}`);
              });
            }
          } else {
            console.log("No students found");
          }
          resolve(parsed);
        } catch (e) {
          console.log("Error parsing response:", e.message);
          console.log("Raw response:", data);
          reject(e);
        }
      });
    });

    req.on("error", (e) => {
      console.log("Request error:", e.message);
      reject(e);
    });

    req.setTimeout(10000, () => {
      console.log("Request timeout");
      req.destroy();
      reject(new Error("Timeout"));
    });
  });
}

async function runPakizeTests() {
  try {
    console.log("Testing Pakize Search Issue");
    console.log("=============================");

    // Test 1: Search for "pakize" - this should show the issue
    await testAPI(
      "http://localhost:3000/api/admin/students?search=pakize&page=1&per_page=10",
      'Test 1: Search for "pakize" (the failing case)'
    );

    // Test 2: Search for "Pakize" with capital P
    await testAPI(
      "http://localhost:3000/api/admin/students?search=Pakize&page=1&per_page=10",
      'Test 2: Search for "Pakize" (capital P)'
    );

    // Test 3: All students to see what data we actually have
    await testAPI(
      "http://localhost:3000/api/admin/students?page=1&per_page=20",
      "Test 3: All students (first 20) to see actual data"
    );

    // Test 4: Search for other Turkish names to see if the problem is specific
    await testAPI(
      "http://localhost:3000/api/admin/students?search=musa&page=1&per_page=5",
      'Test 4: Search for "musa" for comparison'
    );

    // Test 5: Search for partial match
    await testAPI(
      "http://localhost:3000/api/admin/students?search=pak&page=1&per_page=5",
      'Test 5: Search for "pak" (partial match)'
    );

    console.log("\n=== Pakize Test Summary ===");
    console.log("Pakize search tests completed!");
  } catch (error) {
    console.error("Test failed:", error.message);
  }
}

runPakizeTests();
