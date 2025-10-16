import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import fs from "fs/promises";
import path from "path";
import { createReadStream } from "fs";

export async function GET(
  request: NextRequest,
  { params }: { params: { filename: string } }
) {
  try {
    // Check authentication and admin role
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const filename = decodeURIComponent(params.filename);

    // Validate filename format for security
    const validFilenamePattern = /^dekont-yedek-\d{4}-\d{2}-\d{2}\.zip$/;
    if (!validFilenamePattern.test(filename)) {
      return NextResponse.json(
        { error: "Geçersiz dosya adı" },
        { status: 400 }
      );
    }

    // Define file path
    const tempDir = path.join(process.cwd(), "temp");
    const filePath = path.join(tempDir, filename);

    try {
      // Check if file exists
      await fs.access(filePath);
      const stats = await fs.stat(filePath);

      // Create readable stream
      const fileStream = createReadStream(filePath);

      // Set appropriate headers
      const response = new NextResponse(fileStream as any, {
        status: 200,
        headers: {
          "Content-Type": "application/zip",
          "Content-Length": stats.size.toString(),
          "Content-Disposition": `attachment; filename="${filename}"`,
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      });

      // Schedule file cleanup after 5 minutes
      setTimeout(async () => {
        try {
          await fs.unlink(filePath);
          console.log(`Cleaned up temporary backup file: ${filename}`);
        } catch (cleanupError) {
          console.warn(
            `Could not clean up temporary backup file: ${filename}`,
            cleanupError
          );
        }
      }, 5 * 60 * 1000); // 5 minutes

      return response;
    } catch (fileError) {
      console.error("File access error:", fileError);
      return NextResponse.json(
        { error: "Yedek dosyası bulunamadı" },
        { status: 404 }
      );
    }
  } catch (error) {
    console.error("Files backup download error:", error);
    return NextResponse.json(
      { error: "Dosya indirme sırasında hata oluştu" },
      { status: 500 }
    );
  }
}
