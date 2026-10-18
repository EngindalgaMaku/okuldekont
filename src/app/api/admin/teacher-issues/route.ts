import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureTeacherIssueReportsTable } from "@/lib/teacher-issues";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any)?.role !== "ADMIN") {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }

    await ensureTeacherIssueReportsTable();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "all";
    const category = searchParams.get("category") || "all";
    const search = searchParams.get("search") || "";

    const where: any = {};

    if (status !== "all") {
      where.status = status;
    }

    if (category !== "all") {
      where.category = category;
    }

    if (search.trim()) {
      where.OR = [
        { message: { contains: search.trim() } },
        { studentInfo: { contains: search.trim() } },
        { companyInfo: { contains: search.trim() } },
        {
          teacher: {
            OR: [
              { name: { contains: search.trim() } },
              { surname: { contains: search.trim() } },
            ],
          },
        },
      ];
    }

    const [reports, pendingCount, totalCount] = await Promise.all([
      prisma.teacherIssueReport.findMany({
        where,
        include: {
          teacher: {
            select: {
              id: true,
              name: true,
              surname: true,
              phone: true,
              email: true,
              alan: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.teacherIssueReport.count({
        where: { status: "PENDING" },
      }),
      prisma.teacherIssueReport.count(),
    ]);

    return NextResponse.json({
      success: true,
      data: reports,
      counts: {
        pending: pendingCount,
        total: totalCount,
      },
    });
  } catch (error) {
    console.error("Admin öğretmen bildirimleri hatası:", error);
    return NextResponse.json(
      { error: "Bildirimler getirilirken hata oluştu" },
      { status: 500 }
    );
  }
}
