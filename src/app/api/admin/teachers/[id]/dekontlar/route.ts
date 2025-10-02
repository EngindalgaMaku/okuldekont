import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: "ID gerekli" }, { status: 400 });
    }

    // Öğretmenin sorumlu olduğu stajların tüm dekontlarını getir (işletme yüklü dahil)
    const dekontlar = await prisma.dekont.findMany({
      where: {
        staj: {
          teacherId: id,
        },
      },
      include: {
        staj: {
          include: {
            student: {
              select: {
                name: true,
                surname: true,
              },
            },
            company: {
              select: {
                name: true,
                contact: true,
              },
            },
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

    // 🐛 DEBUG: Log raw dekont data
    console.log("🔍 DEBUG: Teacher dekont API raw data sample:", {
      teacherId: id,
      totalDekontlar: dekontlar.length,
      sampleDekont: dekontlar[0]
        ? {
            id: dekontlar[0].id,
            month: dekontlar[0].month,
            year: dekontlar[0].year,
            sequenceNumber: (dekontlar[0] as any).sequenceNumber,
            hasSequenceNumber: !!(dekontlar[0] as any).sequenceNumber,
          }
        : null,
    });

    // Formatla - FIXED: Include sequenceNumber
    const formattedDekontlar = dekontlar.map((d: any) => ({
      id: d.id,
      isletme_ad: d.staj.company.name,
      ogrenci_ad: `${d.staj.student.name} ${d.staj.student.surname}`,
      miktar: d.amount,
      odeme_tarihi: d.paymentDate,
      onay_durumu: statusMapping[d.status as string] || d.status,
      ay: d.month,
      yil: d.year,
      sequence_number: d.sequenceNumber || 1, // 🚨 FIX: Include sequenceNumber
      dosya_url: d.fileUrl,
      aciklama: d.rejectReason,
      red_nedeni: d.rejectReason,
      // Gerçek yükleyiciyi belirle
      yukleyen_kisi: d.teacherId
        ? d.teacher
          ? `${d.teacher.name} ${d.teacher.surname} (Öğretmen)`
          : "Öğretmen"
        : d.staj?.company?.contact
        ? `${d.staj.company.contact} (İşletme)`
        : "İşletme Yetkilisi (İşletme)",
      created_at: d.createdAt,
    }));

    // 🐛 DEBUG: Log formatted data to verify sequenceNumber inclusion
    console.log("🔍 DEBUG: Teacher dekont API formatted data sample:", {
      sampleFormatted: formattedDekontlar[0]
        ? {
            id: formattedDekontlar[0].id,
            ay: formattedDekontlar[0].ay,
            yil: formattedDekontlar[0].yil,
            sequence_number: formattedDekontlar[0].sequence_number,
          }
        : null,
    });

    return NextResponse.json(formattedDekontlar);
  } catch (error) {
    console.error("Öğretmen dekontları getirme hatası:", error);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
