import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateAuthAndRole } from "@/middleware/auth";

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // Admin yetkisi kontrolü
  const authResult = await validateAuthAndRole(request, ["ADMIN"]);
  if (!authResult.success) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    );
  }

  try {
    const { terminationDate } = await request.json();

    if (!terminationDate) {
      return NextResponse.json(
        { error: "Fesih tarihi gereklidir" },
        { status: 400 }
      );
    }

    // Stajı kontrol et
    const staj = await prisma.staj.findUnique({
      where: { id: params.id },
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
          },
        },
      },
    });

    if (!staj) {
      return NextResponse.json(
        { error: "Staj bulunamadı" },
        { status: 404 }
      );
    }

    // Staj feshedilmiş mi kontrol et
    if (staj.status !== "TERMINATED") {
      return NextResponse.json(
        { error: "Bu staj feshedilmemiş. Sadece feshedilmiş stajların tarihi düzenlenebilir." },
        { status: 400 }
      );
    }

    // Fesih tarihini güncelle
    const updatedStaj = await prisma.staj.update({
      where: { id: params.id },
      data: {
        terminationDate: new Date(terminationDate),
        lastModifiedAt: new Date(),
        lastModifiedBy: authResult.userId,
      },
    });

    return NextResponse.json({
      success: true,
      message: `${staj.student.name} ${staj.student.surname} - ${staj.company.name} stajının fesih tarihi başarıyla güncellendi`,
      data: updatedStaj,
    });
  } catch (error) {
    console.error("Fesih tarihi güncelleme hatası:", error);
    return NextResponse.json(
      { error: "Fesih tarihi güncellenirken bir hata oluştu" },
      { status: 500 }
    );
  }
}
