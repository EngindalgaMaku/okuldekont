export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateAuthAndRole } from "@/middleware/auth";
import { join, basename } from "path";
import { existsSync, readdirSync } from "fs";

export async function GET(request: NextRequest) {
  const authResult = await validateAuthAndRole(request, ["ADMIN"]);
  if (!authResult.success) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    );
  }

  try {
    const candidateDirs = [
      join(process.cwd(), "public", "uploads", "dekontlar"),
      join(process.cwd(), "..", "public", "uploads", "dekontlar"),
      join(process.cwd(), "..", "..", "public", "uploads", "dekontlar"),
      "/app/public/uploads/dekontlar",
    ];

    let uploadsDir = candidateDirs[0];
    for (const d of candidateDirs) {
      if (existsSync(d) && readdirSync(d).length > 0) {
        uploadsDir = d;
        break;
      }
    }

    let diskFiles: string[] = [];
    if (existsSync(uploadsDir)) {
      diskFiles = readdirSync(uploadsDir);
    }

    const diskFilesSet = new Set(diskFiles.map((f) => f.toLowerCase()));

    const allDekontlar = await prisma.dekont.findMany({
      include: {
        student: {
          select: {
            id: true,
            name: true,
            surname: true,
            number: true,
          },
        },
        company: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: [{ year: "desc" }, { month: "desc" }],
    });

    const foundList: any[] = [];
    const missingList: any[] = [];
    const matchedDiskFiles = new Set<string>();

    for (const d of allDekontlar) {
      const fileUrl = d.fileUrl || "";
      const fileName = fileUrl ? basename(fileUrl) : "";
      const lowerName = fileName.toLowerCase();

      const existsOnDisk =
        Boolean(fileName) &&
        (diskFilesSet.has(lowerName) ||
          existsSync(join(process.cwd(), "public", fileUrl.replace(/^\//, ""))));

      const itemInfo = {
        id: d.id,
        ogrenci: d.student ? `${d.student.name} ${d.student.surname}` : "Bilinmiyor",
        ogrenciNo: d.student?.number || "",
        isletme: d.company?.name || "Bilinmiyor",
        ay: d.month,
        yil: d.year,
        fileUrl: d.fileUrl,
        fileName: fileName,
        durum: d.status,
      };

      if (existsOnDisk) {
        matchedDiskFiles.add(lowerName);
        foundList.push(itemInfo);
      } else {
        // Diskte benzer bir dosya var mı bak (öğrenci adı ve ay içeriyor mu?)
        const studentSlug = d.student
          ? `${d.student.name}_${d.student.surname}`
              .toLowerCase()
              .replace(/[^a-z0-9]/g, "_")
          : "";
        const candidate = diskFiles.find(
          (f) =>
            studentSlug &&
            f.toLowerCase().includes(studentSlug.split("_")[0]) &&
            f.toLowerCase().includes(String(d.year))
        );

        missingList.push({
          ...itemInfo,
          suggestedMatch: candidate || null,
        });
      }
    }

    const unlinkedDiskFiles = diskFiles.filter(
      (f) => !matchedDiskFiles.has(f.toLowerCase())
    );

    return NextResponse.json({
      summary: {
        totalDbRecords: allDekontlar.length,
        totalFilesOnDisk: diskFiles.length,
        matchingFoundCount: foundList.length,
        missingFilesCount: missingList.length,
        unlinkedDiskFilesCount: unlinkedDiskFiles.length,
        status: missingList.length === 0 ? "TAMAM (TÜM DOSYALAR MEVCUT)" : "EKSIK DOSYALAR VAR",
      },
      debug: {
        cwd: process.cwd(),
        resolvedUploadsDir: uploadsDir,
        exists: existsSync(uploadsDir),
        candidateChecks: candidateDirs.map((c) => ({
          path: c,
          exists: existsSync(c),
          fileCount: existsSync(c) ? readdirSync(c).length : 0,
        })),
      },
      missingFiles: missingList,
      unlinkedFilesOnDiskSample: unlinkedDiskFiles.slice(0, 30),
    });
  } catch (error: any) {
    console.error("Dekont dosya kontrol hatası:", error);
    return NextResponse.json(
      { error: "Dosya kontrolü sırasında hata oluştu", details: error.message },
      { status: 500 }
    );
  }
}
