import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import fs from "fs/promises";
import path from "path";
import archiver from "archiver";
import { createWriteStream } from "fs";

export async function POST(request: NextRequest) {
  try {
    // Check authentication and admin role
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Generate filename with current date
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const dateString = `${year}-${month}-${day}`;
    const zipFileName = `dekont-yedek-${dateString}.zip`;

    // Define paths
    const uploadsDir = path.join(
      process.cwd(),
      "public",
      "uploads",
      "dekontlar"
    );
    const tempDir = path.join(process.cwd(), "temp");
    const zipPath = path.join(tempDir, zipFileName);

    // Ensure temp directory exists
    try {
      await fs.mkdir(tempDir, { recursive: true });
    } catch (error) {
      console.log("Temp directory already exists or created");
    }

    // Check if uploads directory exists
    try {
      await fs.access(uploadsDir);
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          message: "Dekontlar klasörü bulunamadı",
        },
        { status: 404 }
      );
    }

    // Get files info first
    const files = await fs.readdir(uploadsDir, { withFileTypes: true });
    const validFiles = files.filter((file) => file.isFile());

    if (validFiles.length === 0) {
      return NextResponse.json({
        success: false,
        message: "Yedeklenecek dosya bulunamadı",
      });
    }

    // Create ZIP archive
    return new Promise<NextResponse>((resolve, reject) => {
      const output = createWriteStream(zipPath);
      const archive = archiver("zip", {
        zlib: { level: 9 }, // Maximum compression
      });

      let totalFiles = 0;
      let totalSize = 0;

      // Handle archive events
      output.on("close", async () => {
        try {
          const stats = await fs.stat(zipPath);
          resolve(
            NextResponse.json({
              success: true,
              message: `${totalFiles} dosya başarıyla yedeklendi`,
              fileName: zipFileName,
              fileSize: stats.size,
              totalFiles: totalFiles,
            })
          );
        } catch (error) {
          console.error("Error getting ZIP stats:", error);
          resolve(
            NextResponse.json({
              success: false,
              message: "Yedek dosyası oluşturuldu ancak bilgiler alınamadı",
            })
          );
        }
      });

      output.on("error", (err) => {
        console.error("Output stream error:", err);
        reject(
          NextResponse.json(
            {
              success: false,
              message: "Yedek dosyası yazılırken hata oluştu",
            },
            { status: 500 }
          )
        );
      });

      archive.on("error", (err) => {
        console.error("Archive error:", err);
        reject(
          NextResponse.json(
            {
              success: false,
              message: "ZIP arşivi oluşturulurken hata oluştu",
            },
            { status: 500 }
          )
        );
      });

      archive.on("entry", (entry) => {
        totalFiles++;
        totalSize += entry.stats?.size || 0;
      });

      // Pipe archive data to the file
      archive.pipe(output);

      // Add files to archive
      try {
        validFiles.forEach((file) => {
          const filePath = path.join(uploadsDir, file.name);
          archive.file(filePath, { name: file.name });
        });

        // Finalize the archive
        archive.finalize();
      } catch (error) {
        console.error("Error adding files to archive:", error);
        reject(
          NextResponse.json(
            {
              success: false,
              message: "Dosyalar arşive eklenirken hata oluştu",
            },
            { status: 500 }
          )
        );
      }
    });
  } catch (error) {
    console.error("Files backup creation error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Yedek oluşturulurken hata oluştu",
      },
      { status: 500 }
    );
  }
}
