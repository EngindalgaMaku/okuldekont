import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateAuthAndRole } from "@/middleware/auth";
import { ValidationFunctions } from "@/lib/validation";
import { encryptFinancialData, decryptFinancialData } from "@/lib/encryption";

// Update dekont amount - ADMIN ONLY
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await validateAuthAndRole(request, ["ADMIN"]);
  if (!authResult.success) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    );
  }

  try {
    const { id } = await params;
    const { amount } = await request.json();

    if (!id) {
      return NextResponse.json(
        { error: "Dekont ID'si gerekli" },
        { status: 400 }
      );
    }

    // ID formatını validate et
    const idValidation = ValidationFunctions.id(id);
    if (!idValidation.valid) {
      return NextResponse.json(
        { error: `Geçersiz ID formatı: ${idValidation.error}` },
        { status: 400 }
      );
    }

    // Amount validation
    if (amount !== null && amount !== undefined) {
      const numericAmount = Number(amount);
      if (isNaN(numericAmount) || numericAmount < 0) {
        return NextResponse.json(
          { error: "Geçersiz tutar değeri" },
          { status: 400 }
        );
      }
    }

    // Check if dekont exists
    const existingDekont = await prisma.dekont.findUnique({
      where: { id },
      include: {
        staj: {
          include: {
            student: {
              select: {
                name: true,
                surname: true,
              },
            },
          },
        },
      },
    });

    if (!existingDekont) {
      return NextResponse.json({ error: "Dekont bulunamadı" }, { status: 404 });
    }

    // Convert amount to decimal (no encryption needed anymore)
    const decimalAmount =
      amount !== null && amount !== undefined ? Number(amount) : null;

    // Update the dekont amount
    const updatedDekont = await prisma.dekont.update({
      where: { id },
      data: {
        amount: decimalAmount,
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
              },
            },
          },
        },
      },
    });

    // Log the update for security audit
    console.log(`💰 AMOUNT UPDATE: Dekont amount updated`, {
      dekontId: id,
      studentName: `${existingDekont.staj?.student?.name} ${existingDekont.staj?.student?.surname}`,
      updatedBy: authResult.user?.id,
      timestamp: new Date().toISOString(),
    });

    // Return the updated amount (already in decimal format)
    const finalAmount = updatedDekont.amount
      ? Number(updatedDekont.amount)
      : null;

    return NextResponse.json({
      success: true,
      amount: finalAmount,
      message: "Tutar başarıyla güncellendi",
    });
  } catch (error) {
    console.error("Dekont tutar güncellenirken hata:", error);
    return NextResponse.json(
      { error: "Tutar güncellenirken bir hata oluştu" },
      { status: 500 }
    );
  }
}
