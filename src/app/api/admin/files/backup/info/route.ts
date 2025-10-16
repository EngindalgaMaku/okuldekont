import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import fs from "fs/promises";
import path from "path";

export async function GET(request: NextRequest) {
  try {
    // Check authentication and admin role
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin (you may need to adjust this based on your auth system)
    // For now, assuming any authenticated user can access this
    // You should implement proper admin role checking here

    // Define the dekontlar uploads directory
    const uploadsDir = path.join(
      process.cwd(),
      "public",
      "uploads",
      "dekontlar"
    );

    try {
      // Check if directory exists
      await fs.access(uploadsDir);
    } catch (error) {
      return NextResponse.json(
        {
          error: "Dekontlar klasörü bulunamadı",
          folderPath: uploadsDir,
        },
        { status: 404 }
      );
    }

    // Get directory information
    const files = await fs.readdir(uploadsDir, { withFileTypes: true });

    let totalFiles = 0;
    let totalSize = 0;
    let lastModified = new Date(0); // Start with epoch

    // Process each file
    for (const file of files) {
      if (file.isFile()) {
        const filePath = path.join(uploadsDir, file.name);
        try {
          const stats = await fs.stat(filePath);
          totalFiles++;
          totalSize += stats.size;

          // Track latest modification date
          if (stats.mtime > lastModified) {
            lastModified = stats.mtime;
          }
        } catch (fileError) {
          console.warn(`Could not get stats for file: ${file.name}`, fileError);
        }
      }
    }

    return NextResponse.json({
      totalFiles,
      totalSize,
      lastModified: lastModified.toISOString(),
      folderPath: uploadsDir,
    });
  } catch (error) {
    console.error("Files backup info error:", error);
    return NextResponse.json(
      { error: "Klasör bilgisi alınırken hata oluştu" },
      { status: 500 }
    );
  }
}
