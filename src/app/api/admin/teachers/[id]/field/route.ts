import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    console.log("PUT request received for teacher field update");
    const { id } = await context.params;
    console.log("Teacher ID:", id);
    const { alanId } = await request.json();
    console.log("New alanId:", alanId);

    if (!id) {
      return NextResponse.json(
        { error: "Öğretmen ID'si gerekli" },
        { status: 400 }
      );
    }

    // Validate alanId if provided
    if (alanId && typeof alanId !== "string") {
      return NextResponse.json(
        { error: "Geçersiz alan ID'si" },
        { status: 400 }
      );
    }

    // Check if teacher exists
    const teacher = await prisma.teacherProfile.findUnique({
      where: { id: id },
    });

    if (!teacher) {
      return NextResponse.json(
        { error: "Öğretmen bulunamadı" },
        { status: 404 }
      );
    }

    // If alanId is provided, check if field exists
    if (alanId) {
      const field = await prisma.alan.findUnique({
        where: { id: alanId },
      });

      if (!field) {
        return NextResponse.json({ error: "Alan bulunamadı" }, { status: 404 });
      }
    }

    // Update teacher's field
    const updatedTeacher = await prisma.teacherProfile.update({
      where: { id: id },
      data: {
        alanId: alanId || null,
      },
      include: {
        alan: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Öğretmen alanı başarıyla güncellendi",
      teacher: {
        id: updatedTeacher.id,
        name: updatedTeacher.name,
        surname: updatedTeacher.surname,
        alanId: updatedTeacher.alanId,
        alan: updatedTeacher.alan,
      },
    });
  } catch (error) {
    console.error("Teacher field update error:", error);
    return NextResponse.json(
      {
        error:
          "Öğretmen alanı güncellenirken hata oluştu: " +
          (error as Error).message,
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
