import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

// Use global Prisma instance to avoid connection issues
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

interface StudentData {
  tcNo?: string; // Optional since Excel doesn't have TC numbers
  name: string;
  surname: string;
  className: string;
  studentNumber: string;
  alanName: string;
  companyName: string;
  teacherName: string;
}

interface ExcelStudentRaw {
  className: string;
  studentNumber: number;
  alanName: string;
  fullName: string;
  teacherName: string;
  companyName: string;
}

interface ComparisonResult {
  newRecords: StudentData[];
  updatedRecords: { old: any; new: StudentData }[];
  removedRecords: any[];
}

export async function POST(request: NextRequest) {
  try {
    // Parse request body with error handling
    let excelStudents: StudentData[];
    try {
      const body = await request.json();
      excelStudents = body.excelStudents;
    } catch (parseError) {
      console.error("JSON parse error:", parseError);
      return NextResponse.json(
        { error: "Geçersiz JSON verisi gönderildi." },
        { status: 400 }
      );
    }

    if (!Array.isArray(excelStudents) || excelStudents.length === 0) {
      return NextResponse.json(
        { error: "Geçerli Excel verisi bulunamadı." },
        { status: 400 }
      );
    }

    console.log("Excel students received:", excelStudents.length);
    console.log("Sample Excel student:", excelStudents[0]);

    // Fetch Database data including active internships
    const dbStudents = await prisma.student.findMany({
      include: {
        company: true,
        alan: true,
        stajlar: {
          where: {
            status: "ACTIVE",
          },
          include: {
            company: {
              include: {
                teacher: true,
              },
            },
          },
        },
      },
    });

    const dbCompanies = await prisma.companyProfile.findMany({
      include: {
        teacher: true,
      },
    });

    console.log("Database students found:", dbStudents.length);
    console.log("Database companies found:", dbCompanies.length);

    // Helper function to normalize names for comparison
    const normalizeName = (name: string) =>
      name
        ?.toLowerCase()
        .replace(/[^a-zçğıöşü]/gi, "")
        .trim() || "";

    // Helper function to create matching key (since we don't have TC numbers)
    const createMatchingKey = (
      name: string,
      surname: string,
      studentNumber: string,
      className: string
    ) => {
      const normalizedName = normalizeName(`${name} ${surname}`);
      const normalizedClass =
        className?.replace(/[^a-z0-9]/gi, "").toLowerCase() || "";
      return `${normalizedName}_${studentNumber}_${normalizedClass}`;
    };

    // Create maps for efficient lookups using alternative matching
    const dbStudentMatchMap = new Map();
    const dbCompanyMap = new Map(
      dbCompanies.map((c) => [c.name.toLowerCase().trim(), c])
    );

    // Create database student lookup with multiple matching strategies
    dbStudents.forEach((student) => {
      // Primary key: name + number + class
      const primaryKey = createMatchingKey(
        student.name,
        student.surname,
        student.number || "",
        student.className
      );
      dbStudentMatchMap.set(primaryKey, student);

      // Alternative key: just name + number (for class variations)
      const altKey = `${normalizeName(`${student.name} ${student.surname}`)}_${
        student.number
      }`;
      if (!dbStudentMatchMap.has(altKey)) {
        dbStudentMatchMap.set(altKey, student);
      }
    });

    const newRecords: StudentData[] = [];
    const removedRecords: any[] = [];
    const updatedRecords: { old: any; new: StudentData }[] = [];

    // Process Excel students and compare with database
    excelStudents.forEach((excelStudent) => {
      // Try primary matching
      const primaryKey = createMatchingKey(
        excelStudent.name,
        excelStudent.surname,
        excelStudent.studentNumber,
        excelStudent.className
      );

      // Try alternative matching
      const altKey = `${normalizeName(
        `${excelStudent.name} ${excelStudent.surname}`
      )}_${excelStudent.studentNumber}`;

      let dbStudent =
        dbStudentMatchMap.get(primaryKey) || dbStudentMatchMap.get(altKey);

      if (!dbStudent) {
        // This is a new record - student not found in database
        newRecords.push(excelStudent);
        console.log(
          "New student:",
          `${excelStudent.name} ${excelStudent.surname} (${excelStudent.studentNumber})`
        );
      } else {
        // Student found - check for changes
        let isUpdated = false;
        const changes: any = {};

        // Get current internship assignment
        const activeInternship = dbStudent.stajlar?.find(
          (staj: any) => staj.status === "ACTIVE"
        );
        const currentCompanyName =
          activeInternship?.company?.name || dbStudent.company?.name;
        const currentTeacherName = activeInternship?.company?.teacher
          ? `${activeInternship.company.teacher.name} ${activeInternship.company.teacher.surname}`.trim()
          : "";

        // Check if company assignment changed
        const normalizedExcelCompany =
          excelStudent.companyName?.toLowerCase().trim() || "";
        const normalizedCurrentCompany =
          currentCompanyName?.toLowerCase().trim() || "";

        if (
          normalizedExcelCompany !== normalizedCurrentCompany &&
          normalizedExcelCompany !== ""
        ) {
          isUpdated = true;
          changes.companyAssignment = {
            old: currentCompanyName,
            new: excelStudent.companyName,
            type: "internship_company",
          };
        }

        // Check if teacher assignment changed
        const normalizedExcelTeacher =
          excelStudent.teacherName?.toLowerCase().trim() || "";
        const normalizedCurrentTeacher = currentTeacherName
          .toLowerCase()
          .trim();

        if (
          normalizedExcelTeacher !== normalizedCurrentTeacher &&
          normalizedExcelTeacher !== ""
        ) {
          isUpdated = true;
          changes.teacherAssignment = {
            old: currentTeacherName,
            new: excelStudent.teacherName,
            type: "coordinating_teacher",
          };
        }

        // Check if class changed
        const normalizedExcelClass =
          excelStudent.className?.replace(/[^a-z0-9]/gi, "").toLowerCase() ||
          "";
        const normalizedDbClass =
          dbStudent.className?.replace(/[^a-z0-9]/gi, "").toLowerCase() || "";

        if (
          normalizedExcelClass !== normalizedDbClass &&
          normalizedExcelClass !== ""
        ) {
          isUpdated = true;
          changes.className = {
            old: dbStudent.className,
            new: excelStudent.className,
          };
        }

        // Check if name changed (minor variations)
        const dbFullName = `${dbStudent.name} ${dbStudent.surname}`
          .toLowerCase()
          .trim();
        const excelFullName = `${excelStudent.name} ${excelStudent.surname}`
          .toLowerCase()
          .trim();

        if (dbFullName !== excelFullName) {
          const normalizedDbName = normalizeName(dbFullName);
          const normalizedExcelName = normalizeName(excelFullName);

          if (normalizedDbName !== normalizedExcelName) {
            isUpdated = true;
            changes.name = {
              old: `${dbStudent.name} ${dbStudent.surname}`,
              new: `${excelStudent.name} ${excelStudent.surname}`,
            };
          }
        }

        // Check if student number changed
        if (dbStudent.number !== excelStudent.studentNumber) {
          isUpdated = true;
          changes.studentNumber = {
            old: dbStudent.number,
            new: excelStudent.studentNumber,
          };
        }

        if (isUpdated) {
          updatedRecords.push({
            old: {
              ...dbStudent,
              companyName: currentCompanyName,
              teacherName: currentTeacherName,
              fullName: `${dbStudent.name} ${dbStudent.surname}`,
              internshipId: activeInternship?.id,
              changes: Object.keys(changes),
            },
            new: excelStudent,
          });
        }
      }
    });

    // Find students in database who are not in Excel (potentially removed/terminated)
    // Only flag as removed if they have active internships but are missing from Excel
    const excelStudentKeys = new Set();
    excelStudents.forEach((excelStudent) => {
      const primaryKey = createMatchingKey(
        excelStudent.name,
        excelStudent.surname,
        excelStudent.studentNumber,
        excelStudent.className
      );
      excelStudentKeys.add(primaryKey);

      const altKey = `${normalizeName(
        `${excelStudent.name} ${excelStudent.surname}`
      )}_${excelStudent.studentNumber}`;
      excelStudentKeys.add(altKey);
    });

    dbStudents.forEach((dbStudent) => {
      if (dbStudent.stajlar?.some((staj: any) => staj.status === "ACTIVE")) {
        const primaryKey = createMatchingKey(
          dbStudent.name,
          dbStudent.surname,
          dbStudent.number || "",
          dbStudent.className
        );
        const altKey = `${normalizeName(
          `${dbStudent.name} ${dbStudent.surname}`
        )}_${dbStudent.number}`;

        if (
          !excelStudentKeys.has(primaryKey) &&
          !excelStudentKeys.has(altKey)
        ) {
          const activeInternship = dbStudent.stajlar.find(
            (staj: any) => staj.status === "ACTIVE"
          );
          removedRecords.push({
            ...dbStudent,
            companyName:
              activeInternship?.company?.name || dbStudent.company?.name,
            fullName: `${dbStudent.name} ${dbStudent.surname}`,
            internshipId: activeInternship?.id,
            reason: "missing_from_excel",
          });
        }
      }
    });

    const result: ComparisonResult = {
      newRecords,
      updatedRecords,
      removedRecords,
    };

    console.log("Comparison results:", {
      new: newRecords.length,
      updated: updatedRecords.length,
      removed: removedRecords.length,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Students comparison error:", error);

    // Handle specific error types
    if (error instanceof Error) {
      return NextResponse.json(
        { error: `Veritabanı karşılaştırma hatası: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        error:
          "Veritabanı karşılaştırma sırasında beklenmeyen bir hata oluştu.",
      },
      { status: 500 }
    );
  } finally {
    // No need to disconnect in serverless environments
    // await prisma.$disconnect();
  }
}

// Handle other HTTP methods
export async function GET() {
  return NextResponse.json(
    { error: "Bu endpoint yalnızca POST isteklerini kabul eder." },
    { status: 405 }
  );
}

export async function PUT() {
  return NextResponse.json(
    { error: "Bu endpoint yalnızca POST isteklerini kabul eder." },
    { status: 405 }
  );
}

export async function DELETE() {
  return NextResponse.json(
    { error: "Bu endpoint yalnızca POST isteklerini kabul eder." },
    { status: 405 }
  );
}
