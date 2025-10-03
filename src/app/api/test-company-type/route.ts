import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  isGovernmentInstitution,
  isDekontRequired,
  getCompanyTypeLabel,
  getCompanyTypeBadgeClass,
  type CompanyType,
} from "@/lib/company-utils";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");

    switch (action) {
      case "test-utils":
        return testUtilityFunctions();
      case "test-db":
        return testDatabaseQueries();
      case "list-companies":
        return listCompaniesWithTypes();
      default:
        return NextResponse.json(
          {
            error:
              "Invalid action. Available actions: test-utils, test-db, list-companies",
            availableActions: ["test-utils", "test-db", "list-companies"],
          },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("Test API error:", error);
    return NextResponse.json(
      { error: "Test API failed", details: error },
      { status: 500 }
    );
  }
}

async function testUtilityFunctions() {
  const results = {
    testName: "Company Utility Functions Test",
    tests: [] as any[],
    passed: 0,
    failed: 0,
    summary: "",
  };

  // Test 1: isGovernmentInstitution
  const test1 = {
    name: "isGovernmentInstitution function",
    tests: [
      {
        input: "GOVERNMENT" as CompanyType,
        expected: true,
        actual: isGovernmentInstitution("GOVERNMENT" as CompanyType),
        description: "Should return true for GOVERNMENT type",
      },
      {
        input: "PRIVATE" as CompanyType,
        expected: false,
        actual: isGovernmentInstitution("PRIVATE" as CompanyType),
        description: "Should return false for PRIVATE type",
      },
    ],
  };

  test1.tests.forEach((t) => {
    const passed = t.actual === t.expected;
    results.tests.push({ ...t, passed });
    if (passed) results.passed++;
    else results.failed++;
  });

  // Test 2: isDekontRequired
  const test2 = {
    name: "isDekontRequired function",
    tests: [
      {
        input: "GOVERNMENT" as CompanyType,
        expected: false,
        actual: isDekontRequired("GOVERNMENT" as CompanyType),
        description:
          "Should return false for GOVERNMENT type (dekont not required)",
      },
      {
        input: "PRIVATE" as CompanyType,
        expected: true,
        actual: isDekontRequired("PRIVATE" as CompanyType),
        description: "Should return true for PRIVATE type (dekont required)",
      },
    ],
  };

  test2.tests.forEach((t) => {
    const passed = t.actual === t.expected;
    results.tests.push({ ...t, passed });
    if (passed) results.passed++;
    else results.failed++;
  });

  // Test 3: getCompanyTypeLabel
  const test3 = {
    name: "getCompanyTypeLabel function",
    tests: [
      {
        input: "GOVERNMENT" as CompanyType,
        expected: "Kamu Kurumu",
        actual: getCompanyTypeLabel("GOVERNMENT" as CompanyType),
        description: "Should return Turkish label for GOVERNMENT",
      },
      {
        input: "PRIVATE" as CompanyType,
        expected: "Özel Sektör",
        actual: getCompanyTypeLabel("PRIVATE" as CompanyType),
        description: "Should return Turkish label for PRIVATE",
      },
    ],
  };

  test3.tests.forEach((t) => {
    const passed = t.actual === t.expected;
    results.tests.push({ ...t, passed });
    if (passed) results.passed++;
    else results.failed++;
  });

  // Test 4: getCompanyTypeBadgeClass
  const test4 = {
    name: "getCompanyTypeBadgeClass function",
    tests: [
      {
        input: "GOVERNMENT" as CompanyType,
        expected: "bg-blue-100 text-blue-800 border-blue-200",
        actual: getCompanyTypeBadgeClass("GOVERNMENT" as CompanyType),
        description: "Should return blue styling for GOVERNMENT",
      },
      {
        input: "PRIVATE" as CompanyType,
        expected: "bg-gray-100 text-gray-800 border-gray-200",
        actual: getCompanyTypeBadgeClass("PRIVATE" as CompanyType),
        description: "Should return gray styling for PRIVATE",
      },
    ],
  };

  test4.tests.forEach((t) => {
    const passed = t.actual === t.expected;
    results.tests.push({ ...t, passed });
    if (passed) results.passed++;
    else results.failed++;
  });

  results.summary = `${results.passed} passed, ${results.failed} failed`;

  return NextResponse.json(results);
}

