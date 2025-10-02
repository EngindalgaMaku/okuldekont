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

    // Encrypt the new amount
    const encryptedAmount =
      amount !== null && amount !== undefined
        ? encryptFinancialData(amount.toString())
        : null;

    // Update the dekont amount
    const updatedDekont = await prisma.dekont.update({
      where: { id },
      data: {
        amount: encryptedAmount,
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

    // Return the updated amount (decrypted for frontend)
    const decryptedAmount = updatedDekont.amount
      ? Number(decryptFinancialData(updatedDekont.amount.toString()))
      : null;

    return NextResponse.json({
      success: true,
      amount: decryptedAmount,
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
