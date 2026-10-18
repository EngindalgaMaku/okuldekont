import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const url = new URL(request.url);
    const queryEducationYearId = url.searchParams.get("educationYearId");

    if (!id) {
      return NextResponse.json({ error: "ID gerekli" }, { status: 400 });
    }

    let targetEducationYearId: string | null = null;
    if (queryEducationYearId && queryEducationYearId !== "all") {
      targetEducationYearId = queryEducationYearId;
    } else if (queryEducationYearId !== "all") {
      const activeYear = await prisma.egitimYili.findFirst({
        where: { active: true },
      });
      targetEducationYearId = activeYear?.id || null;
    }

    // Öğretmenin sorumlu olduğu stajların veya doğrudan öğretmenin yüklediği dekontları getir
    const dekontlar = await prisma.dekont.findMany({
      where: {
        archived: false,
        OR: [
          {
            staj: {
              teacherId: id,
              archived: false,
              ...(targetEducationYearId
                ? { educationYearId: targetEducationYearId }
                : {}),
            },
          },
          {
            teacherId: id,
            archived: false,
          },
        ],
      },
      include: {
        staj: {
          include: {
            student: {
              select: {
                id: true,
                name: true,
                surname: true,
              },
            },
            company: {
              select: {
                id: true,
                name: true,
                contact: true,
              },
            },
          },
        },
        student: {
          select: {
            id: true,
            name: true,
            surname: true,
          },
        },
        company: {
          select: {
            id: true,
            name: true,
          },
        },
        teacher: {
          select: {
            name: true,
            surname: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Status mapping from database enum to Turkish frontend values
    const statusMapping: { [key: string]: string } = {
      PENDING: "bekliyor",
      APPROVED: "onaylandi",
      REJECTED: "reddedildi",
    };

    // Formatla - include ogrenci_id, isletme_id, staj_id
    const formattedDekontlar = dekontlar.map((d: any) => ({
      id: d.id,
      staj_id: d.stajId,
      ogrenci_id: d.studentId || d.staj?.student?.id,
      isletme_id: d.companyId || d.staj?.company?.id,
      isletme_ad:
        d.staj?.company?.name || d.company?.name || "Bilinmiyor",
      ogrenci_ad: d.staj?.student
        ? `${d.staj.student.name} ${d.staj.student.surname}`
        : d.student
        ? `${d.student.name} ${d.student.surname}`
        : "Bilinmiyor",
      miktar: d.amount ? Number(d.amount) : null,
      odeme_tarihi: d.paymentDate,
      onay_durumu: statusMapping[d.status as string] || d.status,
      ay: Number(d.month),
      yil: Number(d.year),
      sequence_number: d.sequenceNumber || 1,
      dosya_url: d.fileUrl,
      aciklama: d.rejectReason,
      red_nedeni: d.rejectReason,
      yukleyen_kisi: d.teacherId
        ? d.teacher
          ? `${d.teacher.name} ${d.teacher.surname} (Öğretmen)`
          : "Öğretmen"
        : d.staj?.company?.contact
        ? `${d.staj.company.contact} (İşletme)`
        : "İşletme Yetkilisi (İşletme)",
      created_at: d.createdAt,
    }));

    return NextResponse.json(formattedDekontlar);
  } catch (error) {
    console.error("Öğretmen dekontları getirme hatası:", error);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
