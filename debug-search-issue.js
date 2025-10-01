const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function debugSearchIssue() {
  try {
    console.log("🔍 DEBUGGING SEARCH FUNCTIONALITY");
    console.log("=====================================");

    // Test 1: Search for "pakize" (should return 0 results)
    console.log('\n1. Testing search for "pakize" (expected: 0 results)');
    const pakizeResults = await prisma.student.findMany({
      where: {
        AND: [
          {
            OR: [
              { name: { contains: "pakize", mode: "insensitive" } },
              { surname: { contains: "pakize", mode: "insensitive" } },
              { number: { contains: "pakize", mode: "insensitive" } },
            ],
          },
        ],
      },
      select: { id: true, name: true, surname: true, number: true },
    });
    console.log(`Results found: ${pakizeResults.length}`);
    pakizeResults.forEach((s) =>
      console.log(`  - ${s.name} ${s.surname} (${s.number})`)
    );

    // Test 2: Search for "musa" (should return 1 result)
    console.log('\n2. Testing search for "musa" (expected: 1 result)');
    const musaResults = await prisma.student.findMany({
      where: {
        AND: [
          {
            OR: [
              { name: { contains: "musa", mode: "insensitive" } },
              { surname: { contains: "musa", mode: "insensitive" } },
              { number: { contains: "musa", mode: "insensitive" } },
            ],
          },
        ],
      },
      select: { id: true, name: true, surname: true, number: true },
    });
    console.log(`Results found: ${musaResults.length}`);
    musaResults.forEach((s) =>
      console.log(`  - ${s.name} ${s.surname} (${s.number})`)
    );

    // Test 3: Test the exact same logic as the API uses
    console.log('\n3. Testing API-style search logic for "pakize"');
    const search = "pakize";
    const tokens = search
      .split(/\s+/)
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    const whereClause = {
      AND: tokens.map((t) => ({
        OR: [
          { name: { contains: t, mode: "insensitive" } },
          { surname: { contains: t, mode: "insensitive" } },
          { number: { contains: t, mode: "insensitive" } },
        ],
      })),
    };

    console.log("WHERE clause:", JSON.stringify(whereClause, null, 2));

    const apiStyleResults = await prisma.student.findMany({
      where: whereClause,
      select: { id: true, name: true, surname: true, number: true },
      take: 10,
    });

    console.log(`API-style results found: ${apiStyleResults.length}`);
    apiStyleResults.forEach((s) =>
      console.log(`  - ${s.name} ${s.surname} (${s.number})`)
    );

    // Test 4: Count total students (to compare)
    console.log("\n4. Total students in database:");
    const totalCount = await prisma.student.count();
    console.log(`Total: ${totalCount}`);

    // Test 5: Test empty search (should return all students)
    console.log("\n5. Testing empty search (should return all students):");
    const emptySearchResults = await prisma.student.findMany({
      where: {},
      select: { id: true, name: true, surname: true },
      take: 5,
    });
    console.log(
      `Empty search results: ${emptySearchResults.length} (showing first 5)`
    );
    emptySearchResults.forEach((s) =>
      console.log(`  - ${s.name} ${s.surname}`)
    );

    await prisma.$disconnect();
  } catch (error) {
    console.error("❌ Error:", error);
    await prisma.$disconnect();
  }
}

debugSearchIssue();
