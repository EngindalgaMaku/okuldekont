import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("🔍 DEBUG: Checking monthly payments data...");

    // Check if monthly_payments table exists and has data
    let monthlyPaymentsCount = 0;
    let monthlyPaymentsData = [];

    try {
      const result = await prisma.$queryRaw`
        SELECT COUNT(*) as count FROM monthly_payments
      `;
      monthlyPaymentsCount = (result as any)[0]?.count || 0;

      if (monthlyPaymentsCount > 0) {
        monthlyPaymentsData = (await prisma.$queryRaw`
          SELECT mp.*,
                 s.name as studentName,
                 s.surname as studentSurname,
                 s.className,
                 s.number as studentNumber
          FROM monthly_payments mp
          LEFT JOIN students s ON mp.studentId = s.id
          ORDER BY mp.importedAt DESC
          LIMIT 10
        `) as any[];
      }
    } catch (error) {
      console.error("Monthly payments table error:", error);
      return NextResponse.json({
        error: "Monthly payments table not found",
        details: error,
        tableExists: false,
      });
    }

    // Check students table
    const studentsCount = await prisma.student.count();

    // Check dekontlar with student info
    const dekontlarWithStudents = await prisma.dekont.findMany({
      where: {
        month: 9, // September
        year: 2025,
      },
      include: {
        staj: {
          include: {
            student: {
              select: {
                id: true,
                name: true,
                surname: true,
                className: true,
                number: true,
              },
            },
          },
        },
      },
      take: 5,
    });

    return NextResponse.json({
      success: true,
      debug: {
        monthlyPaymentsCount,
        studentsCount,
        dekontlarCount: dekontlarWithStudents.length,
        sampleMonthlyPayments: monthlyPaymentsData,
        sampleDekontlar: dekontlarWithStudents.map((d) => ({
          id: d.id,
          month: d.month,
          year: d.year,
          studentId: d.staj?.student?.id,
          studentName: d.staj?.student
            ? `${d.staj.student.name} ${d.staj.student.surname}`
            : "N/A",
          className: d.staj?.student?.className,
          studentNumber: d.staj?.student?.number,
        })),
      },
    });
  } catch (error) {
    console.error("Debug payments error:", error);
    return NextResponse.json(
      {
        error: "Debug sırasında hata oluştu",
        details: error,
      },
      { status: 500 }
    );
  }
}
