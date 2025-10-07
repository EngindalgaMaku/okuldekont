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

      // Build where condition for students - try both classId and className
      // First get class name to match with className field
      const selectedClass = await prisma.class.findUnique({
        where: { id: classId },
        include: { alan: true },
      });

      if (!selectedClass) {
        return NextResponse.json({ error: "Class not found" }, { status: 404 });
      }

      const possibleClassNames = [
        selectedClass.name,
        `${selectedClass.name} (${selectedClass.alan.name})`,
        `${selectedClass.name} ${selectedClass.alan.name}`,
        selectedClass.name.toUpperCase(),
        selectedClass.name.toLowerCase(),
      ];

      console.log("Searching for students with classId:", classId);
      console.log("Possible className matches:", possibleClassNames);

      // Get students in the class using both classId and className
      const students = await prisma.student.findMany({
        where: {
          OR: [
            { classId: classId },
            { className: { in: possibleClassNames } },
            { className: { contains: selectedClass.name } },
          ],
        },
        include: {
          company: {
            include: {
              teacher: true,
            },
          },
          stajlar: {
            where: {
              status: "ACTIVE", // Get active internships
            },
            include: {
              company: {
                include: {
                  teacher: true,
                },
              },
            },
            orderBy: {
              createdAt: "desc",
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

      console.log(
        `Found ${students.length} students for class ${classId} (${selectedClass.name})`
      );
      console.log(
        "Student details:",
        students.map((s) => ({
          id: s.id,
          name: s.name,
          surname: s.surname,
          number: s.number,
          className: s.className,
          classId: s.classId,
          directCompanyId: s.companyId,
          directCompanyName: s.company?.name || null,
          activeStajCount: Array.isArray(s.stajlar) ? s.stajlar.length : 0,
          activeStajCompany:
            Array.isArray(s.stajlar) && s.stajlar.length > 0
              ? s.stajlar[0].company?.name
              : null,
          finalCompany:
            (Array.isArray(s.stajlar) && s.stajlar.length > 0
              ? s.stajlar[0].company?.name
              : s.company?.name) || "No Company",
          dekontCount: Array.isArray(s.dekontlar) ? s.dekontlar.length : 0,
        }))
      );

      const formattedStudents = students.map((student) => {
        const hasDekont = Array.isArray(student.dekontlar)
          ? student.dekontlar.length > 0
          : false;
        const latestDekont =
          Array.isArray(student.dekontlar) && student.dekontlar.length > 0
            ? student.dekontlar[0]
            : null;

        // Get company info from active internship or direct company relation
        const activeStaj =
          Array.isArray(student.stajlar) && student.stajlar.length > 0
            ? student.stajlar[0]
            : null;

        const companyInfo = activeStaj?.company || student.company;

        return {
          id: student.id,
          name: student.name,
          surname: student.surname,
          number: student.number,
          fullName: `${student.name} ${student.surname}`,
          className: student.className,
          company: companyInfo
            ? {
                id: companyInfo.id,
                name: companyInfo.name,
                companyType: companyInfo.companyType, // PRIVATE or GOVERNMENT
                teacher: companyInfo.teacher
                  ? {
                      name: companyInfo.teacher.name,
                      surname: companyInfo.teacher.surname,
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

      // Sort students by student number numerically
      formattedStudents.sort((a, b) => {
        const numA = parseInt(a.number || "0");
        const numB = parseInt(b.number || "0");

        // If numbers are equal, sort by name
        if (numA === numB) {
          return a.fullName.localeCompare(b.fullName, "tr");
        }

        return numA - numB;
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
