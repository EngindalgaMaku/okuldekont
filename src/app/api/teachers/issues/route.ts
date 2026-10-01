import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureTeacherIssueReportsTable, deleteAudioFile } from "@/lib/teacher-issues";
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

    const audioFile = formData.get("audio");
    const audioBase64 = formData.get("audioBase64") as string | null;
    let audioUrl: string | null = null;
    let savedBase64: string | null = null;

    const uploadDir = join(process.cwd(), "public", "uploads", "voice-notes");
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    let buffer: Buffer | null = null;
    let ext = "webm";

    // 1. Check if audio file was uploaded as File / Blob
    if (audioFile && typeof audioFile === "object" && "arrayBuffer" in audioFile) {
      try {
        const fileObj = audioFile as unknown as File;
        const bytes = await fileObj.arrayBuffer();
        if (bytes.byteLength > 0) {
          buffer = Buffer.from(bytes);
          if (fileObj.type?.includes("mp4") || fileObj.name?.endsWith(".mp4") || fileObj.name?.endsWith(".m4a")) {
            ext = "m4a";
          } else if (fileObj.type?.includes("wav") || fileObj.name?.endsWith(".wav")) {
            ext = "wav";
          } else if (fileObj.type?.includes("mp3") || fileObj.name?.endsWith(".mp3")) {
            ext = "mp3";
          } else if (fileObj.type?.includes("ogg") || fileObj.name?.endsWith(".ogg")) {
            ext = "ogg";
          }
        }
      } catch (err) {
        console.error("Audio Blob read error:", err);
      }
    }

    // 2. Fallback to audioBase64 if Blob buffer is empty
    if ((!buffer || buffer.length === 0) && audioBase64 && audioBase64.length > 50) {
      try {
        let rawBase64 = audioBase64;
        const matches = audioBase64.match(/^data:audio\/([a-zA-Z0-9_-]+);base64,(.+)$/);
        if (matches && matches.length === 3) {
          const detectedExt = matches[1].toLowerCase();
          ext = detectedExt === "mpeg" ? "mp3" : detectedExt;
          rawBase64 = matches[2];
        } else if (audioBase64.includes("base64,")) {
          rawBase64 = audioBase64.split("base64,")[1];
        }
        buffer = Buffer.from(rawBase64, "base64");
      } catch (err) {
        console.error("Audio Base64 read error:", err);
      }
    }

    // 3. If we have a buffer, write to disk and prepare savedBase64
    if (buffer && buffer.length > 0) {
      const fileName = `voice_${teacherId}_${Date.now()}_${Math.random()
        .toString(36)
        .substring(2, 7)}.${ext}`;
      const filePath = join(uploadDir, fileName);

      try {
        await writeFile(filePath, buffer);
      } catch (err) {
        console.error("Audio disk write error:", err);
      }

      audioUrl = `/api/voice-notes/${fileName}`;

      if (audioBase64 && audioBase64.startsWith("data:audio")) {
        savedBase64 = audioBase64;
      } else {
        const mimeType =
          ext === "m4a" || ext === "mp4"
            ? "audio/mp4"
            : ext === "wav"
            ? "audio/wav"
            : ext === "mp3"
            ? "audio/mpeg"
            : ext === "ogg"
            ? "audio/ogg"
            : "audio/webm";
        savedBase64 = `data:${mimeType};base64,${buffer.toString("base64")}`;
      }
    }

    if (!message.trim() && !audioUrl && !savedBase64) {
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
        audioBase64: savedBase64,
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

export async function DELETE(request: NextRequest) {
  try {
    await ensureTeacherIssueReportsTable();

    const session = await getServerSession(authOptions);
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Bildirim ID gerekli" }, { status: 400 });
    }

    let teacherId = (session?.user as any)?.teacherId || (session?.user as any)?.id;
    const queryTeacherId = searchParams.get("teacherId");
    if (!teacherId && queryTeacherId) {
      teacherId = queryTeacherId;
    }

    // Verify ownership
    const issue = await prisma.teacherIssueReport.findUnique({
      where: { id },
    });

    if (!issue) {
      return NextResponse.json({ error: "Bildirim bulunamadı" }, { status: 404 });
    }

    if (issue.teacherId !== teacherId && (session?.user as any)?.role !== "ADMIN") {
      return NextResponse.json({ error: "Bu bildirimi silme yetkiniz yok" }, { status: 403 });
    }

    // Delete audio file if exists
    if (issue.audioUrl) {
      await deleteAudioFile(issue.audioUrl);
    }

    await prisma.teacherIssueReport.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: "Bildirim silindi" });
  } catch (error) {
    console.error("Öğretmen bildirim silme hatası:", error);
    return NextResponse.json(
      { error: "Bildirim silinirken hata oluştu" },
      { status: 500 }
    );
  }
}
