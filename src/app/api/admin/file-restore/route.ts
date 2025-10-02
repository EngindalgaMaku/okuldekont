import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    // Oturum kontrolü
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

    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "Dosya bulunamadı" }, { status: 400 });
    }

    // Dosya boyutu kontrolü (10MB maksimum)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "Dosya boyutu 10MB'dan büyük olamaz" },
        { status: 400 }
      );
    }

    // Dosya tipi kontrolü
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/jpg",
      "application/pdf",
    ];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Sadece JPEG, PNG ve PDF dosyaları desteklenir" },
        { status: 400 }
      );
    }

    // Dosya adını orijinal haliyle kullan (değiştirme!)
    const originalName = file.name;
    const fileName = originalName;

    // Hedef klasörü oluştur (public/uploads/dekontlar - ana sistemle aynı)
    const uploadDir = path.join(
      process.cwd(),
      "public",
      "uploads",
      "dekontlar"
    );

    try {
      await mkdir(uploadDir, { recursive: true });
    } catch (error) {
      console.error("Klasör oluşturma hatası:", error);
    }

    // Dosyayı kaydet
    const filePath = path.join(uploadDir, fileName);
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    await writeFile(filePath, buffer);

    console.log(`Dosya geri yüklendi: ${fileName} (Boyut: ${file.size} bytes)`);

    return NextResponse.json({
      success: true,
      message: "Dosya başarıyla geri yüklendi",
      fileName: fileName,
      originalName: originalName,
      size: file.size,
      uploadPath: `/uploads/dekontlar/${fileName}`,
    });
  } catch (error) {
    console.error("Dosya geri yükleme hatası:", error);
    return NextResponse.json(
      {
        error: "Dosya geri yükleme sırasında hata oluştu",
        details: error instanceof Error ? error.message : "Bilinmeyen hata",
      },
      { status: 500 }
    );
  }
}
