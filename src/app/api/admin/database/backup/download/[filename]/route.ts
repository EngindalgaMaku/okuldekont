import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

export async function GET(
  request: NextRequest,
  { params }: { params: { filename: string } }
) {
  try {
    const filename = params.filename;

    // Güvenlik kontrolü: sadece .sql dosyalarına izin ver
    if (
      !filename.endsWith(".sql") ||
      filename.includes("..") ||
      filename.includes("/")
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Geçersiz dosya adı",
        },
        { status: 400 }
      );
    }

    const backupsDir = path.join(process.cwd(), "backups");
    const filePath = path.join(backupsDir, filename);

    try {
      // Dosya var mı kontrol et
      await fs.access(filePath);
      const stats = await fs.stat(filePath);

      // Dosyayı oku
      const fileBuffer = await fs.readFile(filePath);

      // Response headers
      const headers = new Headers();
      headers.set("Content-Type", "application/sql");
      headers.set("Content-Disposition", `attachment; filename="${filename}"`);
      headers.set("Content-Length", stats.size.toString());
      headers.set("Cache-Control", "no-cache");

      console.log(
        `📥 Backup dosyası indiriliyor: ${filename} (${Math.round(
          stats.size / 1024
        )} KB)`
      );

      return new NextResponse(new Uint8Array(fileBuffer), {
        status: 200,
        headers,
      });
    } catch (error) {
      console.error("File access error:", error);
      return NextResponse.json(
        {
          success: false,
          message: "Backup dosyası bulunamadı",
        },
        { status: 404 }
      );
    }
  } catch (error: any) {
    console.error("Download backup error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Backup dosyası indirilemedi",
        error: error.message,
      },
      { status: 500 }
    );
  }
}