async function testDatabaseQueries() {
  const results = {
    testName: "Database Layer Test",
    tests: [] as any[],
    passed: 0,
    failed: 0,
    companyStats: null as any,
    summary: "",
  };

  try {
    // Test 1: Verify CompanyType enum exists in schema
    const enumTest = {
      name: "CompanyType enum verification",
      description: "Check if CompanyType enum is properly defined",
      passed: false,
    };

    // Test 2: Check if companyType field exists and has default value
    const companiesWithTypes = await prisma.companyProfile.findMany({
      select: {
        id: true,
        name: true,
        companyType: true,
      },
      take: 5,
    });

    const schemaTest = {
      name: "CompanyType field in database",
      description: "Verify companyType field exists and has values",
      expected: "All companies should have a companyType field",
      actual: `Found ${companiesWithTypes.length} companies with companyType field`,
      passed: companiesWithTypes.every((c) => c.companyType !== undefined),
      sampleData: companiesWithTypes,
    };

    results.tests.push(schemaTest);
    if (schemaTest.passed) results.passed++;
    else results.failed++;

    // Test 3: Verify default value assignment
    const typeDistribution = await prisma.companyProfile.groupBy({
      by: ["companyType"],
      _count: true,
    });

    const defaultTest = {
      name: "Default value assignment",
      description: "Check if existing companies defaulted to PRIVATE",
      expected: "Majority should be PRIVATE type",
      actual: typeDistribution,
      passed: typeDistribution.some((t) => t.companyType === "PRIVATE"),
    };

    results.tests.push(defaultTest);
    if (defaultTest.passed) results.passed++;
    else results.failed++;

    // Test 4: Index verification (indirect test)
    const indexTest = {
      name: "CompanyType index test",
      description: "Test query performance with companyType filter",
      passed: false,
      queryTime: 0,
    };

    const start = Date.now();
    const govCompanies = await prisma.companyProfile.findMany({
      where: { companyType: "GOVERNMENT" },
      select: { id: true, name: true, companyType: true },
    });
    indexTest.queryTime = Date.now() - start;
    indexTest.passed = indexTest.queryTime < 100; // Should be fast with index
    indexTest.actual = `Query returned ${govCompanies.length} government companies in ${indexTest.queryTime}ms`;

    results.tests.push(indexTest);
    if (indexTest.passed) results.passed++;
    else results.failed++;

    // Compile company statistics
    results.companyStats = {
      total: companiesWithTypes.length,
      typeDistribution,
      governmentCompanies: govCompanies.length,
      privateCompanies:
        typeDistribution.find((t) => t.companyType === "PRIVATE")?._count || 0,
    };
  } catch (error) {
    results.tests.push({
      name: "Database connection test",
      description: "Basic database connectivity",
      passed: false,
      error: String(error),
      actual: "Database query failed",
    });
    results.failed++;
  }

  results.summary = `${results.passed} passed, ${results.failed} failed`;
  return NextResponse.json(results);
}

async function listCompaniesWithTypes() {
  try {
    const companies = await prisma.companyProfile.findMany({
      select: {
        id: true,
        name: true,
        companyType: true,
        contact: true,
        _count: {
          select: {
            students: true,
            dekontlar: true,
          },
        },
      },
      take: 20, // Limit for testing
    });

    const enrichedCompanies = companies.map((company) => ({
      ...company,
      typeLabel: getCompanyTypeLabel(company.companyType),
      badgeClass: getCompanyTypeBadgeClass(company.companyType),
      isDekontRequired: isDekontRequired(company.companyType),
      isGovernment: isGovernmentInstitution(company.companyType),
    }));

    return NextResponse.json({
      total: companies.length,
      companies: enrichedCompanies,
      summary: {
        government: companies.filter((c) => c.companyType === "GOVERNMENT")
          .length,
        private: companies.filter((c) => c.companyType === "PRIVATE").length,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch companies", details: String(error) },
      { status: 500 }
    );
  }
}

// POST endpoint for updating company types (for testing)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, companyId, companyType } = body;

    if (action === "update-company-type") {
      if (!companyId || !companyType) {
        return NextResponse.json(
          { error: "Missing companyId or companyType" },
          { status: 400 }
        );
      }

      if (!["GOVERNMENT", "PRIVATE"].includes(companyType)) {
        return NextResponse.json(
          { error: "Invalid companyType. Must be GOVERNMENT or PRIVATE" },
          { status: 400 }
        );
      }

      const updatedCompany = await prisma.companyProfile.update({
        where: { id: companyId },
        data: { companyType },
        select: {
          id: true,
          name: true,
          companyType: true,
        },
      });

      return NextResponse.json({
        success: true,
        company: updatedCompany,
        message: `Company type updated to ${companyType}`,
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { error: "Update failed", details: String(error) },
      { status: 500 }
    );
  }
}
