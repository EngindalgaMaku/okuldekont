import { NextResponse } from "next/server";
import { validateAuthAndRole } from "@/middleware/auth";
import { prisma } from "@/lib/prisma";

interface TeacherReportData {
  teacherName: string;
  totalStudents: number;
  studentsWithDekont: number;
  pendingDekonts: number;
  approvedDekonts: number;
  rejectedDekonts: number;
  missingDekonts: number;
  uploadRate: number;
}

interface MonthlyReport {
  month: number;
  year: number;
  teacherReports: TeacherReportData[];
  totalStats: {
    totalStudents: number;
    totalWithDekont: number;
    totalPending: number;
    totalApproved: number;
    totalRejected: number;
    totalMissing: number;
    overallUploadRate: number;
  };
}

export async function GET(request: Request) {
  const authResult = await validateAuthAndRole(request, [
    "ADMIN",
    "SUPER_ADMIN",
  ]);
  if (!authResult.success) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const month = searchParams.get("month");
    const year = searchParams.get("year");

    if (!month || !year) {
      return NextResponse.json(
        { error: "Month and year parameters are required" },
        { status: 400 }
      );
    }

    const monthInt = parseInt(month);
    const yearInt = parseInt(year);

    if (isNaN(monthInt) || isNaN(yearInt) || monthInt < 1 || monthInt > 12) {
      return NextResponse.json(
        { error: "Invalid month or year" },
        { status: 400 }
      );
    }

    // First get all private companies using raw SQL approach as a fallback
    const privateCompanies = await prisma.$queryRaw<{ id: string }[]>`
      SELECT id FROM companies WHERE companyType = 'PRIVATE'
    `;
    const privateCompanyIds = privateCompanies.map((c) => c.id);

    // Get all dekontlar for the specified month/year with related data (ONLY from private companies)
    const dekontlar = await prisma.dekont.findMany({
      where: {
        month: monthInt,
        year: yearInt,
        archived: false,
        companyId: {
          in: privateCompanyIds, // Only include dekontlar from private companies
        },
      },
      include: {
        staj: {
          include: {
            student: {
              include: {
                alan: {
                  select: {
                    name: true,
                  },
                },
              },
            },
            company: {
              select: {
                name: true,
                contact: true,
              },
            },
            teacher: {
              select: {
                name: true,
                surname: true,
              },
            },
          },
        },
        company: {
          select: {
            name: true,
            contact: true,
            teacher: {
              select: {
                name: true,
                surname: true,
              },
            },
          },
        },
        teacher: {
          select: {
            name: true,
            surname: true,
          },
        },
      },
    });

    // Get all internships (stajlar) - ONLY from private companies (exclude government institutions)
    const allInternships = await prisma.staj.findMany({
      where: {
        archived: false,
        companyId: {
          in: privateCompanyIds, // Only include internships from private companies
        },
        // Include all active internships, not just those active in the selected month
        // This ensures consistency with the main dekont page count
      },
      include: {
        student: {
          include: {
            alan: {
              select: {
                name: true,
              },
            },
          },
        },
        company: {
          select: {
            name: true,
            contact: true,
            teacher: {
              select: {
                name: true,
                surname: true,
              },
            },
          },
        },
        teacher: {
          select: {
            name: true,
            surname: true,
          },
        },
      },
    });

    // Create a map to group by teachers with dekont deduplication
    const teacherMap = new Map<
      string,
      {
        teacherName: string;
        students: Set<string>;
        dekonts: Map<
          string,
          {
            // Use Map to deduplicate by student-month key
            studentName: string;
            studentId: string;
            status: "PENDING" | "APPROVED" | "REJECTED";
            hasFile: boolean;
          }
        >;
      }
    >();

    // Process all internships to get complete student list per teacher (ONLY private sector)
    for (const internship of allInternships) {
      // All internships are already filtered to be from private companies only

      const teacherName = internship.company?.teacher
        ? `${internship.company.teacher.name} ${internship.company.teacher.surname}`
        : internship.teacher
        ? `${internship.teacher.name} ${internship.teacher.surname}`
        : "Bilinmiyor";

      const studentName = internship.student
        ? `${internship.student.name} ${internship.student.surname}`
        : "Bilinmiyor";

      if (!teacherMap.has(teacherName)) {
        teacherMap.set(teacherName, {
          teacherName,
          students: new Set(),
          dekonts: new Map(), // Changed to Map for deduplication
        });
      }

      const teacher = teacherMap.get(teacherName)!;
      teacher.students.add(`${studentName}_${internship.studentId}`); // Use ID to avoid duplicates
    }

    // Process dekontlar to add them to respective teachers with DEDUPLICATION
    for (const dekont of dekontlar) {
      const teacherName = dekont.company?.teacher
        ? `${dekont.company.teacher.name} ${dekont.company.teacher.surname}`
        : dekont.staj?.teacher
        ? `${dekont.staj.teacher.name} ${dekont.staj.teacher.surname}`
        : dekont.teacher
        ? `${dekont.teacher.name} ${dekont.teacher.surname}`
        : "Bilinmiyor";

      const studentName = dekont.staj?.student
        ? `${dekont.staj.student.name} ${dekont.staj.student.surname}`
        : "Bilinmiyor";

      const studentId = dekont.staj?.studentId || dekont.studentId || "unknown";

      if (teacherMap.has(teacherName)) {
        const teacher = teacherMap.get(teacherName)!;

        // Create unique key for student-month combination to deduplicate
        const dekontKey = `${studentId}_${monthInt}_${yearInt}`;

        // Only count the first dekont per student per month (deduplication)
        if (!teacher.dekonts.has(dekontKey)) {
          teacher.dekonts.set(dekontKey, {
            studentName,
            studentId,
            status: dekont.status,
            hasFile: !!dekont.fileUrl,
          });
        } else {
          // If duplicate exists, update status to show the "best" status (approved > pending > rejected)
          const existing = teacher.dekonts.get(dekontKey)!;
          if (
            dekont.status === "APPROVED" ||
            (existing.status === "REJECTED" && dekont.status === "PENDING")
          ) {
            teacher.dekonts.set(dekontKey, {
              studentName,
              studentId,
              status: dekont.status,
              hasFile: !!dekont.fileUrl,
            });
          }
        }
      }
    }

    // Generate teacher reports
    const teacherReports: TeacherReportData[] = [];
    let totalStudentsOverall = 0;
    let totalWithDekontOverall = 0;
    let totalPendingOverall = 0;
    let totalApprovedOverall = 0;
    let totalRejectedOverall = 0;

    for (const [teacherName, data] of Array.from(teacherMap.entries())) {
      const totalStudents = data.students.size;
      const studentsWithDekont = data.dekonts.size; // Now using Map.size for deduplicated count
      const dekontArray = Array.from(data.dekonts.values()); // Convert Map to Array for filtering
      const pendingDekonts = dekontArray.filter(
        (d) => d.status === "PENDING"
      ).length;
      const approvedDekonts = dekontArray.filter(
        (d) => d.status === "APPROVED"
      ).length;
      const rejectedDekonts = dekontArray.filter(
        (d) => d.status === "REJECTED"
      ).length;
      const missingDekonts = totalStudents - studentsWithDekont;
      const uploadRate =
        totalStudents > 0 ? (studentsWithDekont / totalStudents) * 100 : 0;

      teacherReports.push({
        teacherName,
        totalStudents,
        studentsWithDekont,
        pendingDekonts,
        approvedDekonts,
        rejectedDekonts,
        missingDekonts,
        uploadRate,
      });

      // Add to overall totals
      totalStudentsOverall += totalStudents;
      totalWithDekontOverall += studentsWithDekont;
      totalPendingOverall += pendingDekonts;
      totalApprovedOverall += approvedDekonts;
      totalRejectedOverall += rejectedDekonts;
    }

    // Sort teachers by upload rate (descending) to show best performers first
    teacherReports.sort((a, b) => b.uploadRate - a.uploadRate);

    const totalMissingOverall = totalStudentsOverall - totalWithDekontOverall;
    const overallUploadRate =
      totalStudentsOverall > 0
        ? (totalWithDekontOverall / totalStudentsOverall) * 100
        : 0;

    const report: MonthlyReport = {
      month: monthInt,
      year: yearInt,
      teacherReports,
      totalStats: {
        totalStudents: totalStudentsOverall,
        totalWithDekont: totalWithDekontOverall,
        totalPending: totalPendingOverall,
        totalApproved: totalApprovedOverall,
        totalRejected: totalRejectedOverall,
        totalMissing: totalMissingOverall,
        overallUploadRate,
      },
    };

    return NextResponse.json(report);
  } catch (error) {
    console.error("Reports API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
