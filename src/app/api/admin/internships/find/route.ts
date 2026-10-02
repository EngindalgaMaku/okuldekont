import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActiveEducationYearId } from "@/lib/education-year";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const ogrenci_id = searchParams.get("ogrenci_id");
    const isletme_id = searchParams.get("isletme_id");

    if (!ogrenci_id || !isletme_id) {
      return NextResponse.json(
        { error: "ogrenci_id ve isletme_id gerekli" },
        { status: 400 }
      );
    }

    let activeYearId: string | null = null;
    try {
      activeYearId = await getActiveEducationYearId();
    } catch {
      // Aktif eğitim yılı bulunamazsa devam et
    }

    // 1. Önce aktif eğitim yılı ve aktif durumdaki stajı ara
    let staj = await prisma.staj.findFirst({
      where: {
        studentId: ogrenci_id,
        companyId: isletme_id,
        archived: false,
        status: "ACTIVE",
        ...(activeYearId ? { educationYearId: activeYearId } : {}),
      },
      orderBy: { startDate: "desc" },
      select: { id: true },
    });

    // 2. Bulunamazsa herhangi bir aktif durumdaki stajı ara
    if (!staj) {
      staj = await prisma.staj.findFirst({
        where: {
          studentId: ogrenci_id,
          companyId: isletme_id,
          archived: false,
          status: "ACTIVE",
        },
        orderBy: { startDate: "desc" },
        select: { id: true },
      });
    }

    // 3. Bulunamazsa en yeni arşivlenmemiş stajı ara
    if (!staj) {
      staj = await prisma.staj.findFirst({
        where: {
          studentId: ogrenci_id,
          companyId: isletme_id,
          archived: false,
        },
        orderBy: { startDate: "desc" },
        select: { id: true },
      });
    }

    if (!staj) {
      return NextResponse.json({ error: "Staj bulunamadı" }, { status: 404 });
    }

    return NextResponse.json({ id: staj.id });
  } catch (error) {
    console.error("Staj ID bulma hatası:", error);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}