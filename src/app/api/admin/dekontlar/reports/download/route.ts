import { NextResponse } from "next/server";
import { validateAuthAndRole } from "@/middleware/auth";
import { prisma } from "@/lib/prisma";
import * as XLSX from "xlsx";

const MONTHS = [
  "Ocak",
  "Şubat",
  "Mart",
  "Nisan",
  "Mayıs",
  "Haziran",
  "Temmuz",
  "Ağustos",
  "Eylül",
  "Ekim",
  "Kasım",
  "Aralık",
];

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

    // Get all internships for this period to include students without dekonts
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

    // Create teacher-based grouping
    const teacherMap = new Map<
      string,
      {
        teacherName: string;
        students: Array<{
          name: string;
          studentId: string;
          hasDekont: boolean;
          dekontStatus?: string;
          uploadDate?: string;
          amount?: number;
        }>;
        stats: {
          totalStudents: number;
          studentsWithDekont: number;
          pendingDekonts: number;
          approvedDekonts: number;
          rejectedDekonts: number;
          missingDekonts: number;
          uploadRate: number;
        };
      }
    >();

    // Process all internships first
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
          students: [],
          stats: {
            totalStudents: 0,
            studentsWithDekont: 0,
            pendingDekonts: 0,
            approvedDekonts: 0,
            rejectedDekonts: 0,
            missingDekonts: 0,
            uploadRate: 0,
          },
        });
      }

      const teacher = teacherMap.get(teacherName)!;
      // Check if student is already added (avoid duplicates)
      const existingStudent = teacher.students.find(
        (s) => s.studentId === internship.studentId
      );
      if (!existingStudent) {
        teacher.students.push({
          name: studentName,
          studentId: internship.studentId,
          hasDekont: false,
        });
      }
    }

    // Now add dekont information
    for (const dekont of dekontlar) {
      const teacherName = dekont.company?.teacher
        ? `${dekont.company.teacher.name} ${dekont.company.teacher.surname}`
        : dekont.staj?.teacher
        ? `${dekont.staj.teacher.name} ${dekont.staj.teacher.surname}`
        : dekont.teacher
        ? `${dekont.teacher.name} ${dekont.teacher.surname}`
        : "Bilinmiyor";

      if (teacherMap.has(teacherName) && dekont.staj?.studentId) {
        const teacher = teacherMap.get(teacherName)!;
        const student = teacher.students.find(
          (s) => s.studentId === dekont.staj!.studentId
        );
        if (student) {
          student.hasDekont = true;
          student.dekontStatus =
            dekont.status === "PENDING"
              ? "Beklemede"
              : dekont.status === "APPROVED"
              ? "Onaylandı"
              : "Reddedildi";
          student.uploadDate = dekont.createdAt.toLocaleDateString("tr-TR");
          // Note: Amount is encrypted, we're not decrypting it for reports
        }
      }
    }

    // Calculate statistics for each teacher
    for (const [teacherName, data] of teacherMap.entries()) {
      const totalStudents = data.students.length;
      const studentsWithDekont = data.students.filter(
        (s) => s.hasDekont
      ).length;
      const pendingDekonts = data.students.filter(
        (s) => s.dekontStatus === "Beklemede"
      ).length;
      const approvedDekonts = data.students.filter(
        (s) => s.dekontStatus === "Onaylandı"
      ).length;
      const rejectedDekonts = data.students.filter(
        (s) => s.dekontStatus === "Reddedildi"
      ).length;
      const missingDekonts = totalStudents - studentsWithDekont;
      const uploadRate =
        totalStudents > 0 ? (studentsWithDekont / totalStudents) * 100 : 0;

      data.stats = {
        totalStudents,
        studentsWithDekont,
        pendingDekonts,
        approvedDekonts,
        rejectedDekonts,
        missingDekonts,
        uploadRate,
      };
    }

    // Create Excel workbook
    const wb = XLSX.utils.book_new();

    // Create summary worksheet
    const summaryData = [
      ["Öğretmen Bazlı Dekont Raporu", "", "", "", "", "", "", ""],
      [`Dönem: ${MONTHS[monthInt - 1]} ${yearInt}`, "", "", "", "", "", "", ""],
      [
        "Rapor Tarihi:",
        new Date().toLocaleDateString("tr-TR"),
        "",
        "",
        "",
        "",
        "",
        "",
      ],
      ["", "", "", "", "", "", "", ""],
      [
        "Öğretmen",
        "Toplam Öğrenci",
        "Dekont Yüklenen",
        "Onaylanan",
        "Beklemede",
        "Reddedilen",
        "Eksik",
        "Yükleme Oranı (%)",
      ],
    ];

    // Sort teachers by upload rate (ascending) to show problematic ones first
    const sortedTeachers = Array.from(teacherMap.entries()).sort(
      ([, a], [, b]) => a.stats.uploadRate - b.stats.uploadRate
    );

    for (const [teacherName, data] of sortedTeachers) {
      summaryData.push([
        teacherName,
        data.stats.totalStudents,
        data.stats.studentsWithDekont,
        data.stats.approvedDekonts,
        data.stats.pendingDekonts,
        data.stats.rejectedDekonts,
        data.stats.missingDekonts,
        Math.round(data.stats.uploadRate * 100) / 100,
      ]);
    }

    // Add overall totals
    const totalStudentsOverall = Array.from(teacherMap.values()).reduce(
      (sum: number, teacher: any) => sum + teacher.stats.totalStudents,
      0
    );
    const totalWithDekontOverall = Array.from(teacherMap.values()).reduce(
      (sum: number, teacher: any) => sum + teacher.stats.studentsWithDekont,
      0
    );
    const totalApprovedOverall = Array.from(teacherMap.values()).reduce(
      (sum: number, teacher: any) => sum + teacher.stats.approvedDekonts,
      0
    );
    const totalPendingOverall = Array.from(teacherMap.values()).reduce(
      (sum: number, teacher: any) => sum + teacher.stats.pendingDekonts,
      0
    );
    const totalRejectedOverall = Array.from(teacherMap.values()).reduce(
      (sum: number, teacher: any) => sum + teacher.stats.rejectedDekonts,
      0
    );
    const totalMissingOverall = Array.from(teacherMap.values()).reduce(
      (sum: number, teacher: any) => sum + teacher.stats.missingDekonts,
      0
    );
    const overallUploadRate =
      totalStudentsOverall > 0
        ? (totalWithDekontOverall / totalStudentsOverall) * 100
        : 0;

    summaryData.push(["", "", "", "", "", "", "", ""]);
    summaryData.push([
      "TOPLAM",
      totalStudentsOverall,
      totalWithDekontOverall,
      totalApprovedOverall,
      totalPendingOverall,
      totalRejectedOverall,
      totalMissingOverall,
      Math.round(overallUploadRate * 100) / 100,
    ]);

    const summaryWs = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, summaryWs, "Özet Rapor");

    // Create detailed worksheet for each teacher
    for (const [teacherName, data] of sortedTeachers) {
      const detailData: (string | number)[][] = [
        [`Öğretmen: ${teacherName}`, "", "", ""],
        [`Dönem: ${MONTHS[monthInt - 1]} ${yearInt}`, "", "", ""],
        ["", "", "", ""],
        ["Öğrenci", "Dekont Durumu", "Yükleme Tarihi", "Durum"],
      ];

      // Sort students: those without dekonts first, then by upload date
      const sortedStudents = [...data.students].sort((a, b) => {
        if (!a.hasDekont && b.hasDekont) return -1;
        if (a.hasDekont && !b.hasDekont) return 1;
        if (a.uploadDate && b.uploadDate) {
          return (
            new Date(a.uploadDate).getTime() - new Date(b.uploadDate).getTime()
          );
        }
        return a.name.localeCompare(b.name, "tr");
      });

      for (const student of sortedStudents) {
        detailData.push([
          student.name,
          student.hasDekont ? "Var" : "YOK",
          student.uploadDate || "-",
          student.dekontStatus || "-",
        ]);
      }

      // Add teacher summary at the end
      detailData.push(["", "", "", ""]);
      detailData.push(["İSTATİSTİKLER:", "", "", ""]);
      detailData.push(["Toplam Öğrenci:", data.stats.totalStudents, "", ""]);
      detailData.push([
        "Dekont Yüklenen:",
        data.stats.studentsWithDekont,
        "",
        "",
      ]);
      detailData.push(["Onaylanan:", data.stats.approvedDekonts, "", ""]);
      detailData.push(["Beklemede:", data.stats.pendingDekonts, "", ""]);
      detailData.push(["Reddedilen:", data.stats.rejectedDekonts, "", ""]);
      detailData.push(["Eksik:", data.stats.missingDekonts, "", ""]);
      detailData.push([
        "Yükleme Oranı (%):",
        Math.round(data.stats.uploadRate * 100) / 100,
        "",
        "",
      ]);

      const detailWs = XLSX.utils.aoa_to_sheet(detailData);

      // Clean teacher name for sheet name (Excel has limitations)
      const cleanTeacherName = teacherName
        .replace(/[çÇ]/g, "c")
        .replace(/[ğĞ]/g, "g")
        .replace(/[ıİ]/g, "i")
        .replace(/[öÖ]/g, "o")
        .replace(/[şŞ]/g, "s")
        .replace(/[üÜ]/g, "u")
        .replace(/[^a-zA-Z0-9\s]/g, "")
        .substring(0, 31); // Excel sheet name limit

      XLSX.utils.book_append_sheet(wb, detailWs, cleanTeacherName);
    }

    // Generate Excel buffer
    const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "buffer" });

    // Create filename
    const filename = `dekont-raporu-${MONTHS[monthInt - 1]}-${yearInt}-${
      new Date().toISOString().split("T")[0]
    }.xlsx`;

    // Return as downloadable file
    return new NextResponse(excelBuffer, {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": excelBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error("Excel download error:", error);
    return NextResponse.json({ error: "Rapor indirilemedi" }, { status: 500 });
  }
}
