import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { join } from "path";
import { existsSync } from "fs";
import { readFile, unlink } from "fs/promises";

let tableEnsured = false;

export async function ensureTeacherIssueReportsTable() {
  if (tableEnsured) return;

  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS teacher_issue_reports (
        id VARCHAR(191) NOT NULL PRIMARY KEY,
        teacherId VARCHAR(191) NOT NULL,
        category VARCHAR(100) NOT NULL,
        title VARCHAR(255) NULL,
        message TEXT NULL,
        audioUrl VARCHAR(500) NULL,
        audioDuration INT NULL,
        audioBase64 LONGTEXT NULL,
        studentInfo VARCHAR(255) NULL,
        companyInfo VARCHAR(255) NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
        adminNote TEXT NULL,
        resolvedAt DATETIME(3) NULL,
        resolvedBy VARCHAR(191) NULL,
        createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        updatedAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
        INDEX idx_teacher_issue_reports_teacherId (teacherId),
        INDEX idx_teacher_issue_reports_status (status)
      ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    `);

    // Safely add audioBase64 column if table was created previously without it
    try {
      await prisma.$executeRawUnsafe(`
        ALTER TABLE teacher_issue_reports ADD COLUMN audioBase64 LONGTEXT NULL;
      `);
    } catch {
      // Column probably already exists
    }

    tableEnsured = true;
  } catch (error) {
    console.error("Error ensuring teacher_issue_reports table:", error);
    tableEnsured = true;
  }
}

export async function serveVoiceNote(request: NextRequest, filename: string) {
  if (!filename || filename.includes("..") || filename.includes("/") || filename.includes("\\")) {
    return NextResponse.json({ error: "Geçersiz dosya adı" }, { status: 400 });
  }

  const safeFilename = filename.replace(/[^a-zA-Z0-9_.-]/g, "");
  const uploadDir = join(process.cwd(), "public", "uploads", "voice-notes");
  const filePath = join(uploadDir, safeFilename);

  let fileBuffer: Buffer | null = null;
  let extension = safeFilename.split(".").pop()?.toLowerCase() || "webm";

  // 1. Try reading from disk
  if (existsSync(filePath)) {
    try {
      fileBuffer = await readFile(filePath);
    } catch (err) {
      console.error("Audio disk read error:", err);
    }
  }

  // 2. If not found on disk, look in database (teacher_issue_reports)
  if (!fileBuffer || fileBuffer.length === 0) {
    try {
      await ensureTeacherIssueReportsTable();
      const report = await prisma.teacherIssueReport.findFirst({
        where: {
          OR: [
            { audioUrl: { contains: safeFilename } },
            { id: safeFilename.replace(/\.[^/.]+$/, "") },
          ],
        },
        select: { audioBase64: true, audioUrl: true },
      });

      if (report?.audioBase64) {
        let rawBase64 = report.audioBase64;
        if (rawBase64.includes("base64,")) {
          const parts = rawBase64.split("base64,");
          const mimeMatch = parts[0].match(/data:audio\/([a-zA-Z0-9_-]+);/);
          if (mimeMatch) {
            const detectedExt = mimeMatch[1].toLowerCase();
            extension = detectedExt === "mpeg" ? "mp3" : detectedExt;
          }
          rawBase64 = parts[1];
        }
        fileBuffer = Buffer.from(rawBase64, "base64");
      }
    } catch (err) {
      console.error("Audio DB fallback error:", err);
    }
  }

  if (!fileBuffer || fileBuffer.length === 0) {
    return NextResponse.json({ error: "Ses dosyası bulunamadı" }, { status: 404 });
  }

  // Determine MIME type
  let contentType = "audio/webm";
  if (extension === "mp4" || extension === "m4a" || extension === "aac") {
    contentType = "audio/mp4";
  } else if (extension === "wav") {
    contentType = "audio/wav";
  } else if (extension === "mp3" || extension === "mpeg") {
    contentType = "audio/mpeg";
  } else if (extension === "ogg" || extension === "opus") {
    contentType = "audio/ogg";
  }

  const totalSize = fileBuffer.length;
  const rangeHeader = request.headers.get("range");

  // Support HTTP 206 Partial Content (critical for iOS Safari and browser audio seeking)
  if (rangeHeader) {
    const parts = rangeHeader.replace(/bytes=/, "").split("-");
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : totalSize - 1;

    if (isNaN(start) || start >= totalSize || end >= totalSize || start > end) {
      return new Response("Requested range not satisfiable", {
        status: 416,
        headers: { "Content-Range": `bytes */${totalSize}` },
      });
    }

    const chunk = fileBuffer.subarray(start, end + 1);
    return new Response(new Uint8Array(chunk), {
      status: 206,
      headers: {
        "Content-Range": `bytes ${start}-${end}/${totalSize}`,
        "Accept-Ranges": "bytes",
        "Content-Length": chunk.length.toString(),
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  }

  return new Response(new Uint8Array(fileBuffer), {
    status: 200,
    headers: {
      "Accept-Ranges": "bytes",
      "Content-Length": totalSize.toString(),
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}

export async function deleteAudioFile(audioUrl: string | null) {
  if (!audioUrl) return;
  try {
    const filename = audioUrl.split("/").pop();
    if (!filename) return;
    const safeFilename = filename.replace(/[^a-zA-Z0-9_.-]/g, "");
    const filepath = join(process.cwd(), "public", "uploads", "voice-notes", safeFilename);
    if (existsSync(filepath)) {
      await unlink(filepath);
    }
  } catch (err) {
    console.error("Audio deletion error:", err);
  }
}
