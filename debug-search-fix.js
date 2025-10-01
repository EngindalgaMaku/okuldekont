const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function debugSearchFix() {
  try {
    console.log("🔧 TESTING FIXED SEARCH FUNCTIONALITY");
    console.log("=====================================");

    // Test 1: Search for "pakize" with corrected MySQL syntax (should return 0 results)
    console.log('\n1. Testing FIXED search for "pakize" (expected: 0 results)');
    const pakizeResults = await prisma.student.findMany({
      where: {
        AND: [
          {
            OR: [
              { name: { contains: "pakize" } }, // Removed mode: "insensitive"
              { surname: { contains: "pakize" } },
              { number: { contains: "pakize" } },
            ],
          },
        ],
      },
      select: { id: true, name: true, surname: true, number: true },
    });
    console.log(`✅ Results found: ${pakizeResults.length}`);
    if (pakizeResults.length > 0) {
      pakizeResults.forEach((s) =>
        console.log(`  - ${s.name} ${s.surname} (${s.number})`)
      );
    }

    // Test 2: Search for "musa" (should return 1 result)
    console.log('\n2. Testing FIXED search for "musa" (expected: 1 result)');
    const musaResults = await prisma.student.findMany({
      where: {
        AND: [
          {
            OR: [
              { name: { contains: "musa" } },
              { surname: { contains: "musa" } },
              { number: { contains: "musa" } },
            ],
          },
        ],
      },
      select: { id: true, name: true, surname: true, number: true },
    });
    console.log(`✅ Results found: ${musaResults.length}`);
    musaResults.forEach((s) =>
      console.log(`  - ${s.name} ${s.surname} (${s.number})`)
    );

    // Test 3: Test case-insensitive search for "MUSA"
    console.log('\n3. Testing case-insensitive "MUSA" (should still work)');
    const musaUpperResults = await prisma.student.findMany({
      where: {
        AND: [
          {
            OR: [
              { name: { contains: "MUSA" } },
              { surname: { contains: "MUSA" } },
              { number: { contains: "MUSA" } },
            ],
          },
        ],
      },
      select: { id: true, name: true, surname: true, number: true },
    });
    console.log(`✅ Results found: ${musaUpperResults.length}`);
    musaUpperResults.forEach((s) =>
      console.log(`  - ${s.name} ${s.surname} (${s.number})`)
    );

    // Test 4: Test the exact API logic with the fix
    console.log('\n4. Testing API-style search logic (FIXED) for "pakize"');
    const search = "pakize";
    const tokens = search
      .split(/\s+/)
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    const whereClause = {
      AND: tokens.map((t) => ({
        OR: [
          { name: { contains: t } }, // Fixed: removed mode
          { surname: { contains: t } }, // Fixed: removed mode
          { number: { contains: t } }, // Fixed: removed mode
        ],
      })),
    };

    console.log("Fixed WHERE clause:", JSON.stringify(whereClause, null, 2));

    const apiStyleResults = await prisma.student.findMany({
      where: whereClause,
      select: { id: true, name: true, surname: true, number: true },
      take: 10,
    });

    console.log(`✅ API-style results found: ${apiStyleResults.length}`);
    if (apiStyleResults.length > 0) {
      apiStyleResults.forEach((s) =>
        console.log(`  - ${s.name} ${s.surname} (${s.number})`)
      );
    } else {
      console.log("  ✅ Correctly returned 0 results for non-existing name");
    }

    console.log("\n🎉 SEARCH FIX VALIDATION COMPLETE!");

    await prisma.$disconnect();
  } catch (error) {
    console.error("❌ Error:", error);
    await prisma.$disconnect();
  }
}

debugSearchFix();
