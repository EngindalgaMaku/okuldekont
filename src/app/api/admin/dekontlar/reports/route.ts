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

    // Get all dekontlar for the specified month/year with related data
    const dekontlar = await prisma.dekont.findMany({
      where: {
        month: monthInt,
        year: yearInt,
        archived: false,
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

    // Get all internships (stajlar) for this period to include students without dekonts
    const allInternships = await prisma.staj.findMany({
      where: {
        archived: false,
        OR: [
          {
            startDate: {
              lte: new Date(yearInt, monthInt, 0), // End of the month
            },
            endDate: {
              gte: new Date(yearInt, monthInt - 1, 1), // Start of the month
            },
          },
        ],
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

    // Create a map to group by teachers
    const teacherMap = new Map<
      string,
      {
        teacherName: string;
        students: Set<string>;
        dekonts: Array<{
          studentName: string;
          status: "PENDING" | "APPROVED" | "REJECTED";
          hasFile: boolean;
        }>;
      }
    >();

    // Process all internships to get complete student list per teacher
    for (const internship of allInternships) {
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
          dekonts: [],
        });
      }

      const teacher = teacherMap.get(teacherName)!;
      teacher.students.add(`${studentName}_${internship.studentId}`); // Use ID to avoid duplicates
    }

    // Process dekontlar to add them to respective teachers
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

      if (teacherMap.has(teacherName)) {
        const teacher = teacherMap.get(teacherName)!;
        teacher.dekonts.push({
          studentName,
          status: dekont.status,
          hasFile: !!dekont.fileUrl,
        });
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
      const studentsWithDekont = data.dekonts.length;
      const pendingDekonts = data.dekonts.filter(
        (d: any) => d.status === "PENDING"
      ).length;
      const approvedDekonts = data.dekonts.filter(
        (d: any) => d.status === "APPROVED"
      ).length;
      const rejectedDekonts = data.dekonts.filter(
        (d: any) => d.status === "REJECTED"
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

    // Sort teachers by upload rate (ascending) to show problematic teachers first
    teacherReports.sort((a, b) => a.uploadRate - b.uploadRate);

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
