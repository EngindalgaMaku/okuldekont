import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");

    // Get all classes
    if (action === "classes") {
      const classes = await prisma.class.findMany({
        include: {
          alan: true,
          _count: {
            select: {
              students: true,
            },
          },
        },
        orderBy: [
          {
            alan: {
              name: "asc",
            },
          },
          {
            name: "asc",
          },
        ],
      });

      const formattedClasses = classes.map((cls) => ({
        id: cls.id,
        name: cls.name,
        alanName: cls.alan.name,
        studentCount: cls._count.students,
        fullName: `${cls.name} (${cls.alan.name})`,
      }));

      return NextResponse.json({ classes: formattedClasses });
    }

    // Get students by class with dekont status
    if (action === "students") {
      const classId = searchParams.get("classId");
      const month = searchParams.get("month");
      const year = searchParams.get("year");

      if (!classId) {
        return NextResponse.json(
          { error: "Class ID is required" },
          { status: 400 }
        );
      }

      // Get class info
      const classInfo = await prisma.class.findUnique({
        where: { id: classId },
        include: {
          alan: true,
        },
      });

      if (!classInfo) {
        return NextResponse.json({ error: "Class not found" }, { status: 404 });
      }

      // Build where condition for students
      const studentWhere: any = {
        classId: classId,
      };

      // Get students in the class
      const students = await prisma.student.findMany({
        where: studentWhere,
        include: {
          company: {
            include: {
              teacher: true,
            },
          },
          dekontlar:
            month && year
              ? {
                  where: {
                    month: parseInt(month),
                    year: parseInt(year),
                  },
                  include: {
                    teacher: true,
                  },
                  orderBy: {
                    createdAt: "desc",
                  },
                }
              : false,
          alan: true,
        },
        orderBy: [
          {
            name: "asc",
          },
          {
            surname: "asc",
          },
        ],
      });

      const formattedStudents = students.map((student) => {
        const hasDekont = Array.isArray(student.dekontlar)
          ? student.dekontlar.length > 0
          : false;
        const latestDekont =
          Array.isArray(student.dekontlar) && student.dekontlar.length > 0
            ? student.dekontlar[0]
            : null;

        return {
          id: student.id,
          name: student.name,
          surname: student.surname,
          number: student.number,
          fullName: `${student.name} ${student.surname}`,
          className: student.className,
          company: student.company
            ? {
                id: student.company.id,
                name: student.company.name,
                teacher: student.company.teacher
                  ? {
                      name: student.company.teacher.name,
                      surname: student.company.teacher.surname,
                    }
                  : null,
              }
            : null,
          hasDekont: hasDekont,
          dekontStatus: latestDekont ? latestDekont.status : null,
          dekontAmount: latestDekont ? latestDekont.amount : null,
          dekontCreatedAt: latestDekont ? latestDekont.createdAt : null,
          dekontApprovedAt: latestDekont ? latestDekont.approvedAt : null,
          dekontCount: Array.isArray(student.dekontlar)
            ? student.dekontlar.length
            : 0,
        };
      });

      // Calculate summary statistics
      const summary = {
        totalStudents: formattedStudents.length,
        studentsWithDekont: formattedStudents.filter((s) => s.hasDekont).length,
        studentsWithoutDekont: formattedStudents.filter((s) => !s.hasDekont)
          .length,
        studentsWithCompany: formattedStudents.filter((s) => s.company).length,
        studentsWithoutCompany: formattedStudents.filter((s) => !s.company)
          .length,
        pendingDekonts: formattedStudents.filter(
          (s) => s.dekontStatus === "PENDING"
        ).length,
        approvedDekonts: formattedStudents.filter(
          (s) => s.dekontStatus === "APPROVED"
        ).length,
        rejectedDekonts: formattedStudents.filter(
          (s) => s.dekontStatus === "REJECTED"
        ).length,
        totalDekontCount: formattedStudents.reduce(
          (total, s) => total + s.dekontCount,
          0
        ),
      };

      return NextResponse.json({
        classInfo: {
          id: classInfo.id,
          name: classInfo.name,
          alanName: classInfo.alan.name,
          fullName: `${classInfo.name} (${classInfo.alan.name})`,
        },
        students: formattedStudents,
        summary,
        filters: {
          month: month ? parseInt(month) : null,
          year: year ? parseInt(year) : null,
        },
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Class reports API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
