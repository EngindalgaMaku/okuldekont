import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import archiver from "archiver";
import { readFile, access } from "fs/promises";
import path from "path";
import { constants } from "fs";

export async function POST(request: NextRequest) {
  try {
    // Session kontrolü
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Oturum gerekli" }, { status: 401 });
    }

    // Admin kontrolü
    if (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "Admin yetkisi gerekli" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { month, year } = body;

    if (!month || !year) {
      return NextResponse.json({ error: "Ay ve yıl gerekli" }, { status: 400 });
    }

    // Seçilen ay ve yıla ait dekontları getir
    const dekontlar = await prisma.dekont.findMany({
      where: {
        month: month,
        year: year,
        fileUrl: {
          not: null,
        },
        archived: false,
      },
      include: {
        staj: {
          include: {
            student: {
              include: {
                alan: {
                  select: {
                    name: true,
                  },
                },
              },
            },
            company: {
              select: {
                name: true,
              },
            },
            teacher: {
              select: {
                name: true,
                surname: true,
              },
            },
          },
        },
        teacher: {
          select: {
            name: true,
            surname: true,
          },
        },
      },
    });

    if (dekontlar.length === 0) {
      return NextResponse.json(
        { error: "Bu ay için dekont bulunamadı" },
        { status: 404 }
      );
    }

    // Öğretmenlere göre grupla
    const dekontlarByTeacher = dekontlar.reduce((acc, dekont) => {
      const teacherName = dekont.teacher
        ? `${dekont.teacher.name} ${dekont.teacher.surname}`
        : dekont.staj?.teacher
        ? `${dekont.staj.teacher.name} ${dekont.staj.teacher.surname}`
        : "Bilinmeyen_Ogretmen";

      // Türkçe karakterleri temizle
      const cleanTeacherName = teacherName
        .replace(/[çÇ]/g, "c")
        .replace(/[ğĞ]/g, "g")
        .replace(/[ıİ]/g, "i")
        .replace(/[öÖ]/g, "o")
        .replace(/[şŞ]/g, "s")
        .replace(/[üÜ]/g, "u")
        .replace(/[^a-zA-Z0-9_]/g, "_");

      if (!acc[cleanTeacherName]) {
        acc[cleanTeacherName] = [];
      }
      acc[cleanTeacherName].push(dekont);
      return acc;
    }, {} as Record<string, typeof dekontlar>);

    // ZIP dosyası oluştur
    const archive = archiver("zip", {
      zlib: { level: 9 }, // En iyi sıkıştırma
    });

    const chunks: Buffer[] = [];

    archive.on("data", (chunk: Buffer) => {
      chunks.push(chunk);
    });

    archive.on("error", (err) => {
      throw err;
    });

    // Her öğretmen için klasör oluştur ve dosyalarını ekle
    let fileCount = 0;
    const uploadsDir = path.join(
      process.cwd(),
      "public",
      "uploads",
      "dekontlar"
    );

    for (const [teacherName, teacherDekontlar] of Object.entries(
      dekontlarByTeacher
    )) {
      for (const dekont of teacherDekontlar) {
        if (dekont.fileUrl) {
          try {
            // Dosya URL'sinden gerçek dosya adını çıkar
            const urlParts = dekont.fileUrl.split("/");
            const fileName = urlParts[urlParts.length - 1];
            const filePath = path.join(uploadsDir, fileName);

            // Dosya var mı kontrol et
            await access(filePath, constants.F_OK);

            // Dosyayı oku
            const fileBuffer = await readFile(filePath);

            // ZIP'e ekle (öğretmen klasörü altında)
            const studentName = dekont.staj?.student
              ? `${dekont.staj.student.name}_${dekont.staj.student.surname}`
                  .replace(/[çÇ]/g, "c")
                  .replace(/[ğĞ]/g, "g")
                  .replace(/[ıİ]/g, "i")
                  .replace(/[öÖ]/g, "o")
                  .replace(/[şŞ]/g, "s")
                  .replace(/[üÜ]/g, "u")
                  .replace(/[^a-zA-Z0-9_]/g, "_")
              : "Bilinmeyen_Ogrenci";

            const zipFileName = `${teacherName}/${studentName}_${fileName}`;
            archive.append(fileBuffer, { name: zipFileName });
            fileCount++;
          } catch (error) {
            console.warn(
              `Dosya bulunamadı veya okunamadı: ${dekont.fileUrl}`,
              error
            );
            // Dosya bulunamazsa devam et
          }
        }
      }
    }

    if (fileCount === 0) {
      return NextResponse.json(
        { error: "Hiçbir dosya bulunamadı" },
        { status: 404 }
      );
    }

    // ZIP'i finalize et
    await archive.finalize();

    // Tüm chunk'ları birleştir
    const zipBuffer = Buffer.concat(chunks);

    const monthNames = [
      "Ocak",
      "Subat",
      "Mart",
      "Nisan",
      "Mayis",
      "Haziran",
      "Temmuz",
      "Agustos",
      "Eylul",
      "Ekim",
      "Kasim",
      "Aralik",
    ];

    // Dosya adının sonuna tarih ekle (YYYY-MM-DD_HH-MM formatında)
    const currentDate = new Date();
    const dateStr = currentDate
      .toISOString()
      .slice(0, 19)
      .replace(/:/g, "-")
      .replace("T", "_");

    const fileName = `dekontlar_${
      monthNames[month - 1]
    }_${year}_${dateStr}.zip`;

    return new NextResponse(zipBuffer, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Content-Length": zipBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error("ZIP oluşturma hatası:", error);
    return NextResponse.json(
      { error: "ZIP dosyası oluşturulurken hata oluştu" },
      { status: 500 }
    );
  }
}
