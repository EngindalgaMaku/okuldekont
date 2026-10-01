import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureTeacherIssueReportsTable } from "@/lib/teacher-issues";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    await ensureTeacherIssueReportsTable();

    const session = await getServerSession(authOptions);
    const formData = await request.formData();

    // Teacher ID resolution
    let teacherId = (session?.user as any)?.teacherId || (session?.user as any)?.id;
    const bodyTeacherId = formData.get("teacherId") as string | null;

    if (!teacherId && bodyTeacherId) {
      teacherId = bodyTeacherId;
    }

    if (!teacherId) {
      return NextResponse.json(
        { error: "Öğretmen kimliği doğrulanamadı" },
        { status: 401 }
      );
    }

    // Verify teacher exists
    const teacher = await prisma.teacherProfile.findUnique({
      where: { id: teacherId },
      select: { id: true, name: true, surname: true },
    });

    if (!teacher) {
      return NextResponse.json(
        { error: "Öğretmen profili bulunamadı" },
        { status: 404 }
      );
    }

    const category = (formData.get("category") as string) || "DIGER";
    const title = (formData.get("title") as string) || null;
    const message = (formData.get("message") as string) || "";
    const studentInfo = (formData.get("studentInfo") as string) || null;
    const companyInfo = (formData.get("companyInfo") as string) || null;
    const audioDurationStr = formData.get("audioDuration") as string | null;
    const audioDuration = audioDurationStr ? parseInt(audioDurationStr, 10) : null;

    const audioFile = formData.get("audio") as File | null;
    let audioUrl: string | null = null;

    if (audioFile && audioFile.size > 0) {
      const bytes = await audioFile.arrayBuffer();
      const buffer = Buffer.from(bytes);

      const uploadDir = join(process.cwd(), "public", "uploads", "voice-notes");
      if (!existsSync(uploadDir)) {
        await mkdir(uploadDir, { recursive: true });
      }

      // Determine extension
      let ext = "webm";
      if (audioFile.type?.includes("mp4") || audioFile.name?.endsWith(".m4a")) {
        ext = "m4a";
      } else if (audioFile.type?.includes("wav") || audioFile.name?.endsWith(".wav")) {
        ext = "wav";
      } else if (audioFile.type?.includes("mp3") || audioFile.name?.endsWith(".mp3")) {
        ext = "mp3";
      }

      const fileName = `voice_${teacherId}_${Date.now()}_${Math.random()
        .toString(36)
        .substring(2, 7)}.${ext}`;
      const filePath = join(uploadDir, fileName);

      await writeFile(filePath, buffer);
      audioUrl = `/uploads/voice-notes/${fileName}`;
    }

    if (!message.trim() && !audioUrl) {
      return NextResponse.json(
        { error: "Lütfen yazılı bir açıklama girin veya ses kaydı yapın" },
        { status: 400 }
      );
    }

    const issue = await prisma.teacherIssueReport.create({
      data: {
        teacherId,
        category,
        title,
        message: message.trim() || (audioUrl ? "Sesli mesaj iletildi" : ""),
        audioUrl,
        audioDuration,
        studentInfo,
        companyInfo,
        status: "PENDING",
      },
    });

    return NextResponse.json({
      success: true,
      message: "Bildiriminiz başarıyla iletildi. İdare tarafından incelenecektir.",
      data: issue,
    });
  } catch (error) {
    console.error("Öğretmen talep bildirme hatası:", error);
    return NextResponse.json(
      { error: "Bildirim kaydedilirken bir hata oluştu: " + (error as Error).message },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    await ensureTeacherIssueReportsTable();

    const session = await getServerSession(authOptions);
    const { searchParams } = new URL(request.url);

    let teacherId = (session?.user as any)?.teacherId || (session?.user as any)?.id;
    const queryTeacherId = searchParams.get("teacherId");
    if (!teacherId && queryTeacherId) {
      teacherId = queryTeacherId;
    }

    if (!teacherId) {
      return NextResponse.json(
        { error: "Öğretmen kimliği doğrulanamadı" },
        { status: 401 }
      );
    }

    const issues = await prisma.teacherIssueReport.findMany({
      where: { teacherId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, data: issues });
  } catch (error) {
    console.error("Öğretmen talepleri getirme hatası:", error);
    return NextResponse.json(
      { error: "Talepler getirilirken bir hata oluştu" },
      { status: 500 }
    );
  }
}
