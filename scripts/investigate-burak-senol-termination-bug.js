const { PrismaClient } = require("@prisma/client");
require("dotenv").config();

const prisma = new PrismaClient();

async function investigateBurakSenolBug() {
  console.log("🔍 BURAK ŞENOL TERMINATION BUG INVESTIGATION");
  console.log("═".repeat(60));

  try {
    await prisma.$connect();

    // Step 1: Find Burak Şenol's student record
    console.log("\n1️⃣ SEARCHING FOR BURAK ŞENOL IN STUDENTS TABLE...");

    const students = await prisma.student.findMany({
      where: {
        OR: [
          { name: { contains: "burak" } },
          { name: { contains: "BURAK" } },
          { surname: { contains: "şenol" } },
          { surname: { contains: "ŞENOL" } },
          { surname: { contains: "senol" } },
          { surname: { contains: "SENOL" } },
        ],
      },
    });

    if (students.length === 0) {
      console.log(
        '❌ No student found with name/surname containing "burak" or "şenol/senol"'
      );

      // Try broader search
      console.log("\n🔄 TRYING BROADER SEARCH...");
      const allStudents = await prisma.student.findMany({
        where: {
          OR: [
            { name: { contains: "burak" } },
            { name: { contains: "BURAK" } },
            { surname: { contains: "şen" } },
            { surname: { contains: "ŞEN" } },
          ],
        },
        take: 10,
      });

      console.log(
        `📊 Found ${allStudents.length} students with partial matches:`
      );
      allStudents.forEach((student) => {
        console.log(
          `   - ID: ${student.id}, Name: ${student.name} ${student.surname}`
        );
      });

      return;
    }

    console.log(`✅ Found ${students.length} matching student(s):`);
    students.forEach((student) => {
      console.log(`\n📋 STUDENT RECORD:`);
      console.log(`   ID: ${student.id}`);
      console.log(`   Name: ${student.name} ${student.surname}`);
      console.log(`   Number: ${student.number}`);
      console.log(`   School: ${student.school}`);
      console.log(`   Class: ${student.className}`);
      console.log(
        `   Created: ${student.createdAt?.toISOString().split("T")[0]}`
      );
      console.log(
        `   Updated: ${student.updatedAt?.toISOString().split("T")[0]}`
      );
    });

    // Step 2: Find FA Global company
    console.log("\n2️⃣ SEARCHING FOR FA GLOBAL COMPANY...");
    const companies = await prisma.companyProfile.findMany({
      where: {
        OR: [
          { name: { contains: "fa global" } },
          { name: { contains: "FA GLOBAL" } },
          { name: { contains: "faglobal" } },
          { name: { contains: "FAGLOBAL" } },
          { name: { contains: "Fa Global" } },
        ],
      },
    });

    console.log(`📊 Found ${companies.length} matching company(ies):`);
    companies.forEach((company) => {
      console.log(`\n🏢 COMPANY RECORD:`);
      console.log(`   ID: ${company.id}`);
      console.log(`   Name: ${company.name}`);
      console.log(`   Company Type: ${company.companyType}`);
      console.log(
        `   Created: ${company.createdAt?.toISOString().split("T")[0]}`
      );
    });

    // Step 3: Find internship records for Burak at FA Global
    if (students.length > 0 && companies.length > 0) {
      console.log(
        "\n3️⃣ SEARCHING FOR BURAK'S INTERNSHIP RECORDS AT FA GLOBAL..."
      );

      for (const student of students) {
        for (const company of companies) {
          const internships = await prisma.staj.findMany({
            where: {
              studentId: student.id,
              companyId: company.id,
            },
            include: {
              student: { select: { name: true, surname: true, number: true } },
              company: { select: { name: true, companyType: true } },
              teacher: { select: { name: true, surname: true } },
            },
          });

          console.log(
            `\n📊 Found ${internships.length} internship(s) for ${student.name} ${student.surname} at ${company.name}:`
          );

          internships.forEach((internship, index) => {
            console.log(`\n📝 INTERNSHIP ${index + 1}:`);
            console.log(`   ID: ${internship.id}`);
            console.log(
              `   Student: ${internship.student?.name} ${internship.student?.surname} (${internship.student?.number})`
            );
            console.log(
              `   Company: ${internship.company?.name} (${internship.company?.companyType})`
            );
            console.log(
              `   Teacher: ${internship.teacher?.name} ${internship.teacher?.surname}`
            );
            console.log(
              `   Start Date: ${
                internship.startDate?.toISOString().split("T")[0]
              }`
            );
            console.log(
              `   End Date: ${internship.endDate?.toISOString().split("T")[0]}`
            );
            console.log(
              `   Termination Date: ${
                internship.terminationDate?.toISOString().split("T")[0] ||
                "NULL ❌"
              }`
            );
            console.log(`   Status: ${internship.status}`);
            console.log(`   Archived: ${internship.archived}`);
            console.log(
              `   Created: ${internship.createdAt?.toISOString().split("T")[0]}`
            );
            console.log(
              `   Updated: ${internship.updatedAt?.toISOString().split("T")[0]}`
            );
            console.log(
              `   Last Modified: ${
                internship.lastModifiedAt?.toISOString().split("T")[0]
              }`
            );

            // CRITICAL: Check if this matches the bug description
            if (internship.status === "TERMINATED") {
              console.log(`\n🚨 CRITICAL ANALYSIS FOR TERMINATED STUDENT:`);
              console.log(`   Status: TERMINATED ✅`);
              console.log(
                `   End Date: ${
                  internship.endDate?.toISOString().split("T")[0]
                }`
              );
              console.log(
                `   Termination Date: ${
                  internship.terminationDate?.toISOString().split("T")[0] ||
                  "NULL ❌"
                }`
              );

              // Check if terminated in October
              const effectiveTerminationDate =
                internship.terminationDate || internship.endDate;
              if (effectiveTerminationDate) {
                const terminationMonth =
                  effectiveTerminationDate.getMonth() + 1;
                const terminationYear = effectiveTerminationDate.getFullYear();
                console.log(
                  `   Effective termination: ${
                    effectiveTerminationDate.toISOString().split("T")[0]
                  } (Month: ${terminationMonth}, Year: ${terminationYear})`
                );

                if (terminationMonth === 10 && terminationYear === 2025) {
                  console.log(
                    `   🎯 BINGO! This matches the bug: terminated in October 2025`
                  );
                }
              }
            }
          });
        }
      }
    }

    // Step 4: Check dekont records for November 2025
    if (students.length > 0) {
      console.log("\n4️⃣ CHECKING DEKONT RECORDS FOR NOVEMBER 2025...");

      const novemberStart = new Date(2025, 10, 1); // November 1, 2025
      const decemberStart = new Date(2025, 11, 1); // December 1, 2025

      for (const student of students) {
        const dekontRecords = await prisma.dekont.findMany({
          where: {
            studentId: student.id,
            createdAt: {
              gte: novemberStart,
              lt: decemberStart,
            },
          },
          include: {
            student: { select: { name: true, surname: true } },
            company: { select: { name: true } },
          },
        });

        console.log(
          `\n📊 Found ${dekontRecords.length} dekont record(s) for ${student.name} ${student.surname} in November 2025:`
        );

        dekontRecords.forEach((dekont, index) => {
          console.log(`\n🧾 DEKONT ${index + 1}:`);
          console.log(`   ID: ${dekont.id}`);
          console.log(
            `   Student: ${dekont.student?.name} ${dekont.student?.surname}`
          );
          console.log(`   Company: ${dekont.company?.name}`);
          console.log(`   Status: ${dekont.status}`);
          console.log(`   Month: ${dekont.month}`);
          console.log(`   Year: ${dekont.year}`);
          console.log(
            `   Created: ${dekont.createdAt?.toISOString().split("T")[0]}`
          );
          console.log(
            `   Updated: ${dekont.updatedAt?.toISOString().split("T")[0]}`
          );

          if (dekont.month === 11 && dekont.year === 2025) {
            console.log(
              `   🚨 CRITICAL: This is the November 2025 dekont causing the bug!`
            );
          }
        });
      }
    }

    // Step 5: Test November 2025 expected list query logic
    if (students.length > 0 && companies.length > 0) {
      console.log(
        '\n5️⃣ TESTING "EXPECTED LIST" QUERY LOGIC FOR NOVEMBER 2025...'
      );

      const testMonth = 11; // November
      const testYear = 2025;
      const monthStart = new Date(testYear, testMonth - 1, 1); // November 1, 2025

      console.log(
        `Test month start: ${monthStart.toISOString().split("T")[0]}`
      );

      for (const student of students) {
        for (const company of companies) {
          console.log(
            `\n🔍 TESTING FILTERS FOR ${student.name} ${student.surname} AT ${company.name}:`
          );

          // Test 1: Current problematic filter (likely what's causing the bug)
          const basicFilter = await prisma.staj.findMany({
            where: {
              studentId: student.id,
              companyId: company.id,
              archived: false,
              educationYear: { active: true },
            },
            include: {
              student: { select: { name: true, surname: true } },
            },
          });

          console.log(
            `   📋 Basic filter (NO TERMINATION CHECKS): ${basicFilter.length} records`
          );
          basicFilter.forEach((record, idx) => {
            console.log(
              `      Record ${idx + 1}: Status: ${record.status}, End: ${
                record.endDate?.toISOString().split("T")[0]
              }, Term: ${
                record.terminationDate?.toISOString().split("T")[0] || "NULL"
              }`
            );
            console.log(
              `         ❌ Would be in expected list: ${shouldBeInExpectedList(
                record,
                monthStart
              )}`
            );
          });

          // Test 2: Improved filter with proper termination handling
          const improvedFilter = await prisma.staj.findMany({
            where: {
              studentId: student.id,
              companyId: company.id,
              archived: false,
              educationYear: { active: true },
              OR: [
                // Non-terminated students
                { status: { not: "TERMINATED" } },
                // Terminated students - check termination date
                {
                  AND: [
                    { status: "TERMINATED" },
                    {
                      OR: [
                        // Has terminationDate and it's >= month start
                        { terminationDate: { gte: monthStart } },
                        // No terminationDate but has endDate >= month start (fallback)
                        {
                          AND: [
                            { terminationDate: null },
                            { endDate: { gte: monthStart } },
                          ],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
            include: {
              student: { select: { name: true, surname: true } },
            },
          });

          console.log(
            `   ✅ Improved filter (WITH TERMINATION CHECKS): ${improvedFilter.length} records`
          );
          improvedFilter.forEach((record, idx) => {
            console.log(
              `      Record ${idx + 1}: Status: ${record.status}, End: ${
                record.endDate?.toISOString().split("T")[0]
              }, Term: ${
                record.terminationDate?.toISOString().split("T")[0] || "NULL"
              }`
            );
            console.log(
              `         ✅ Correctly filtered: ${shouldBeInExpectedList(
                record,
                monthStart
              )}`
            );
          });

          // Show the difference
          const buggyRecords = basicFilter.filter(
            (r) => !shouldBeInExpectedList(r, monthStart)
          );
          if (buggyRecords.length > 0) {
            console.log(
              `\n   🚨 BUG FOUND: ${buggyRecords.length} record(s) would incorrectly appear in expected list!`
            );
            buggyRecords.forEach((record) => {
              console.log(
                `      - ${record.student?.name} ${record.student?.surname}: ${record.status} (terminated but still showing)`
              );
            });
          }
        }
      }
    }

    // Step 6: Check which API serves the "beklenen listesi"
    console.log('\n6️⃣ IDENTIFYING APIs THAT SERVE "BEKLENEN LİSTESİ"...');
    console.log("   Based on project structure, likely candidates:");
    console.log("   - /api/admin/dashboard-stats/route.ts");
    console.log("   - /api/admin/dekontlar/route.ts");
    console.log("   - Payment calculation endpoints");
    console.log(
      "   📝 Recommendation: Check these API routes for filtering logic"
    );
  } catch (error) {
    console.error("❌ Unexpected error during investigation:", error);
    console.error("Stack:", error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

function shouldBeInExpectedList(record, monthStart) {
  // Logic to determine if a record should be in expected list for the given month
  if (record.status !== "TERMINATED") {
    return true; // Non-terminated students should always be included
  }

  // For terminated students, they should only be included if termination is AFTER month start
  const effectiveTerminationDate = record.terminationDate || record.endDate;
  if (effectiveTerminationDate) {
    return effectiveTerminationDate >= monthStart;
  }

  // If no termination date at all, this is a data integrity issue
  return false;
}

// Run the investigation
investigateBurakSenolBug();
