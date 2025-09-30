import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const alanId = resolvedParams.id;

    // Sınıfları getir
    const siniflarData = await prisma.class.findMany({
      where: { alanId: alanId },
      select: {
        id: true,
        name: true,
        dal: true,
        haftalik_program: true,
        _count: {
          select: {
            students: true,
          },
        },
      },
      orderBy: { name: "asc" },
    });

    // Sınıfları dönüştür
    const siniflar = siniflarData.map((sinif: any) => ({
      ...sinif,
      ad: sinif.name,
      ogrenci_sayisi: sinif._count.students,
      haftalik_program: sinif.haftalik_program,
    }));

    // 0 öğrencili sınıfları filtrele (silinmiş sınıflar)
    const filteredSiniflar = siniflar.filter((s: any) => s.ogrenci_sayisi > 0);

    return NextResponse.json(filteredSiniflar);
  } catch (error) {
    console.error("Sınıflar API hatası:", error);
    return NextResponse.json(
      { error: "Sınıflar yüklenirken hata oluştu" },
      { status: 500 }
    );
  }
}
