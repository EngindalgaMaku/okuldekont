import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const url = new URL(request.url);
    const includeInactive = url.searchParams.get("includeInactive") === "true";

    if (!id) {
      return NextResponse.json({ error: "ID gerekli" }, { status: 400 });
    }

    // Build where clause based on includeInactive parameter
    const whereClause: any = {
      teacherId: id,
    };

    // By default, only show companies with active internships
    if (!includeInactive) {
      whereClause.status = "ACTIVE";
    }

    // Öğretmenin sorumlu olduğu stajları getir
    const internships = await prisma.staj.findMany({
      where: whereClause,
      include: {
        company: {
          select: {
            id: true,
            name: true,
            contact: true,
            phone: true,
          },
        },
        student: {
          select: {
            id: true,
            name: true,
            surname: true,
            number: true,
            className: true,
            alan: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        startDate: "desc",
      },
    });

    // Helper function to get company color scheme
    const getCompanyColorScheme = (companyName: string) => {
      const name = companyName.toLowerCase();
      if (name.includes("teknoloji"))
        return { primary: "#4F46E5", secondary: "#EEF2FF", accent: "#C7D2FE" };
      if (name.includes("muhasebe"))
        return { primary: "#059669", secondary: "#ECFDF5", accent: "#A7F3D0" };
      if (name.includes("danışmanlık"))
        return { primary: "#DC2626", secondary: "#FEF2F2", accent: "#FECACA" };
      return { primary: "#6B7280", secondary: "#F9FAFB", accent: "#E5E7EB" };
    };

    const getSeparatorColor = (index: number) => {
      const colors = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6"];
      return colors[index % colors.length];
    };

    // If including inactive internships, get additional data for status metadata
    let allInternships = internships;
    if (includeInactive) {
      // Get all internships (both active and inactive) for comprehensive status tracking
      allInternships = await prisma.staj.findMany({
        where: {
          teacherId: id,
        },
        include: {
          company: {
            select: {
              id: true,
              name: true,
              contact: true,
              phone: true,
            },
          },
          student: {
            select: {
              id: true,
              name: true,
              surname: true,
              number: true,
              className: true,
              alan: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
        orderBy: {
          startDate: "desc",
        },
      });
    }

    // Verileri işletmelere göre grupla ve zenginleştir
    const groupedByCompany = allInternships.reduce(
      (acc: any, internship: any) => {
        const companyId = internship.company.id;
        const company = internship.company;
        const isActive = internship.status === "ACTIVE";
        const isTerminated = ["TERMINATED", "CANCELLED", "COMPLETED"].includes(
          internship.status
        );

        if (!acc[companyId]) {
          acc[companyId] = {
            id: company.id,
            ad: company.name,
            yukleyen_kisi: company.contact || "Bilinmiyor",
            telefon: company.phone || null,
            ogrenciler: [],
            // Company status metadata
            has_active_internships: false,
            has_inactive_internships: false,
            is_fully_terminated: false,
            latest_termination_date: null,
            termination_reason: null,
            // Visual distinction metadata
            company_type: company.name.toLowerCase().includes("teknoloji")
              ? "tech"
              : company.name.toLowerCase().includes("muhasebe")
              ? "accounting"
              : "other",
            total_students: 0,
            active_students: 0,
            inactive_students: 0,
            color_scheme: getCompanyColorScheme(company.name),
            created_at: internship.createdAt,
          };
        }

        // Update company status flags
        if (isActive) {
          acc[companyId].has_active_internships = true;
          acc[companyId].active_students++;
        } else {
          acc[companyId].has_inactive_internships = true;
          acc[companyId].inactive_students++;

          // Track latest termination details
          if (internship.terminationDate) {
            if (
              !acc[companyId].latest_termination_date ||
              new Date(internship.terminationDate) >
                new Date(acc[companyId].latest_termination_date)
            ) {
              acc[companyId].latest_termination_date =
                internship.terminationDate;
              acc[companyId].termination_reason = internship.terminationReason;
            }
          }
        }

        acc[companyId].ogrenciler.push({
          id: internship.student.id,
          ad: internship.student.name,
          soyad: internship.student.surname,
          no: internship.student.number,
          sinif: internship.student.className,
          alan: internship.student.alan?.name || "Alan bilgisi eksik",
          baslangic_tarihi: internship.startDate,
          bitis_tarihi: internship.endDate || null,
          aktif: isActive,
          durum: internship.status,
          fesih_tarihi: internship.terminationDate,
          fesih_nedeni: internship.terminationReason,
          staj_id: internship.id,
        });
        // Update total student count
        acc[companyId].total_students = acc[companyId].ogrenciler.length;

        return acc;
      },
      {} as any
    );

    // Mark companies as fully terminated if they have no active internships
    Object.values(groupedByCompany).forEach((company: any) => {
      company.is_fully_terminated =
        !company.has_active_internships && company.has_inactive_internships;
    });

    // Sort companies by name for consistent ordering and add index for better separation
    const result = Object.values(groupedByCompany)
      .sort((a: any, b: any) => a.ad.localeCompare(b.ad, "tr"))
      .map((company: any, index: number) => ({
        ...company,
        display_order: index + 1,
        is_even: index % 2 === 0,
        separator_color: getSeparatorColor(index),
      }));

    return NextResponse.json(result);
  } catch (error) {
    console.error("Öğretmen stajları getirme hatası:", error);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
