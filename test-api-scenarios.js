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
            console.log("Sample Results:");
            parsed.students.slice(0, 3).forEach((s, i) => {
              console.log(
                `  ${i + 1}. ${s.ad} ${s.soyad} (${s.no}) - ${
                  s.company ? s.company.name : "Unassigned"
                }`
              );
            });
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

async function runTests() {
  try {
    console.log("Starting Student Search API Tests");
    console.log("==================================");

    // Test 1: Search only (no status filters)
    await testAPI(
      "http://localhost:3000/api/admin/students?search=Musa&page=1&per_page=5",
      'Test 1: Search only - "Musa"'
    );

    // Test 2: Status filter only (no search terms)
    await testAPI(
      "http://localhost:3000/api/admin/students?status=unassigned&page=1&per_page=5",
      'Test 2: Status filter only - "unassigned"'
    );

    // Test 3: Combined functionality (search + status filter) - This was the broken scenario
    await testAPI(
      "http://localhost:3000/api/admin/students?search=Musa&status=unassigned&page=1&per_page=5",
      'Test 3: Combined - Search "Musa" + Status "unassigned"'
    );

    // Test 4: Different search with unassigned status
    await testAPI(
      "http://localhost:3000/api/admin/students?search=Emre&status=unassigned&page=1&per_page=5",
      'Test 4: Combined - Search "Emre" + Status "unassigned"'
    );

    // Test 5: Active status with search
    await testAPI(
      "http://localhost:3000/api/admin/students?search=Musa&status=active&page=1&per_page=5",
      'Test 5: Combined - Search "Musa" + Status "active"'
    );

    // Test 6: All students (no filters)
    await testAPI(
      "http://localhost:3000/api/admin/students?page=1&per_page=5",
      "Test 6: No filters - All students"
    );

    console.log("\n=== Test Summary ===");
    console.log("All API tests completed successfully!");
  } catch (error) {
    console.error("Test failed:", error.message);
  }
}

runTests();
