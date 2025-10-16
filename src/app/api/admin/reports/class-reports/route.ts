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

      const formattedClasses = classes
        .filter((cls) => cls._count.students > 0) // Only show classes with students
        .map((cls) => ({
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
            // Get all internships, not just active ones
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
          dekontlar: {
            where:
              month && year
                ? {
                    month: parseInt(month),
                    year: parseInt(year),
                  }
                : {},
            include: {
              teacher: true,
              staj: true, // Include internship info
            },
            orderBy: {
              createdAt: "desc",
            },
          },
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

      // Create student-internship combinations for better reporting
      const formattedStudents: any[] = [];

      students.forEach((student) => {
        const allStajlar = Array.isArray(student.stajlar)
          ? student.stajlar
          : [];

        // Debug for specific student
        if (student.name === "Pakize Sude" || student.surname === "Güneri") {
          console.log(`🔍 DEBUG - ${student.name} ${student.surname}:`, {
            studentId: student.id,
            totalStajlar: allStajlar.length,
            stajlar: allStajlar.map((s) => ({
              stajId: s.id,
              companyName: s.company?.name,
              startDate: s.startDate,
              endDate: s.endDate,
              status: s.status,
            })),
            totalDekontlar: Array.isArray(student.dekontlar)
              ? student.dekontlar.length
              : 0,
            dekontlar: Array.isArray(student.dekontlar)
              ? student.dekontlar.map((d) => ({
                  dekontId: d.id,
                  stajId: d.stajId,
                  amount: d.amount,
                  month: d.month,
                  year: d.year,
                  status: d.status,
                }))
              : [],
          });
        }

        // If student has internships, show each internship as separate row
        if (allStajlar.length > 0) {
          allStajlar.forEach((staj) => {
            // Filter dekontlar for this specific internship and time period
            const stajDekontlar = Array.isArray(student.dekontlar)
              ? student.dekontlar.filter(
                  (d) =>
                    d.stajId === staj.id &&
                    (!month ||
                      !year ||
                      (d.month === parseInt(month) &&
                        d.year === parseInt(year)))
                )
              : [];

            const latestDekont =
              stajDekontlar.length > 0 ? stajDekontlar[0] : null;

            // Debug for specific student
            if (
              student.name === "Pakize Sude" ||
              student.surname === "Güneri"
            ) {
              console.log(
                `🎯 Creating row for ${student.name} ${student.surname} - ${staj.company?.name}:`,
                {
                  stajId: staj.id,
                  companyName: staj.company?.name,
                  stajDekontlar: stajDekontlar.length,
                  latestDekontAmount: latestDekont?.amount,
                  dekontlarForThisStaj: stajDekontlar.map((d) => ({
                    id: d.id,
                    amount: d.amount,
                    status: d.status,
                  })),
                }
              );
            }

            formattedStudents.push({
              id: `${student.id}-${staj.id}`, // Unique ID for student-internship combo
              studentId: student.id,
              internshipId: staj.id,
              name: student.name,
              surname: student.surname,
              number: student.number,
              fullName: `${student.name} ${student.surname}`,
              className: student.className,
              company: staj.company
                ? {
                    id: staj.company.id,
                    name: staj.company.name,
                    companyType: staj.company.companyType,
                    teacher: staj.company.teacher
                      ? {
                          name: staj.company.teacher.name,
                          surname: staj.company.teacher.surname,
                        }
                      : null,
                  }
                : null,
              internshipPeriod: {
                startDate: staj.startDate,
                endDate: staj.endDate,
                status: staj.status,
              },
              hasDekont: stajDekontlar.length > 0,
              dekontStatus: latestDekont ? latestDekont.status : null,
              dekontAmount: latestDekont ? latestDekont.amount : null,
              dekontCreatedAt: latestDekont ? latestDekont.createdAt : null,
              dekontApprovedAt: latestDekont ? latestDekont.approvedAt : null,
              dekontCount: stajDekontlar.length,
            });
          });
        } else {
          // Student without internships - show with direct company assignment if exists
          const studentDekontlar = Array.isArray(student.dekontlar)
            ? student.dekontlar.filter(
                (d) =>
                  !month ||
                  !year ||
                  (d.month === parseInt(month) && d.year === parseInt(year))
              )
            : [];

          const latestDekont =
            studentDekontlar.length > 0 ? studentDekontlar[0] : null;

          formattedStudents.push({
            id: student.id,
            studentId: student.id,
            internshipId: null,
            name: student.name,
            surname: student.surname,
            number: student.number,
            fullName: `${student.name} ${student.surname}`,
            className: student.className,
            company: student.company
              ? {
                  id: student.company.id,
                  name: student.company.name,
                  companyType: student.company.companyType,
                  teacher: student.company.teacher
                    ? {
                        name: student.company.teacher.name,
                        surname: student.company.teacher.surname,
                      }
                    : null,
                }
              : null,
            internshipPeriod: null,
            hasDekont: studentDekontlar.length > 0,
            dekontStatus: latestDekont ? latestDekont.status : null,
            dekontAmount: latestDekont ? latestDekont.amount : null,
            dekontCreatedAt: latestDekont ? latestDekont.createdAt : null,
            dekontApprovedAt: latestDekont ? latestDekont.approvedAt : null,
            dekontCount: studentDekontlar.length,
          });
        }
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

      // Calculate summary statistics based on unique students, not student-internship combinations
      const uniqueStudents = Array.from(
        new Set(formattedStudents.map((s) => s.studentId))
      );
      const studentsWithAtLeastOneDekont = uniqueStudents.filter((studentId) =>
        formattedStudents.some((s) => s.studentId === studentId && s.hasDekont)
      );
      const studentsWithAtLeastOneCompany = uniqueStudents.filter((studentId) =>
        formattedStudents.some((s) => s.studentId === studentId && s.company)
      );

      const summary = {
        totalStudents: uniqueStudents.length,
        studentsWithDekont: studentsWithAtLeastOneDekont.length,
        studentsWithoutDekont:
          uniqueStudents.length - studentsWithAtLeastOneDekont.length,
        studentsWithCompany: studentsWithAtLeastOneCompany.length,
        studentsWithoutCompany:
          uniqueStudents.length - studentsWithAtLeastOneCompany.length,
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
