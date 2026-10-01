import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureTeacherIssueReportsTable } from "@/lib/teacher-issues";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any)?.role !== "ADMIN") {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "ID gerekli" }, { status: 400 });
    }

    await ensureTeacherIssueReportsTable();

    const body = await request.json();
    const { status, adminNote } = body;

    const updateData: any = {};
    if (status) {
      updateData.status = status;
      if (status === "RESOLVED") {
        updateData.resolvedAt = new Date();
        updateData.resolvedBy = (session.user as any)?.name || "Admin";
      }
    }
    if (adminNote !== undefined) {
      updateData.adminNote = adminNote;
    }

    const updated = await prisma.teacherIssueReport.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      message: "Bildirim durumu güncellendi",
      data: updated,
    });
  } catch (error) {
    console.error("Admin bildirim güncelleme hatası:", error);
    return NextResponse.json(
      { error: "Bildirim güncellenirken hata oluştu" },
      { status: 500 }
    );
  }
}
