import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateAuthAndRole } from "@/middleware/auth";
import { getActiveEducationYearId } from "@/lib/education-year";

export async function GET(request: NextRequest) {
  // Auth check - Only admins can access all students for internship creation
  const authResult = await validateAuthAndRole(request, ["ADMIN"]);
  if (!authResult.success) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const alanId = searchParams.get("alanId") || "";
    const sinif = searchParams.get("sinif") || "";
    const sort = (searchParams.get("sort") || "number").toLowerCase();

    // Active education year scope
    const activeEducationYearId = await getActiveEducationYearId();

    // Build where clause
    const whereClause: any = {};

    // Search filter (supports multi-word queries like "Ahmet Yılmaz")
    if (search) {
      const tokens = search
        .split(/\s+/)
        .map((t) => t.trim())
        .filter((t) => t.length > 0);

      if (tokens.length > 0) {
        // Each token must match at least one of the fields (AND of ORs)
        whereClause.AND = tokens.map((t) => ({
          OR: [
            {
              name: {
                contains: t,
                mode: "insensitive",
              },
            },
            {
              surname: {
                contains: t,
                mode: "insensitive",
              },
            },
            {
              number: {
                contains: t,
                mode: "insensitive",
              },
            },
          ],
        }));
      }
    }

    // Alan filter
    if (alanId && alanId !== "all") {
      whereClause.alanId = alanId;
    }

    // Sınıf filter
    if (sinif && sinif !== "all") {
      whereClause.className = sinif;
    }

    // Get ALL students with their internship status
    const students = await prisma.student.findMany({
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
            educationYearId: activeEducationYearId,
            archived: false,
            status: {
              in: ["ACTIVE", "COMPLETED", "TERMINATED"],
            },
          },
          select: {
            id: true,
            status: true,
            startDate: true,
            endDate: true,
            terminationDate: true,
            company: {
              select: {
                id: true,
                name: true,
                contact: true,
              },
            },
            teacher: {
              select: {
                id: true,
                name: true,
                surname: true,
              },
            },
          },
          orderBy: {
            startDate: "desc",
          },
          take: 1, // Get the most recent internship
        },
      },
      orderBy:
        sort === "name"
          ? [{ name: "asc" }, { surname: "asc" }]
          : [{ number: "asc" }],
    });

    // Transform data to match InternshipCreationModal interface with status info
    const transformedStudents = students.map((student) => {
      const currentInternship = student.stajlar?.[0];

      let statusInfo = null;
      if (currentInternship) {
        statusInfo = {
          hasActiveInternship: currentInternship.status === "ACTIVE",
          status: currentInternship.status,
          companyName: currentInternship.company?.name,
          startDate: currentInternship.startDate,
          endDate: currentInternship.endDate,
          terminationDate: currentInternship.terminationDate,
        };
      }

      return {
        id: student.id,
        name: student.name,
        surname: student.surname,
        number: student.number || "",
        className: student.className,
        alan: student.alan,
        // Include status information for UI display
        internshipStatus: statusInfo,
      };
    });

    return NextResponse.json({
      success: true,
      students: transformedStudents,
      totalCount: transformedStudents.length,
    });
  } catch (error) {
    console.error("All students API error:", error);
    return NextResponse.json(
      { error: "Tüm öğrenciler yüklenirken hata oluştu" },
      { status: 500 }
    );
  }
}
