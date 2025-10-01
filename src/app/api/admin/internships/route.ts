import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActiveEducationYearId } from "@/lib/education-year";
import { auditInternshipCreation } from "@/lib/audit-trail";
import { getSystemUserId } from "@/lib/system-user";
import { validateAuthAndRole } from "@/middleware/auth";

export async function GET(request: Request) {
  // KRİTİK: Staj verileri - SADECE ADMIN ve TEACHER
  const authResult = await validateAuthAndRole(request, ["ADMIN", "TEACHER"]);
  if (!authResult.success) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const studentIds = searchParams.get("studentIds");
    const status = searchParams.get("status");
    const companyId = searchParams.get("companyId");
    const teacherId = searchParams.get("teacherId");
    const educationYearIdParam = searchParams.get("educationYearId");
    const search = (searchParams.get("search") || "").trim();
    const alanId = searchParams.get("alanId");
    const sinif = searchParams.get("sinif");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");

    // Validate pagination parameters
    const validPage = Math.max(1, page);
    const validLimit = Math.min(Math.max(1, limit), 100); // Max 100 items per page
    const skip = (validPage - 1) * validLimit;

    let whereClause: any = {
      archived: false, // Arşivlenen stajları gizle
    };

    // Filter by student IDs if provided
    if (studentIds) {
      const studentIdArray = studentIds.split(",").filter((id) => id.trim());
      whereClause.studentId = { in: studentIdArray };
    }

    // Filter by status if provided
    if (status) {
      whereClause.status = status;
    }

    // Filter by company if provided
    if (companyId) {
      whereClause.companyId = companyId;
    }

    // Filter by teacher if provided
    if (teacherId) {
      whereClause.teacherId = teacherId;
    }

    // Filter by education year: use provided param or default to active year
    const effectiveEducationYearId =
      educationYearIdParam || (await getActiveEducationYearId());
    whereClause.educationYearId = effectiveEducationYearId;

    // Filter by alan (field) and sınıf on related student
    const studentWhere: any = {};
    if (alanId) {
      studentWhere.alanId = alanId;
    }
    if (sinif) {
      studentWhere.className = sinif;
    }

    if (Object.keys(studentWhere).length > 0) {
      whereClause.student = {
        is: studentWhere,
      };
    }

    // Search across student name/surname/number and company name
    if (search) {
      const tokens = search
        .split(/\s+/)
        .map((t) => t.trim())
        .filter(Boolean);
      if (tokens.length > 0) {
        const tokenAndClauses = tokens.map((t) => ({
          OR: [
            { student: { is: { name: { contains: t } } } },
            {
              student: {
                is: { surname: { contains: t } },
              },
            },
            {
              student: { is: { number: { contains: t } } },
            },
            { company: { is: { name: { contains: t } } } },
          ],
        }));
        whereClause.AND = [...(whereClause.AND || []), ...tokenAndClauses];
      }
    }

    // Get total count for pagination
    const totalCount = await prisma.staj.count({
      where: whereClause,
    });

    const totalPages = Math.ceil(totalCount / validLimit);

    // Get internships with related data and pagination
    const internships = await prisma.staj.findMany({
      where: whereClause,
      include: {
        student: {
          include: {
            alan: true,
          },
        },
        company: true,
        teacher: true,
        educationYear: true,
      },
      orderBy: [
        {
          student: {
            number: "asc",
          },
        },
        {
          createdAt: "desc",
        },
      ],
      skip,
      take: validLimit,
    });

    // Transform data to match expected interface with teacher history support
    const transformedInternships = await Promise.all(
      internships.map(async (internship) => {
        let teacherInfo = null;

        // Get teacher info from current relation or history
        if (internship.teacher) {
          teacherInfo = {
            id: internship.teacher.id,
            name: internship.teacher.name,
            surname: internship.teacher.surname,
          };
        } else if (internship.status === "TERMINATED") {
          // For terminated internships, get teacher info from history
          const teacherHistory = await prisma.internshipHistory.findFirst({
            where: {
              internshipId: internship.id,
              action: { in: ["ASSIGNED", "TEACHER_CHANGED"] },
            },
            orderBy: { performedAt: "desc" },
          });

          if (teacherHistory?.newData) {
            const newData = teacherHistory.newData as any;
            if (newData.teacherName && newData.teacherId) {
              const teacherName = newData.teacherName as string;
              const [name, ...surnameParts] = teacherName.split(" ");
              teacherInfo = {
                id: newData.teacherId as string,
                name: name || "Bilinmeyen",
                surname: surnameParts.join(" ") || "Öğretmen",
              };
            }
          }
        }

        return {
          id: internship.id,
          studentId: internship.studentId,
          companyId: internship.companyId,
          teacherId: internship.teacherId,
          educationYearId: internship.educationYearId,
          startDate: internship.startDate
            ? internship.startDate.toISOString().split("T")[0]
            : null,
          endDate: internship.endDate
            ? internship.endDate.toISOString().split("T")[0]
            : null,
          status: internship.status,
          terminationDate:
            internship.terminationDate?.toISOString().split("T")[0] || null,
          createdAt: internship.createdAt.toISOString(),
          student: internship.student
            ? {
                id: internship.student.id,
                name: internship.student.name,
                surname: internship.student.surname,
                number: internship.student.number || "",
                className: internship.student.className,
                alan: internship.student.alan
                  ? {
                      name: internship.student.alan.name,
                    }
                  : null,
              }
            : null,
          company: internship.company
            ? {
                id: internship.company.id,
                name: internship.company.name,
                contact: internship.company.contact,
              }
            : null,
          teacher: teacherInfo,
        };
      })
    );

    return NextResponse.json({
      success: true,
      data: transformedInternships,
      pagination: {
        currentPage: validPage,
        totalPages,
        totalCount,
        limit: validLimit,
        hasNextPage: validPage < totalPages,
        hasPreviousPage: validPage > 1,
      },
    });
  } catch (error) {
    console.error("Internships fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch internships" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  // KRİTİK: Staj oluşturma - SADECE ADMIN
  const authResult = await validateAuthAndRole(request, ["ADMIN"]);
  if (!authResult.success) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    );
  }

  try {
    const {
      studentId,
      companyId,
      teacherId,
      startDate,
      endDate,
      status = "ACTIVE",
      terminationDate,
      terminationReason,
      terminationNotes,
      performedBy,
    } = await request.json();

    if (!studentId || !companyId || !teacherId || !startDate || !endDate) {
      return NextResponse.json(
        {
          error:
            "Missing required fields: studentId, companyId, teacherId, startDate, endDate are required",
        },
        { status: 400 }
      );
    }

    // Additional validation for terminated internships
    if (status === "TERMINATED") {
      if (!terminationDate || !terminationReason) {
        return NextResponse.json(
          {
            error:
              "Terminated internships require terminationDate and terminationReason",
          },
          { status: 400 }
        );
      }

      // Validate termination date is between start and end dates
      const start = new Date(startDate);
      const termination = new Date(terminationDate);
      const end = new Date(endDate);

      if (termination < start || termination > end) {
        return NextResponse.json(
          { error: "Termination date must be between start date and end date" },
          { status: 400 }
        );
      }
    }

    // Validate date range
    if (new Date(startDate) >= new Date(endDate)) {
      return NextResponse.json(
        { error: "Start date must be before end date" },
        { status: 400 }
      );
    }

    // Check if student already has an active internship that overlaps with this period
    const overlappingInternship = await prisma.staj.findFirst({
      where: {
        studentId,
        status: {
          in: ["ACTIVE", "COMPLETED"],
        },
        OR: [
          {
            AND: [
              { startDate: { lte: new Date(startDate) } },
              { endDate: { gte: new Date(startDate) } },
            ],
          },
          {
            AND: [
              { startDate: { lte: new Date(endDate) } },
              { endDate: { gte: new Date(endDate) } },
            ],
          },
          {
            AND: [
              { startDate: { gte: new Date(startDate) } },
              { endDate: { lte: new Date(endDate) } },
            ],
          },
        ],
      },
      include: {
        company: true,
      },
    });

    // Collect warnings instead of blocking creation
    const warnings: any[] = [];
    if (overlappingInternship) {
      warnings.push({
        type: "OVERLAPPING_INTERNSHIP",
        message: `Öğrencinin bu tarih aralığında ${
          overlappingInternship.company?.name
        } işletmesinde ${
          overlappingInternship.status === "ACTIVE" ? "aktif" : "tamamlanmış"
        } bir stajı bulunmaktadır`,
        conflictingInternship: {
          id: overlappingInternship.id,
          companyName: overlappingInternship.company?.name,
          startDate: overlappingInternship.startDate
            ?.toISOString()
            .split("T")[0],
          endDate: overlappingInternship.endDate?.toISOString().split("T")[0],
          status: overlappingInternship.status,
        },
      });
    }

    // Get real system user ID if performedBy not provided
    const realPerformedBy = performedBy || (await getSystemUserId());

    // Get active education year - will throw error if none exists
    const educationYearId = await getActiveEducationYearId();

    // Use transaction to ensure both internship and history are created
    const result = await prisma.$transaction(async (prisma) => {
      // Create internship
      const internshipData: any = {
        studentId,
        companyId,
        teacherId,
        educationYearId,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        status,
        terminationDate:
          status === "TERMINATED" ? new Date(terminationDate) : null,
      };

      const internship = await prisma.staj.create({
        data: internshipData,
        include: {
          student: {
            include: {
              alan: true,
            },
          },
          company: true,
          teacher: true,
          educationYear: true,
        },
      });

      // Get teacher and company info for detailed history
      const teacherInfo = await prisma.teacherProfile.findUnique({
        where: { id: teacherId },
      });

      const companyInfo = await prisma.companyProfile.findUnique({
        where: { id: companyId },
      });

      // Create audit trail history record with detailed info
      const startDateFormatted = new Date(startDate).toLocaleDateString(
        "tr-TR"
      );
      const teacherName = teacherInfo
        ? `${teacherInfo.name} ${teacherInfo.surname}`
        : "Bilinmeyen Koordinatör";
      const companyName = companyInfo?.name || "Bilinmeyen İşletme";

      await prisma.internshipHistory.create({
        data: {
          internshipId: internship.id,
          action: "CREATED",
          newData: JSON.stringify({
            studentId,
            companyId,
            teacherId,
            educationYearId,
            startDate: new Date(startDate),
            endDate: endDate ? new Date(endDate) : new Date(startDate),
            status,
          }),
          performedBy: realPerformedBy,
          reason: `${companyName} işletmesinde staj başlatıldı`,
          notes: `Başlangıç Tarihi: ${startDateFormatted} | Koordinatör: ${teacherName}`,
        },
      });

      // If creating a terminated internship, add termination history
      if (status === "TERMINATED") {
        const terminationDateFormatted = new Date(
          terminationDate
        ).toLocaleDateString("tr-TR");

        await prisma.internshipHistory.create({
          data: {
            internshipId: internship.id,
            action: "TERMINATED",
            previousData: JSON.stringify({
              status: "ACTIVE",
              terminationDate: null,
            }),
            newData: JSON.stringify({
              status: "TERMINATED",
              terminationDate: new Date(terminationDate),
              terminationReason,
              terminationNotes,
            }),
            performedBy: realPerformedBy,
            reason: `Staj feshedildi: ${terminationReason}`,
            notes: `Fesih Tarihi: ${terminationDateFormatted} | Neden: ${terminationReason}${
              terminationNotes ? ` | Notlar: ${terminationNotes}` : ""
            }`,
          },
        });
      }

      // Create teacher history record for internship assignment
      if (teacherId) {
        await (prisma as any).teacherHistory.create({
          data: {
            teacherId: teacherId,
            changeType: "OTHER_UPDATE",
            fieldName: "internship_assignment",
            previousValue: null,
            newValue: JSON.stringify({
              action: "ASSIGNED_INTERNSHIP",
              studentName: `${internship.student.name} ${internship.student.surname}`,
              companyName: companyName,
              startDate: new Date(startDate),
              status: status,
              ...(status === "TERMINATED" && {
                terminationDate: new Date(terminationDate),
                terminationReason,
              }),
            }),
            validFrom: new Date(),
            changedBy: realPerformedBy,
            reason:
              status === "TERMINATED"
                ? `Geçmişe dönük feshedilmiş staj kaydı oluşturuldu`
                : `Yeni staj ataması yapıldı`,
            notes:
              status === "TERMINATED"
                ? `${internship.student.name} ${
                    internship.student.surname
                  } - ${companyName} stajı (${new Date(
                    terminationDate
                  ).toLocaleDateString("tr-TR")} tarihinde feshedildi)`
                : `${internship.student.name} ${internship.student.surname} - ${companyName} stajı başlatıldı`,
          },
        });
      }

      return internship;
    });

    const internship = result;

    return NextResponse.json({
      success: true,
      warnings: warnings.length > 0 ? warnings : undefined,
      data: {
        id: internship.id,
        studentId: internship.studentId,
        companyId: internship.companyId,
        teacherId: internship.teacherId,
        educationYearId: internship.educationYearId,
        startDate: internship.startDate.toISOString().split("T")[0],
        endDate: internship.endDate.toISOString().split("T")[0],
        status: internship.status,
        terminationDate:
          internship.terminationDate?.toISOString().split("T")[0] || null,
        createdAt: internship.createdAt.toISOString(),
        student: internship.student
          ? {
              id: internship.student.id,
              name: internship.student.name,
              surname: internship.student.surname,
              number: internship.student.number || "",
              className: internship.student.className,
              alan: internship.student.alan
                ? {
                    name: internship.student.alan.name,
                  }
                : null,
            }
          : null,
        company: internship.company
          ? {
              id: internship.company.id,
              name: internship.company.name,
              contact: internship.company.contact,
            }
          : null,
        teacher: internship.teacher
          ? {
              id: internship.teacher.id,
              name: internship.teacher.name,
              surname: internship.teacher.surname,
            }
          : null,
      },
    });
  } catch (error) {
    console.error("Internship creation error:", error);
    return NextResponse.json(
      { error: "Failed to create internship" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  // KRİTİK: Staj güncelleme - SADECE ADMIN
  const authResult = await validateAuthAndRole(request, ["ADMIN"]);
  if (!authResult.success) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const internshipId = searchParams.get("id");

    if (!internshipId) {
      return NextResponse.json(
        { error: "Staj ID gereklidir" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { startDate, endDate, action } = body;

    // Date update specific logic
    if (action === "updateDates") {
      if (!startDate || !endDate) {
        return NextResponse.json(
          { error: "Başlangıç ve bitiş tarihleri gereklidir" },
          { status: 400 }
        );
      }

      const start = new Date(startDate);
      const end = new Date(endDate);

      // Validate dates
      if (start >= end) {
        return NextResponse.json(
          { error: "Başlangıç tarihi bitiş tarihinden önce olmalıdır" },
          { status: 400 }
        );
      }

      // Check if internship exists and is active
      const existingInternship = await prisma.staj.findUnique({
        where: { id: internshipId },
        include: {
          student: true,
          company: true,
          teacher: true,
        },
      });

      if (!existingInternship) {
        return NextResponse.json({ error: "Staj bulunamadı" }, { status: 404 });
      }

      if (existingInternship.status !== "ACTIVE") {
        return NextResponse.json(
          { error: "Sadece aktif stajların tarihleri güncellenebilir" },
          { status: 400 }
        );
      }

      // Get system user ID for audit trail
      const performedBy = await getSystemUserId();

      // Update internship dates in transaction
      const result = await prisma.$transaction(async (prisma) => {
        // Update the internship
        const updatedInternship = await prisma.staj.update({
          where: { id: internshipId },
          data: {
            startDate: start,
            endDate: end,
          },
          include: {
            student: {
              include: {
                alan: true,
              },
            },
            company: true,
            teacher: true,
            educationYear: true,
          },
        });

        // Create audit trail history record
        const oldStartDate = existingInternship.startDate
          ? existingInternship.startDate.toLocaleDateString("tr-TR")
          : "Belirtilmemiş";
        const oldEndDate = existingInternship.endDate
          ? existingInternship.endDate.toLocaleDateString("tr-TR")
          : "Belirtilmemiş";
        const newStartDate = start.toLocaleDateString("tr-TR");
        const newEndDate = end.toLocaleDateString("tr-TR");

        await prisma.internshipHistory.create({
          data: {
            internshipId: internshipId,
            action: "UPDATED",
            previousData: JSON.stringify({
              startDate: existingInternship.startDate,
              endDate: existingInternship.endDate,
            }),
            newData: JSON.stringify({
              startDate: start,
              endDate: end,
            }),
            performedBy: performedBy,
            reason: "Staj tarihleri güncellendi",
            notes: `Eski tarihler: ${oldStartDate} → ${oldEndDate} | Yeni tarihler: ${newStartDate} → ${newEndDate}`,
          },
        });

        return updatedInternship;
      });

      // Transform and return response
      const transformedResponse = {
        id: result.id,
        studentId: result.studentId,
        companyId: result.companyId,
        teacherId: result.teacherId,
        educationYearId: result.educationYearId,
        startDate: result.startDate.toISOString().split("T")[0],
        endDate: result.endDate.toISOString().split("T")[0],
        status: result.status,
        terminationDate:
          result.terminationDate?.toISOString().split("T")[0] || null,
        createdAt: result.createdAt.toISOString(),
        student: result.student
          ? {
              id: result.student.id,
              name: result.student.name,
              surname: result.student.surname,
              number: result.student.number || "",
              className: result.student.className,
              alan: result.student.alan
                ? {
                    name: result.student.alan.name,
                  }
                : null,
            }
          : null,
        company: result.company
          ? {
              id: result.company.id,
              name: result.company.name,
              contact: result.company.contact,
            }
          : null,
        teacher: result.teacher
          ? {
              id: result.teacher.id,
              name: result.teacher.name,
              surname: result.teacher.surname,
            }
          : null,
      };

      return NextResponse.json({
        success: true,
        message: "Staj tarihleri başarıyla güncellendi",
        data: transformedResponse,
      });
    }

    // Handle other PATCH actions (existing status updates, etc.)
    // This preserves any existing PATCH functionality
    return NextResponse.json({ error: "Geçersiz işlem" }, { status: 400 });
  } catch (error) {
    console.error("Internship update error:", error);
    return NextResponse.json(
      { error: "Staj güncellenirken hata oluştu" },
      { status: 500 }
    );
  }
}
