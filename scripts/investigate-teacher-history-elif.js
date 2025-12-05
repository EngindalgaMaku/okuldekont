const { PrismaClient } = require("@prisma/client");
require("dotenv").config();
const prisma = new PrismaClient();

async function investigateTeacherHistory() {
  try {
    await prisma.$connect();
    console.log("🔍 ÖĞRETMENİN GEÇMİŞ İŞLETMELER SORUNU ARAŞTIRMASI");
    console.log("═".repeat(70));

    // Get Elif's staj record first
    const stajRecord = await prisma.staj.findUnique({
      where: { id: "cmfzckrex00uxnn0l56da78bg" },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            surname: true,
            number: true,
          },
        },
        company: {
          select: {
            id: true,
            name: true,
          },
        },
        teacher: {
          select: {
            id: true,
            name: true,
            surname: true,
            email: true,
          },
        },
        educationYear: {
          select: {
            id: true,
            year: true,
            active: true,
          },
        },
      },
    });

    if (!stajRecord) {
      console.log("❌ Staj record not found");
      return;
    }

    console.log("📋 ELIF POYRAZ STAJ RECORD:");
    console.log("─".repeat(50));
    console.log(
      `   Student: ${stajRecord.student?.name} ${stajRecord.student?.surname} (${stajRecord.student?.number})`
    );
    console.log(
      `   Teacher: ${stajRecord.teacher?.name} ${
        stajRecord.teacher?.surname
      } (${stajRecord.teacher?.email || "No email"})`
    );
    console.log(`   Company: ${stajRecord.company?.name}`);
    console.log(`   Status: ${stajRecord.status}`);
    console.log(
      `   Start: ${stajRecord.startDate?.toISOString().split("T")[0]}`
    );
    console.log(`   End: ${stajRecord.endDate?.toISOString().split("T")[0]}`);
    console.log(
      `   Termination: ${
        stajRecord.terminationDate?.toISOString().split("T")[0] || "N/A"
      }`
    );
    console.log(
      `   Education Year: ${stajRecord.educationYear?.year} (Active: ${stajRecord.educationYear?.active})`
    );

    const teacherId = stajRecord.teacherId;
    const companyId = stajRecord.companyId;
    const studentId = stajRecord.studentId;

    if (!teacherId) {
      console.log("❌ No teacher assigned to this internship");
      return;
    }

    console.log("\n🔍 TEACHER ASSIGNMENT HISTORY CHECK:");
    console.log("─".repeat(50));

    // Check teacher assignment history for this company
    const teacherAssignmentHistory =
      await prisma.teacherAssignmentHistory.findMany({
        where: {
          OR: [
            { companyId: companyId, teacherId: teacherId },
            { companyId: companyId, previousTeacherId: teacherId },
          ],
        },
        include: {
          teacher: {
            select: {
              name: true,
              surname: true,
            },
          },
          previousTeacher: {
            select: {
              name: true,
              surname: true,
            },
          },
          company: {
            select: {
              name: true,
            },
          },
        },
        orderBy: { assignedAt: "desc" },
      });

    console.log(
      `Teacher Assignment History Records: ${teacherAssignmentHistory.length} found`
    );
    if (teacherAssignmentHistory.length > 0) {
      teacherAssignmentHistory.forEach((assignment, i) => {
        console.log(
          `   ${i + 1}. ${assignment.assignedAt?.toISOString().split("T")[0]}`
        );
        console.log(
          `      Current Teacher: ${assignment.teacher?.name || "N/A"} ${
            assignment.teacher?.surname || "N/A"
          }`
        );
        console.log(
          `      Previous Teacher: ${
            assignment.previousTeacher?.name || "N/A"
          } ${assignment.previousTeacher?.surname || "N/A"}`
        );
        console.log(`      Reason: ${assignment.reason || "N/A"}`);
      });
    } else {
      console.log(
        "   ❌ No teacher assignment history found for this company-teacher combination"
      );
    }

    console.log("\n🔍 TEACHER PANEL DATA LOGIC SIMULATION:");
    console.log("─".repeat(50));

    // Simulate what teacher panel would show - check the actual logic
    // This simulates how teacher panel retrieves students
    const teacherPanelStudents = await prisma.staj.findMany({
      where: {
        teacherId: teacherId,
        archived: false,
        educationYear: {
          active: true,
        },
      },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            surname: true,
            number: true,
            className: true,
          },
        },
        company: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: [{ status: "asc" }, { student: { name: "asc" } }],
    });

    console.log(
      `Teacher panel would show ${teacherPanelStudents.length} students:`
    );
    teacherPanelStudents.forEach((staj, i) => {
      const isElif = staj.studentId === studentId;
      console.log(
        `   ${i + 1}. ${staj.student?.name} ${staj.student?.surname} (${
          staj.student?.number
        }) - ${staj.status} ${isElif ? "← ELİF" : ""}`
      );
      console.log(`      Company: ${staj.company?.name}`);
      console.log(
        `      Dates: ${staj.startDate?.toISOString().split("T")[0]} → ${
          staj.endDate?.toISOString().split("T")[0]
        }`
      );
    });

    const elifInTeacherPanel = teacherPanelStudents.find(
      (s) => s.studentId === studentId
    );

    console.log("\n💡 TEACHER PANEL ISSUE ANALYSIS:");
    console.log("─".repeat(50));

    if (!elifInTeacherPanel) {
      console.log(
        "❌ PROBLEM IDENTIFIED: Elif does NOT appear in teacher panel"
      );
      console.log("\nPossible reasons:");
      console.log(
        "1. Education Year Filter - teacher panel only shows active education year"
      );
      console.log(
        `   Elif's education year active: ${stajRecord.educationYear?.active}`
      );
      console.log(
        "2. Archived Status - teacher panel filters out archived internships"
      );
      console.log(`   Elif's internship archived: ${stajRecord.archived}`);
      console.log(
        "3. Teacher Assignment - maybe teacher assignment was changed"
      );
      console.log(`   Current teacher ID: ${stajRecord.teacherId}`);
      console.log(`   Expected teacher ID: ${teacherId}`);

      if (!stajRecord.educationYear?.active) {
        console.log("\n🚨 ROOT CAUSE: Education year is not active!");
        console.log(
          "   Teacher panel logic filters by active education year only."
        );
        console.log("   If education year is inactive, students won't appear.");
      }
    } else {
      console.log("✅ Elif DOES appear in teacher panel simulation");
      console.log(
        "   The issue might be in the frontend filtering or different query logic"
      );
    }

    // Check education year status
    console.log("\n🔍 EDUCATION YEAR STATUS CHECK:");
    console.log("─".repeat(50));

    const allEducationYears = await prisma.egitimYili.findMany({
      orderBy: { year: "desc" },
    });

    console.log("All Education Years:");
    allEducationYears.forEach((year, i) => {
      const isElifsYear = year.id === stajRecord.educationYearId;
      console.log(
        `   ${i + 1}. ${year.year} - Active: ${year.active} - Archived: ${
          year.archived
        } ${isElifsYear ? "← ELIF'S YEAR" : ""}`
      );
    });
  } catch (error) {
    console.error("❌ Error:", error.message);
    console.error("Stack:", error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

investigateTeacherHistory();
