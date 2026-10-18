import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActiveEducationYearId } from "@/lib/education-year";

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
      const queryEducationYearId = searchParams.get("educationYearId");

      let targetEducationYearId =
        queryEducationYearId && queryEducationYearId !== "all"
          ? queryEducationYearId
          : undefined;

      if (!targetEducationYearId) {
        try {
          targetEducationYearId = await getActiveEducationYearId();
        } catch (e) {
          console.warn("[class-reports] Aktif eğitim yılı bulunamadı:", e);
        }
      }

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
              archived: false,
              ...(targetEducationYearId
                ? { educationYearId: targetEducationYearId }
                : {}),
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
          enrollments: targetEducationYearId
            ? {
                where: {
                  educationYearId: targetEducationYearId,
                },
              }
            : undefined,
          _count: {
            select: {
              stajlar: true, // Toplam geçmiş ve güncel tüm stajlar
            },
          },
          dekontlar: {
            where: {
              archived: false,
              ...(month && year
                ? {
                    month: parseInt(month),
                    year: parseInt(year),
                  }
                : {}),
              ...(targetEducationYearId
                ? {
                    staj: {
                      educationYearId: targetEducationYearId,
                      archived: false,
                    },
                  }
                : {}),
            },
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

      // Eski dönemden kalan mezun/ayrılmış öğrencileri filtrele:
      // Eğer bir öğrencinin geçmişte stajı varsa (_count.stajlar > 0) ancak
      // bu eğitim yılında hiç stajı yoksa ve enrollment kaydı da yoksa,
      // o öğrenci önceki dönemlere aittir ve güncel sınıf listesine dahil edilmemelidir.
      const activeStudentsInPeriod = students.filter((student) => {
        if (!targetEducationYearId) return true;

        const hasStajInPeriod =
          Array.isArray(student.stajlar) && student.stajlar.length > 0;
        const hasEnrollmentInPeriod =
          Array.isArray(student.enrollments) && student.enrollments.length > 0;

        if (hasStajInPeriod || hasEnrollmentInPeriod) {
          return true;
        }

        // Başka dönemlerde stajı var ama bu dönemde hiç stajı/kaydı yok -> Önceki döneme ait
        if (student._count && student._count.stajlar > 0) {
          return false;
        }

        // Hiçbir dönemde stajı olmamış yeni kayıtlı öğrenci -> Sınıfta göster
        return true;
      });


      // Create student-internship combinations for better reporting
      const formattedStudents: any[] = [];

      activeStudentsInPeriod.forEach((student) => {
        const allStajlar = Array.isArray(student.stajlar)
          ? student.stajlar
          : [];

        // Debug for specific student
        if (student.name === "Pakize Sude" || student.surname === "Güneri") {
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
          educationYearId: targetEducationYearId || null,
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
