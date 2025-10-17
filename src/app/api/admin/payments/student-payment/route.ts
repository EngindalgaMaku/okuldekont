import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const stajId = searchParams.get("stajId");
    const month = searchParams.get("month");
    const year = searchParams.get("year");

    if (!stajId || !month || !year) {
      return NextResponse.json(
        { error: "Eksik parametreler" },
        { status: 400 }
      );
    }

    const monthNum = parseInt(month);
    const yearNum = parseInt(year);

    if (isNaN(monthNum) || isNaN(yearNum)) {
      return NextResponse.json(
        { error: "Geçersiz ay veya yıl" },
        { status: 400 }
      );
    }

    // Aktif eğitim yılını al
    const activeEducationYear = await prisma.egitimYili.findFirst({
      where: { active: true },
    });

    if (!activeEducationYear) {
      return NextResponse.json(
        { error: "Aktif eğitim yılı bulunamadı" },
        { status: 400 }
      );
    }

    // Staj bilgisini al
    const staj = await prisma.staj.findUnique({
      where: { id: stajId },
      select: {
        id: true,
        studentId: true,
        companyId: true,
        status: true,
      },
    });

    if (!staj) {
      return NextResponse.json({ error: "Staj bulunamadı" }, { status: 404 });
    }

    // Bu öğrenci için ödeme kaydını ara
    const monthlyPayment = await prisma.monthlyPayment.findFirst({
      where: {
        studentId: staj.studentId,
        month: monthNum,
        year: yearNum,
        educationYearId: activeEducationYear.id,
      },
      select: {
        amount: true,
        paymentType: true,
        status: true,
        importSource: true,
      },
    });

    // Bu öğrenci için aynı ay/yıl ve işletmede mevcut dekont var mı kontrol et
    const existingDekont = await prisma.dekont.findFirst({
      where: {
        stajId: stajId,
        month: monthNum,
        year: yearNum,
        companyId: staj.companyId,
      },
      select: {
        id: true,
        status: true,
        amount: true,
        createdAt: true,
      },
    });

    const response: any = {
      paymentInfo: monthlyPayment
        ? {
            found: true,
            amount: monthlyPayment.amount,
            paymentType: monthlyPayment.paymentType,
            status: monthlyPayment.status,
            source: monthlyPayment.importSource || "Manuel",
          }
        : {
            found: false,
            amount: null,
          },
      existingDekont: existingDekont
        ? {
            exists: true,
            status: existingDekont.status,
            amount: existingDekont.amount,
            createdAt: existingDekont.createdAt,
            isApproved: existingDekont.status === "APPROVED",
          }
        : {
            exists: false,
            status: null,
            amount: null,
            createdAt: null,
            isApproved: false,
          },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Student payment info error:", error);
    return NextResponse.json(
      { error: "Ödeme bilgisi alınırken hata oluştu" },
      { status: 500 }
    );
  }
}
