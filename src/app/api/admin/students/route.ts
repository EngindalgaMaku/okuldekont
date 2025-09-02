import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateAuthAndRole } from "@/middleware/auth";
import { getActiveEducationYearId } from "@/lib/education-year";

export async function GET(request: NextRequest) {
  // Auth check
  const authResult = await validateAuthAndRole(request, ["ADMIN"]);
  if (!authResult.success) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const search = searchParams.get("search") || "";
    const alanId = searchParams.get("alanId") || "";
    const sinif = searchParams.get("sinif") || "";
    const status = searchParams.get("status") || "";
    const itemsPerPage = 12;
    const skip = (page - 1) * itemsPerPage;

    // Active education year scope
    const activeEducationYearId = await getActiveEducationYearId();

    // Build where clause
    const whereClause: any = {};

    // Search filter
    if (search) {
      whereClause.OR = [
        {
          name: {
            contains: search,
            mode: "insensitive",
          },
        },
        {
          surname: {
            contains: search,
            mode: "insensitive",
          },
        },
        {
          number: {
            contains: search,
            mode: "insensitive",
          },
        },
      ];
    }

    // Alan filter
    if (alanId && alanId !== "all") {
      whereClause.alanId = alanId;
    }

    // Sınıf filter
    if (sinif && sinif !== "all") {
      whereClause.className = sinif;
    }

    // Status filter
    if (status && status !== "all") {
      switch (status) {
        case "active":
          whereClause.stajlar = {
            some: {
              status: "ACTIVE",
              educationYearId: activeEducationYearId,
              archived: false,
            },
          };
          break;
        case "unassigned":
          whereClause.AND = [
            {
              OR: [{ companyId: null }, { companyId: "" }],
            },
            {
              stajlar: {
                none: {
                  status: "ACTIVE",
                  educationYearId: activeEducationYearId,
                  archived: false,
                },
              },
            },
          ];
          break;
        case "terminated":
          whereClause.stajlar = {
            some: {
              status: "TERMINATED",
              educationYearId: activeEducationYearId,
              archived: false,
            },
          };
          break;
        case "completed":
          whereClause.stajlar = {
            some: {
              status: "COMPLETED",
              educationYearId: activeEducationYearId,
              archived: false,
            },
          };
          break;
      }
    }

    // Get students with pagination
    const [students, totalCount] = await Promise.all([
      prisma.student.findMany({
        where: whereClause,
        select: {
          id: true,
          name: true,
          surname: true,
          number: true,
          className: true,
          alanId: true,
          alan: {
            select: {
              id: true,
              name: true,
            },
          },
          stajlar: {
            where: {
              status: "ACTIVE",
              educationYearId: activeEducationYearId,
              archived: false,
            },
            select: {
              id: true,
              status: true,
              startDate: true,
              endDate: true,
              company: {
                select: {
                  id: true,
                  name: true,
                  contact: true,
                  teacher: {
                    select: {
                      id: true,
                      name: true,
                      surname: true,
                      alanId: true,
                      alan: {
                        select: {
                          id: true,
                          name: true,
                        },
                      },
                    },
                  },
                },
              },
              teacher: {
                select: {
                  id: true,
                  name: true,
                  surname: true,
                  alanId: true,
                  alan: {
                    select: {
                      id: true,
                      name: true,
                    },
                  },
                },
              },
            },
            take: 1,
          },
        },
        orderBy: [{ number: "asc" }],
        skip: skip,
        take: itemsPerPage,
      }),
      prisma.student.count({
        where: whereClause,
      }),
    ]);

    // Transform data to match expected format
    const transformedStudents = students.map((student) => {
      // Use active internship if available
      const activeInternship = student.stajlar?.[0];
      const currentCompany = activeInternship?.company;
      const coordinatorTeacher =
        activeInternship?.teacher || currentCompany?.teacher;

      return {
        id: student.id,
        ad: student.name,
        soyad: student.surname,
        no: student.number || "",
        sinif: student.className,
        alanId: student.alanId,
        alan: student.alan,
        company: currentCompany
          ? {
              id: currentCompany.id,
              name: currentCompany.name,
              contact: currentCompany.contact,
              teacher: coordinatorTeacher
                ? {
                    id: coordinatorTeacher.id,
                    name: coordinatorTeacher.name,
                    surname: coordinatorTeacher.surname,
                    alanId: coordinatorTeacher.alanId,
                    alan: coordinatorTeacher.alan,
                  }
                : null,
            }
          : null,
        internshipStatus: activeInternship
          ? {
              id: activeInternship.id,
              status: activeInternship.status,
              startDate: activeInternship.startDate,
              endDate: activeInternship.endDate,
            }
          : null,
      };
    });

    const totalPages = Math.ceil(totalCount / itemsPerPage);

    return NextResponse.json({
      students: transformedStudents,
      totalCount,
      totalPages,
      currentPage: page,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    });
  } catch (error) {
    console.error("Students API error:", error);
    return NextResponse.json(
      { error: "Öğrenciler yüklenirken hata oluştu" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  // Auth check
  const authResult = await validateAuthAndRole(request, ["ADMIN"]);
  if (!authResult.success) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    );
  }

  try {
    const body = await request.json();
    const { name, surname, number, className, alanId } = body;

    // Validate required fields
    if (!name || !surname || !number || !className || !alanId) {
      return NextResponse.json(
        { error: "Tüm alanlar zorunludur" },
        { status: 400 }
      );
    }

    // Check if student number already exists
    const existingStudent = await prisma.student.findFirst({
      where: { number: number }
    });

    if (existingStudent) {
      return NextResponse.json(
        { error: "Bu öğrenci numarası zaten kullanılıyor" },
        { status: 400 }
      );
    }

    // Create new student
    const newStudent = await prisma.student.create({
      data: {
        name,
        surname,
        number,
        className,
        alanId
      },
      include: {
        alan: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    return NextResponse.json({
      success: true,
      student: {
        id: newStudent.id,
        ad: newStudent.name,
        soyad: newStudent.surname,
        no: newStudent.number,
        sinif: newStudent.className,
        alanId: newStudent.alanId,
        alan: newStudent.alan
      }
    });

  } catch (error) {
    console.error("Student creation error:", error);
    return NextResponse.json(
      { error: "Öğrenci oluşturulurken hata oluştu" },
      { status: 500 }
    );
  }
}
