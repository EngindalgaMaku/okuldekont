import { NextRequest, NextResponse } from "next/server";
import { join } from "path";
import { readFileSync, existsSync } from "fs";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(
  request: NextRequest,
  { params }: { params: { filename: string } }
) {
  try {
    // Session kontrolü
    const session = await getServerSession(authOptions);
    if (
      !session ||
      (session.user.role !== "ADMIN" && session.user.role !== "TEACHER")
    ) {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }

    const filename = params.filename;
    if (!filename) {
      return NextResponse.json(
        { error: "Dosya adı bulunamadı" },
        { status: 400 }
      );
    }

    // Dekont dosya yolu
    const filePath = join(
      process.cwd(),
      "public",
      "uploads",
      "dekontlar",
      filename
    );

    // Dosya var mı kontrol et
    if (!existsSync(filePath)) {
      console.error(`Dosya bulunamadı: ${filePath}`);
      return NextResponse.json({ error: "Dosya bulunamadı" }, { status: 404 });
    }

    try {
      // Dosyayı oku
      const fileBuffer = readFileSync(filePath);
      const fileExtension = filename.split(".").pop()?.toLowerCase();

      // MIME type belirleme
      let contentType = "application/octet-stream";
      let disposition = "inline";

      switch (fileExtension) {
        case "pdf":
          contentType = "application/pdf";
          break;
        case "jpg":
        case "jpeg":
          contentType = "image/jpeg";
          break;
        case "png":
          contentType = "image/png";
          break;
        case "gif":
          contentType = "image/gif";
          break;
        case "doc":
          contentType = "application/msword";
          disposition = "attachment"; // Word dosyaları için
          break;
        case "docx":
          contentType =
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
          disposition = "attachment"; // Word dosyaları için
          break;
        case "txt":
          contentType = "text/plain; charset=utf-8";
          break;
        default:
          disposition = "attachment";
          break;
      }

      // Response headers
      const headers = new Headers();
      headers.set("Content-Type", contentType);
      headers.set(
        "Content-Disposition",
        `${disposition}; filename="${encodeURIComponent(filename)}"`
      );
      headers.set("Cache-Control", "no-cache, no-store, must-revalidate");
      headers.set("Pragma", "no-cache");
      headers.set("Expires", "0");

      // PDF ve resim dosyaları için CSP header ekle
      if (["pdf", "jpg", "jpeg", "png", "gif"].includes(fileExtension || "")) {
        headers.set("X-Frame-Options", "SAMEORIGIN");
        headers.set(
          "Content-Security-Policy",
          "default-src 'self'; object-src 'none';"
        );
      }

      return new NextResponse(fileBuffer, {
        status: 200,
        headers,
      });
    } catch (fileError) {
      console.error("Dosya okuma hatası:", fileError);
      return NextResponse.json({ error: "Dosya okunamadı" }, { status: 500 });
    }
  } catch (error) {
    console.error("Dekont önizleme hatası:", error);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
