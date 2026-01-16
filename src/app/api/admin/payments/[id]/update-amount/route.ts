import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateAuthAndRole } from "@/middleware/auth";
import { ValidationFunctions } from "@/lib/validation";

// Update monthly payment amount - ADMIN ONLY
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
        { error: "Ödeme ID'si gerekli" },
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

    // Check if payment exists
    const existingPayment = await prisma.monthlyPayment.findUnique({
      where: { id },
      include: {
        student: {
          select: {
            name: true,
            surname: true,
          },
        },
      },
    });

    if (!existingPayment) {
      return NextResponse.json({ error: "Ödeme bulunamadı" }, { status: 404 });
    }

    // Convert amount to decimal
    const decimalAmount =
      amount !== null && amount !== undefined ? Number(amount) : null;

    if (decimalAmount === null) {
      return NextResponse.json(
        { error: "Tutar boş olamaz" },
        { status: 400 }
      );
    }

    // Update the payment amount
    const updatedPayment = await prisma.monthlyPayment.update({
      where: { id },
      data: {
        amount: decimalAmount,
      },
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

    // Log the update for security audit
    console.log(`💰 PAYMENT AMOUNT UPDATE: Monthly payment amount updated`, {
      paymentId: id,
      studentName: `${existingPayment.student?.name} ${existingPayment.student?.surname}`,
      oldAmount: existingPayment.amount,
      newAmount: decimalAmount,
      updatedBy: authResult.user?.id,
      timestamp: new Date().toISOString(),
    });

    // Return the updated amount
    const finalAmount = updatedPayment.amount
      ? Number(updatedPayment.amount)
      : null;

    return NextResponse.json({
      success: true,
      amount: finalAmount,
      message: "Ödeme tutarı başarıyla güncellendi",
    });
  } catch (error) {
    console.error("Ödeme tutarı güncellenirken hata:", error);
    return NextResponse.json(
      { error: "Ödeme tutarı güncellenirken bir hata oluştu" },
      { status: 500 }
    );
  }
}
