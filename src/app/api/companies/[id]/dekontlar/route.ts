import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActiveEducationYearId } from "@/lib/education-year";

import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { generateDekontFileName, DekontNamingData } from "@/utils/dekontNaming";
import { validateAuthAndRole } from "@/middleware/auth";
import {
  encryptFinancialData,
  decryptFinancialData,
  maskFinancialData,
} from "@/lib/encryption";
import {
  validateFileUpload,
  generateSecureFileName,
  quarantineFile,
} from "@/lib/file-security";
import { isDekontRequired } from "@/lib/company-utils";

// Next.js cache'ini devre dışı bırak
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // SADECE ADMIN ve İLGİLİ COMPANY erişebilir
  const authResult = await validateAuthAndRole(request, ["ADMIN", "COMPANY"]);
  if (!authResult.success) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    );
  }

  const { id } = await params;

  // Company kullanıcısı sadece kendi verilerine erişebilir
  if (authResult.user?.role === "COMPANY" && authResult.user?.id !== id) {
    return NextResponse.json(
      { error: "Bu şirketin verilerine erişim yetkiniz yok" },
      { status: 403 }
    );
  }

  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const educationYearIdParam = searchParams.get("educationYearId");
    const educationYearId =
      educationYearIdParam || (await getActiveEducationYearId());

    const dekontlar = await prisma.dekont.findMany({
      where: {
        companyId: id,
        archived: false,
        staj: { educationYearId },
      },
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
        staj: {
          include: {
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
        company: {
          select: {
            contact: true,
            companyType: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const transformedDekontlar = dekontlar.map((dekont: any) => {
      const sequenceNumber = dekont.sequenceNumber || 1;
      const monthNames = [
        "Ocak",
        "Şubat",
        "Mart",
        "Nisan",
        "Mayıs",
        "Haziran",
        "Temmuz",
        "Ağustos",
        "Eylül",
        "Ekim",
        "Kasım",
        "Aralık",
      ];
      const monthName = monthNames[dekont.month - 1] || dekont.month;
      const dekontLabel =
        sequenceNumber > 1
          ? `${monthName} ${dekont.year} - ${sequenceNumber}`
          : `${monthName} ${dekont.year}`;

      return {
        id: dekont.id,
        companyId: dekont.companyId,
        staj_id: dekont.stajId,
        ay: dekont.month,
        yil: dekont.year,
        sequence_number: sequenceNumber,
        dekont_label: dekontLabel,
        miktar: dekont.amount ? parseFloat(dekont.amount.toString()) : null,
        aciklama: `${dekont.student.name} ${dekont.student.surname} - ${dekontLabel}`,
        dosya_url: dekont.fileUrl,
        onay_durumu:
          dekont.status === "APPROVED"
            ? "onaylandi"
            : dekont.status === "REJECTED"
            ? "reddedildi"
            : "bekliyor",
        red_nedeni: dekont.rejectReason,
        yukleyen_kisi: dekont.company?.contact
          ? `${dekont.company.contact} (İşletme)`
          : "İşletme",
        odeme_tarihi: dekont.paymentDate.toISOString(),
        created_at: dekont.createdAt || new Date().toISOString(),
        // Nested relations for compatibility
        stajlar: {
          ogrenciler: {
            ad: dekont.student.name || "",
            soyad: dekont.student.surname || "",
            sinif: dekont.student.className || "",
            no: dekont.student.number || "",
            alanlar: dekont.student.alan
              ? { ad: dekont.student.alan.name }
              : { ad: "" },
          },
        },
      };
    });

    const response = NextResponse.json(transformedDekontlar);

    // Cache-control headers - mobil cache sorununu çözmek için
    response.headers.set(
      "Cache-Control",
      "no-cache, no-store, must-revalidate"
    );
    response.headers.set("Pragma", "no-cache");
    response.headers.set("Expires", "0");

    return response;
  } catch (error) {
    console.error("Error fetching dekontlar:", error);
    return NextResponse.json(
      { error: "Failed to fetch dekontlar" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // SADECE ADMIN ve İLGİLİ COMPANY dekont yükleyebilir
  const authResult = await validateAuthAndRole(request, ["ADMIN", "COMPANY"]);
  if (!authResult.success) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    );
  }

  const { id: companyId } = await params;

  // Company kullanıcısı sadece kendi verilerine erişebilir
  if (
    authResult.user?.role === "COMPANY" &&
    authResult.user?.id !== companyId
  ) {
    return NextResponse.json(
      { error: "Bu şirket adına dekont yükleme yetkiniz yok" },
      { status: 403 }
    );
  }

  try {
    // First check if this company is a government institution
    const company = await prisma.companyProfile.findUnique({
      where: { id: companyId },
      select: { id: true, name: true, companyType: true },
    });

    if (!company) {
      return NextResponse.json(
        { error: "İşletme bulunamadı" },
        { status: 404 }
      );
    }

    // Government institutions don't require dekont uploads
    if (company.companyType === "GOVERNMENT") {
      return NextResponse.json(
        {
          error: "Kamu kurumları için dekont yüklenmesi gerekmemektedir.",
          companyType: "GOVERNMENT",
          message:
            "Bu işletme bir kamu kurumu olarak kayıtlı olduğu için dekont belgesi gerektirmez.",
        },
        { status: 400 }
      );
    }

    const formData = await request.formData();

    const stajId = formData.get("staj_id") as string;
    const ay = parseInt(formData.get("ay") as string);
    const yil = parseInt(formData.get("yil") as string);
    const aciklama = formData.get("aciklama") as string;
    const miktar = parseFloat(formData.get("miktar") as string) || null;
    const dosya = formData.get("dosya") as File;

    if (!stajId || !ay || !yil) {
      return NextResponse.json(
        { error: "Gerekli alanlar eksik" },
        { status: 400 }
      );
    }

    // Verify the staj belongs to this company and get related data
    const staj = await prisma.staj.findFirst({
      where: {
        id: stajId,
        companyId: companyId,
      },
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
            contact: true,
            companyType: true,
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

    if (!staj) {
      return NextResponse.json(
        { error: "Staj bulunamadı veya bu işletmeye ait değil" },
        { status: 404 }
      );
    }

    // Tarih validasyonu 1: Ayın son günü veya sonrasında o ayın dekontunu yükleyebilir
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1;
    const currentDay = currentDate.getDate();

    // Ayın son gününü hesapla
    const lastDayOfMonth = new Date(currentYear, currentMonth, 0).getDate();

    // Mevcut ay için: Sadece ayın son günü veya daha sonrasında yüklenebilir
    if (
      yil === currentYear &&
      ay === currentMonth &&
      currentDay < lastDayOfMonth
    ) {
      return NextResponse.json(
        {
          error: `${ay}/${yil} ayının dekontunu ${lastDayOfMonth}/${ay}/${yil} tarihinden itibaren yükleyebilirsiniz.`,
        },
        { status: 400 }
      );
    }

    // Gelecek aylar için dekont yüklenemez
    if (yil > currentYear || (yil === currentYear && ay > currentMonth)) {
      return NextResponse.json(
        {
          error: `Gelecek aylar için dekont yükleyemezsiniz.`,
        },
        { status: 400 }
      );
    }

    // Tarih validasyonu 2: Öğrenci başlangıç tarihinden önce dekont yüklenemez
    const startDate = new Date(staj.startDate);
    const startYear = startDate.getFullYear();
    const startMonth = startDate.getMonth() + 1;

    if (yil < startYear || (yil === startYear && ay < startMonth)) {
      return NextResponse.json(
        {
          error: `${staj.student.name} ${
            staj.student.surname
          } ${startDate.toLocaleDateString(
            "tr-TR"
          )} tarihinde işe başlamış. Bu tarihten önceki aylar için dekont yükleyemezsiniz.`,
        },
        { status: 400 }
      );
    }

    // Check for existing dekontlar for this month to handle additional dekontlar and sequence numbering
    // Use consistent query with admin routes (studentId + companyId)
    const existingDekontlar = await prisma.dekont.findMany({
      where: {
        studentId: staj.studentId,
        companyId: companyId,
        month: ay,
        year: yil,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    // Business rule: Maximum 3 dekonts per month
    if (existingDekontlar.length >= 3) {
      const monthNames = [
        "Ocak",
        "Şubat",
        "Mart",
        "Nisan",
        "Mayıs",
        "Haziran",
        "Temmuz",
        "Ağustos",
        "Eylül",
        "Ekim",
        "Kasım",
        "Aralık",
      ];
      return NextResponse.json(
        {
          error: `${
            monthNames[ay - 1]
          } ${yil} ayı için maksimum 3 dekont yüklenebilir. Şu anda ${
            existingDekontlar.length
          } dekont mevcut.`,
        },
        { status: 400 }
      );
    }

    // Calculate next sequence number
    const nextSequenceNumber =
      existingDekontlar.length > 0
        ? Math.max(
            ...existingDekontlar.map((d) => (d as any).sequenceNumber || 1)
          ) + 1
        : 1;

    // Handle file upload to local storage with SECURITY SCANNING
    let fileUrl = null;
    if (dosya && dosya.size > 0) {
      try {
        console.log("🛡️ FILE SECURITY: Starting secure dekont file upload:", {
          fileName: dosya.name,
          fileSize: dosya.size,
          fileType: dosya.type,
          companyId,
          timestamp: new Date().toISOString(),
        });

        // KRİTİK GÜVENLİK TARAMASI
        const securityResult = await validateFileUpload(dosya, {
          maxSize: 10 * 1024 * 1024, // 10MB
          allowedTypes: [
            "image/jpeg",
            "image/png",
            "image/jpg",
            "application/pdf",
          ],
          strictMode: true, // Dekont dosyaları için sıkı mod
        });

        if (!securityResult.safe) {
          // Güvenli olmayan dosya - quarantine
          quarantineFile(
            {
              originalName: dosya.name,
              companyId,
              userEmail: authResult.user?.email,
            },
            securityResult.error || "Security validation failed"
          );

          console.error("🚨 FILE SECURITY: Malicious dekont file blocked:", {
            fileName: dosya.name,
            companyId,
            error: securityResult.error,
            timestamp: new Date().toISOString(),
          });

          return NextResponse.json(
            { error: securityResult.error },
            { status: 400 }
          );
        }

        // Security warnings varsa logla
        if (securityResult.warnings && securityResult.warnings.length > 0) {
          console.warn("⚠️ FILE SECURITY: Dekont file warnings:", {
            fileName: dosya.name,
            warnings: securityResult.warnings,
            companyId,
          });
        }

        console.log("✅ FILE SECURITY: Dekont file passed security scan");

        // Create uploads directory if it doesn't exist
        const uploadDir = path.join(
          process.cwd(),
          "public",
          "uploads",
          "dekontlar"
        );
        await mkdir(uploadDir, { recursive: true });
        console.log("📁 Upload dizini oluşturuldu:", uploadDir);

        // Generate SECURE filename with hash but preserve extension
        const originalExtension =
          dosya.name.split(".").pop()?.toLowerCase() || "pdf";
        const secureFileName = generateSecureFileName(
          dosya.name,
          securityResult.fileInfo?.hash || "unknown"
        );

        // Get full student data for filename generation
        const fullStudent = await prisma.student.findUnique({
          where: { id: staj.studentId },
          include: {
            alan: {
              select: {
                name: true,
              },
            },
          },
        });

        // Generate meaningful filename for reference with correct extension
        const dekontNamingData: DekontNamingData = {
          studentName: fullStudent?.name || staj.student.name,
          studentSurname: fullStudent?.surname || staj.student.surname,
          studentClass:
            fullStudent?.className || staj.student.className || "Bilinmeyen",
          studentNumber:
            fullStudent?.number || staj.student.number || undefined,
          fieldName:
            fullStudent?.alan?.name || staj.student.alan?.name || "Bilinmeyen",
          companyName: staj.company.name,
          month: ay,
          year: yil,
          originalFileName: dosya.name, // Use original filename to preserve extension
          isAdditional: existingDekontlar.length > 0,
          additionalIndex: existingDekontlar.length,
        };

        const fileName = generateDekontFileName(dekontNamingData);
        const filePath = path.join(uploadDir, fileName);

        console.log("📁 Dosya adı oluşturuldu:", fileName);
        console.log("📁 Dosya yolu:", filePath);

        // Convert File to Buffer and save
        const bytes = await dosya.arrayBuffer();
        const buffer = Buffer.from(bytes);
        await writeFile(filePath, buffer);

        // Dosya gerçekten oluşturuldu mu kontrol et
        const fs = require("fs");
        if (!fs.existsSync(filePath)) {
          throw new Error("Dosya kaydedilemedi");
        }

        const fileStats = fs.statSync(filePath);
        console.log("📁 Dosya başarıyla kaydedildi:", {
          path: filePath,
          size: fileStats.size,
        });

        // Set public URL
        fileUrl = `/uploads/dekontlar/${fileName}`;

        // Log successful secure upload
        console.log("✅ FILE SECURITY: Secure dekont upload completed:", {
          originalName: dosya.name,
          secureFileName: fileName,
          fileHash: securityResult.fileInfo?.hash?.substring(0, 16) + "...",
          companyId,
          fileUrl,
          timestamp: new Date().toISOString(),
        });
      } catch (fileError) {
        console.error("❌ Dosya yükleme hatası:", fileError);
        const errorMessage =
          fileError instanceof Error ? fileError.message : "Bilinmeyen hata";
        return NextResponse.json(
          { error: `Dosya yüklenemedi: ${errorMessage}` },
          { status: 500 }
        );
      }
    } else {
      return NextResponse.json(
        { error: "Dosya seçilmedi veya dosya boş" },
        { status: 400 }
      );
    }

    // Convert amount to decimal (no encryption needed anymore)
    const decimalAmount = miktar || null;

    // Mali veri güvenlik logu (maskelenmiş)
    console.log(`💰 FINANCIAL: Company dekont amount processed`, {
      originalAmount: maskFinancialData(miktar),
      companyId,
      timestamp: new Date().toISOString(),
    });

    // Create the dekont - company upload (teacherId = null for proper attribution)
    const newDekont = await prisma.dekont.create({
      data: {
        staj: {
          connect: { id: stajId },
        },
        student: {
          connect: { id: staj.studentId },
        },
        company: {
          connect: { id: companyId },
        },
        // Don't connect teacher for company uploads (teacherId will be null)
        month: ay,
        year: yil,
        sequenceNumber: nextSequenceNumber,
        amount: decimalAmount,
        fileUrl: fileUrl,
        status: "PENDING",
        paymentDate: new Date(),
      } as any, // Type assertion until Prisma client is regenerated
    });

    // Student info is already available from staj relation
    const student = staj.student;

    // Format response to match frontend expectations with decrypted amount
    const formattedDekont = {
      id: newDekont.id,
      ogrenci_adi: student ? `${student.name} ${student.surname}` : "",
      miktar: newDekont.amount ? parseFloat(newDekont.amount.toString()) : null,
      odeme_tarihi: newDekont.paymentDate,
      onay_durumu:
        newDekont.status === "APPROVED"
          ? "onaylandi"
          : newDekont.status === "REJECTED"
          ? "reddedildi"
          : "bekliyor",
      aciklama: aciklama,
      dosya_url: newDekont.fileUrl,
      ay: newDekont.month,
      yil: newDekont.year,
      staj_id: newDekont.stajId,
      yukleyen_kisi: staj.company?.contact
        ? `${staj.company.contact} (İşletme)`
        : "İşletme",
      created_at: newDekont.createdAt,
      stajlar: {
        ogrenciler: {
          ad: student?.name || "",
          soyad: student?.surname || "",
          sinif: student?.className || "",
          no: student?.number || "",
          alanlar: student?.alan ? { ad: student.alan.name } : { ad: "" },
        },
      },
    };

    return NextResponse.json(formattedDekont);
  } catch (error) {
    console.error("Dekont creation error:", error);
    return NextResponse.json(
      { error: "Dekont oluşturulamadı" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // SADECE ADMIN ve İLGİLİ COMPANY silme yapabilir
  const authResult = await validateAuthAndRole(request, ["ADMIN", "COMPANY"]);
  if (!authResult.success) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    );
  }

  const { id: companyId } = await params;

  // Company kullanıcısı sadece kendi verilerine erişebilir
  if (
    authResult.user?.role === "COMPANY" &&
    authResult.user?.id !== companyId
  ) {
    return NextResponse.json(
      { error: "Bu şirketin dekontlarını silme yetkiniz yok" },
      { status: 403 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const dekontId = searchParams.get("dekontId");

    if (!dekontId) {
      return NextResponse.json({ error: "Dekont ID gerekli" }, { status: 400 });
    }

    // Verify the dekont belongs to this company and can be deleted
    const dekont = await prisma.dekont.findFirst({
      where: {
        id: dekontId,
        companyId: companyId,
        status: {
          in: ["PENDING", "REJECTED"], // Only allow deleting pending or rejected dekontlar
        },
      },
    });

    if (!dekont) {
      return NextResponse.json(
        {
          error:
            "Dekont bulunamadı veya silinemez (onaylanmış dekontlar silinemez)",
        },
        { status: 404 }
      );
    }

    // Delete physical file if exists
    if (dekont.fileUrl) {
      try {
        const fs = require("fs").promises;
        const filePath = path.join(
          process.cwd(),
          dekont.fileUrl.replace(/^\//, "")
        );

        // Check if file exists before attempting to delete
        try {
          await fs.access(filePath);
          await fs.unlink(filePath);
          console.log("Dekont dosyası silindi:", filePath);
        } catch (fileError) {
          // File doesn't exist or cannot be deleted, continue anyway
          console.warn(
            "Dekont dosyası silinemedi veya bulunamadı:",
            filePath,
            fileError
          );
        }
      } catch (error) {
        console.error("Dosya silme hatası:", error);
        // Continue with database deletion even if file deletion fails
      }
    }

    // Delete the dekont from database
    await prisma.dekont.delete({
      where: {
        id: dekontId,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Dekont deletion error:", error);
    return NextResponse.json(
      { error: "Dekont silinirken bir hata oluştu" },
      { status: 500 }
    );
  }
}
