export const runtime = "nodejs";
export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";
import { validateAuthAndRole } from "@/middleware/auth";
import {
  encryptFinancialData,
  decryptFinancialData,
  maskFinancialData,
} from "@/lib/encryption";
import {
  validateAndSanitize,
  validateDekont,
  sanitizeString,
  ValidationFunctions,
} from "@/lib/validation";
import {
  validateFileUpload,
  generateSecureFileName,
  quarantineFile,
} from "@/lib/file-security";
import { generateDekontFileName, DekontNamingData } from "@/utils/dekontNaming";
import { getActiveEducationYearId } from "@/lib/education-year";

// Dekontları listele - SADECE ADMIN
export async function GET(request: Request) {
  const authResult = await validateAuthAndRole(request, ["ADMIN"]);
  if (!authResult.success) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    );
  }

  try {
    // educationYearId query param'ını destekle; yoksa aktif yılı kullan. 'all' ise filtreyi kaldır.
    const { searchParams } = new URL(request.url);
    const queryEducationYearId = searchParams.get("educationYearId");
    const activeEducationYearId = await getActiveEducationYearId();
    const useAllYears = queryEducationYearId === "all";
    const educationYearId = useAllYears
      ? undefined
      : queryEducationYearId || activeEducationYearId;

    // Current date for TERMINATED filtering logic
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1;

    const whereClause: any = {
      archived: false,
      // Add TERMINATED filtering logic - same as dashboard-stats and dekont-status
      staj: {
        ...(educationYearId ? { educationYearId } : {}),
        OR: [
          // Non-terminated students
          { status: { not: "TERMINATED" } },
          // Terminated students who worked during the month
          {
            AND: [
              { status: "TERMINATED" },
              {
                OR: [
                  // Has terminationDate and it's >= month start
                  {
                    AND: [
                      { terminationDate: { not: null } },
                      {
                        terminationDate: {
                          gte: new Date(currentYear, currentMonth - 1, 1),
                        },
                      },
                    ],
                  },
                  // No terminationDate but endDate >= month start (fallback for data integrity)
                  {
                    AND: [
                      { terminationDate: null },
                      {
                        endDate: {
                          gte: new Date(currentYear, currentMonth - 1, 1),
                        },
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    };

    const rawData = await prisma.dekont.findMany({
      where: whereClause,
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
                contact: true,
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
        company: {
          select: {
            name: true,
            contact: true,
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
      orderBy: {
        createdAt: "desc",
      },
    });

    // Manuel olarak monthly payments'i çek (tablo varsa)
    const monthlyPaymentsData: any = {};
    try {
      // Get unique student IDs
      const studentIds = rawData
        .map((d) => d.staj?.student?.id)
        .filter(Boolean);

      if (studentIds.length > 0) {
        // Use Prisma's $queryRaw with proper parameter binding
        const monthlyPayments = await prisma.$queryRaw(
          Prisma.sql`SELECT mp.id, mp.studentId, mp.amount, mp.month, mp.year, mp.paymentType, mp.status, mp.importedAt, mp.importSource
          FROM monthly_payments mp
          WHERE mp.studentId IN (${Prisma.join(studentIds)})`
        );

        // Group by studentId for easy lookup
        (monthlyPayments as any[]).forEach((payment) => {
          const key = `${payment.studentId}-${payment.month}-${payment.year}`;
          monthlyPaymentsData[key] = payment;
        });

        console.log(
          `✅ Loaded ${
            (monthlyPayments as any[]).length
          } monthly payments for ${studentIds.length} students`
        );
      }
    } catch (error) {
      console.log(
        "Monthly payments table not found or error loading payment data:",
        error
      );
      // Table doesn't exist yet, continue without payment data
    }

    // Status mapping from database enum to Turkish frontend values
    const statusMapping = {
      PENDING: "bekliyor",
      APPROVED: "onaylandi",
      REJECTED: "reddedildi",
    };

    // Format data to match frontend interface with decrypted financial data
    const formattedData = rawData.map((dekont) => {
      // Type assertion for new analysis fields until Prisma client is fully regenerated
      const dekontWithAnalysis = dekont as any;

      const sequenceNumber = dekontWithAnalysis.sequenceNumber || 1;
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

      // Aynı ay ve yıl için import edilen ödeme bilgisini bul
      const paymentKey = `${dekont.staj?.studentId}-${dekont.month}-${dekont.year}`;
      const monthlyPayment = monthlyPaymentsData[paymentKey];

      return {
        id: dekont.id,
        isletme_ad:
          dekont.company?.name || dekont.staj?.company?.name || "Bilinmiyor",
        koordinator_ogretmen: dekont.company?.teacher
          ? `${dekont.company.teacher.name} ${dekont.company.teacher.surname}`
          : dekont.staj?.teacher
          ? `${dekont.staj.teacher.name} ${dekont.staj.teacher.surname}`
          : "Bilinmiyor",
        ogrenci_ad: dekont.staj?.student
          ? `${dekont.staj.student.name} ${dekont.staj.student.surname}`
          : "Bilinmiyor",
        ogrenci_id: dekont.staj?.student?.id || dekont.staj?.studentId,
        ogrenci_sinif: dekont.staj?.student?.className || "",
        ogrenci_no: dekont.staj?.student?.number || "",
        ogrenci_alan: dekont.staj?.student?.alan?.name || "",
        miktar: dekont.amount ? Number(dekont.amount) : null,
        odeme_tarihi: dekont.paymentDate.toISOString(),
        onay_durumu: statusMapping[dekont.status] || dekont.status,
        ay: dekont.month,
        yil: dekont.year,
        sequence_number: sequenceNumber,
        dekont_label: dekontLabel,
        dosya_url: dekont.fileUrl,
        aciklama: dekont.rejectReason,
        red_nedeni: dekont.rejectReason,
        yukleyen_kisi: dekont.teacher
          ? `${dekont.teacher.name} ${dekont.teacher.surname} (Öğretmen)`
          : dekont.company?.contact
          ? `${dekont.company.contact} (İşletme)`
          : dekont.staj?.company?.contact
          ? `${dekont.staj.company.contact} (İşletme)`
          : "İşletme",
        created_at: dekont.createdAt.toISOString(),
        // Excel'den import edilen ödeme bilgisi
        monthlyPayment: monthlyPayment
          ? {
              id: monthlyPayment.id,
              amount: Number(monthlyPayment.amount),
              paymentType: monthlyPayment.paymentType,
              status: monthlyPayment.status,
              importedAt: monthlyPayment.importedAt.toISOString(),
              importSource: monthlyPayment.importSource,
            }
          : null,
        // OCR ve AI Analiz Alanları - Type assertion kullanarak erişim
        isAnalyzed: dekontWithAnalysis.isAnalyzed || false,
        reliabilityScore: dekontWithAnalysis.reliabilityScore || null,
        analyzedAt: dekontWithAnalysis.analyzedAt?.toISOString() || null,
        analyzedBy: dekontWithAnalysis.analyzedBy || null,
        aiAnalysisResult: dekontWithAnalysis.aiAnalysisResult || null,
        ocrAnalysisResult: dekontWithAnalysis.ocrAnalysisResult || null,
        securityFlags: dekontWithAnalysis.securityFlags || null,
        extractedData: dekontWithAnalysis.extractedData || null,
      };
    });

    // Dekont beklenen öğrenci sayısını hesapla (sadece özel sektör işletmelerinde staj yapanlar)
    // Feshedilmiş stajları hariç tut
    // Reuse currentDate, currentYear, and currentMonth variables from line 50-52

    const allInternships = await prisma.staj.findMany({
      where: {
        archived: false,
        ...(educationYearId ? { educationYearId } : {}),
        company: {
          companyType: "PRIVATE", // Sadece özel sektör şirketleri
        },
        AND: [
          { status: { not: "TERMINATED" } },
          {
            OR: [
              { terminationDate: null },
              {
                terminationDate: {
                  gte: new Date(currentYear, currentMonth - 1, 1),
                },
              },
            ],
          },
        ],
      },
      select: {
        studentId: true,
      },
    });

    // Dekont beklenen benzersiz öğrenci sayısını hesapla (kamu kurumu öğrencileri hariç)
    const uniqueStudentIds = new Set(allInternships.map((s) => s.studentId));
    const totalStudentsRequiringDekont = uniqueStudentIds.size;

    return NextResponse.json({
      data: formattedData,
      totalStudents: totalStudentsRequiringDekont,
      filter: useAllYears ? "all" : educationYearId,
    });
  } catch (error) {
    console.error("Dekont listesi alınırken hata:", error);
    return NextResponse.json(
      { error: "Dekontlar alınırken bir hata oluştu" },
      { status: 500 }
    );
  }
}

// Yeni dekont ekle - SADECE ADMIN VE TEACHER
export async function POST(request: Request) {
  const authResult = await validateAuthAndRole(request, ["ADMIN", "TEACHER"]);
  if (!authResult.success) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    );
  }

  try {
    // Parse multipart form data
    const formData = await request.formData();

    // Extract form fields
    const stajId = formData.get("staj_id") as string;
    const miktar = formData.get("miktar") as string;
    const ay = parseInt(formData.get("ay") as string);
    const yil = parseInt(formData.get("yil") as string);
    const aciklama = formData.get("aciklama") as string;
    const ogretmenId = formData.get("ogretmen_id") as string;

    // Enhanced logging for teacher dekont upload debugging
    console.log("🔍 DEKONT UPLOAD DEBUG:", {
      userRole: authResult.user?.role,
      userId: authResult.user?.id,
      ogretmenId,
      stajId,
      ay,
      yil,
      timestamp: new Date().toISOString(),
    });
    // Ek dekont onayı sonrası gelen bayrak
    const forceAdditionalRaw = formData.get("force_additional");
    const forceAdditional =
      typeof forceAdditionalRaw === "string"
        ? forceAdditionalRaw === "true" || forceAdditionalRaw === "1"
        : false;
    const dosya = formData.get("dosya") as File;

    // INPUT VALIDATION & SANITIZATION
    console.log("Raw miktar value:", miktar, "Type:", typeof miktar);

    // Miktar işleme - boş string, null, undefined, 0 durumlarını handle et
    let processedAmount: number | undefined = undefined;
    if (miktar && typeof miktar === "string" && miktar.trim() !== "") {
      const parsed = parseFloat(miktar.trim());
      if (!isNaN(parsed) && isFinite(parsed) && parsed >= 0) {
        processedAmount = parsed;
      } else {
        return NextResponse.json(
          { error: "Geçersiz miktar formatı" },
          { status: 400 }
        );
      }
    }

    console.log("Processed amount:", processedAmount);

    // Staj ID validasyonu
    if (!stajId) {
      return NextResponse.json({ error: "Staj ID gerekli" }, { status: 400 });
    }

    const stajIdValidation = ValidationFunctions.id(stajId);
    if (!stajIdValidation.valid) {
      return NextResponse.json(
        { error: `Staj ID hatası: ${stajIdValidation.error}` },
        { status: 400 }
      );
    }

    const dekontData = {
      stajId: sanitizeString(stajId),
      amount: processedAmount,
      month: ay || undefined,
      year: yil || undefined,
      description: aciklama ? sanitizeString(aciklama) : undefined,
    };

    console.log("Dekont data for validation:", dekontData);

    // Validate dekont data
    const validationResult = validateDekont(dekontData);
    if (!validationResult.valid) {
      console.warn(`🛡️ VALIDATION: Dekont creation failed`, {
        errors: validationResult.errors,
        userId: authResult.user?.id,
      });
      return NextResponse.json(
        { error: `Validation hatası: ${validationResult.errors.join(", ")}` },
        { status: 400 }
      );
    }

    // Enhanced Teacher ID validation with session compatibility
    console.log("🔍 TEACHER ID VALIDATION:", {
      ogretmenIdFromForm: ogretmenId,
      userRole: authResult.user?.role,
      sessionUserId: authResult.user?.id,
      sessionData: authResult.user,
    });

    let finalTeacherId = ogretmenId;

    // For TEACHER role users, find the correct TeacherProfile ID via User -> TeacherProfile mapping
    if (authResult.user?.role === "TEACHER") {
      if (!ogretmenId) {
        // Find TeacherProfile by User ID (this handles the User -> TeacherProfile mapping)
        console.log(
          "🔍 FINDING TEACHER PROFILE for User ID:",
          authResult.user?.id
        );

        const teacherProfile = await prisma.teacherProfile.findUnique({
          where: { userId: authResult.user?.id },
          select: { id: true, name: true, surname: true },
        });

        if (teacherProfile) {
          finalTeacherId = teacherProfile.id;
          console.log("✅ FOUND TEACHER PROFILE:", {
            userId: authResult.user?.id,
            teacherProfileId: teacherProfile.id,
            teacherName: `${teacherProfile.name} ${teacherProfile.surname}`,
          });
        } else {
          console.error(
            "❌ TEACHER PROFILE NOT FOUND for User ID:",
            authResult.user?.id
          );
          return NextResponse.json(
            { error: "Öğretmen profili bulunamadı" },
            { status: 404 }
          );
        }
      }
    }

    if (!finalTeacherId) {
      console.error("❌ TEACHER ID ERROR: No valid teacher ID found", {
        ogretmenIdFromForm: ogretmenId,
        userRole: authResult.user?.role,
        sessionUserId: authResult.user?.id,
      });
      return NextResponse.json(
        { error: "Öğretmen ID gerekli" },
        { status: 400 }
      );
    }

    const teacherIdValidation = ValidationFunctions.id(finalTeacherId);
    if (!teacherIdValidation.valid) {
      console.error("❌ TEACHER ID VALIDATION ERROR:", {
        finalTeacherId,
        validationError: teacherIdValidation.error,
      });
      return NextResponse.json(
        { error: teacherIdValidation.error },
        { status: 400 }
      );
    }

    console.log(
      "✅ VALIDATION: Dekont data validated successfully with teacherId:",
      finalTeacherId
    );

    // Get company and student IDs from staj first (needed for filename)
    const staj = await prisma.staj.findUnique({
      where: { id: stajId },
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
      return NextResponse.json({ error: "Staj bulunamadı" }, { status: 404 });
    }

    // Determine which internship (staj) to attach the dekont to
    let uploadStaj = staj;
    if (authResult.user?.role === "TEACHER") {
      const sessionTeacherId = authResult.user?.id;
      if (!sessionTeacherId) {
        return NextResponse.json(
          { error: "Kimlik doğrulama başarısız" },
          { status: 401 }
        );
      }
      if (staj.teacherId !== sessionTeacherId) {
        // Try to find a historical staj for this student that belongs to this teacher
        const historical = await prisma.staj.findFirst({
          where: {
            studentId: staj.studentId,
            teacherId: sessionTeacherId,
          },
          orderBy: { startDate: "desc" },
          include: {
            student: { include: { alan: { select: { name: true } } } },
            company: { select: { name: true, contact: true } },
            teacher: { select: { name: true, surname: true } },
          },
        });
        if (!historical) {
          return NextResponse.json(
            { error: "Bu öğrenci için yetkiniz yok" },
            { status: 403 }
          );
        }
        uploadStaj = historical as typeof staj;
      }
    }

    // Dekont yükleme kuralları kontrolü
    const ayNum = ay ? ay : new Date().getMonth() + 1;
    const yilNum = yil ? yil : new Date().getFullYear();

    console.log("🔍 DEBUG: Dekont POST received", {
      forceAdditional,
      stajId,
      teacherId: ogretmenId,
      ayNum,
      yilNum,
      role: authResult.user?.role,
    });

    // Tarih validasyonu 1: Ayın son günü veya sonrasında o ayın dekontunu yükleyebilir
    const postCurrentDate = new Date();
    const postCurrentYear = postCurrentDate.getFullYear();
    const postCurrentMonth = postCurrentDate.getMonth() + 1;
    const postCurrentDay = postCurrentDate.getDate();

    // Ayın son gününü hesapla
    const lastDayOfMonth = new Date(
      postCurrentYear,
      postCurrentMonth,
      0
    ).getDate();

    // Mevcut ay için: Sadece ayın son günü veya daha sonrasında yüklenebilir
    if (
      yilNum === postCurrentYear &&
      ayNum === postCurrentMonth &&
      postCurrentDay < lastDayOfMonth
    ) {
      return NextResponse.json(
        {
          error: `${ayNum}/${yilNum} ayının dekontunu ${lastDayOfMonth}/${ayNum}/${yilNum} tarihinden itibaren yükleyebilirsiniz.`,
        },
        { status: 400 }
      );
    }

    // Gelecek aylar için dekont yüklenemez
    if (
      yilNum > postCurrentYear ||
      (yilNum === postCurrentYear && ayNum > postCurrentMonth)
    ) {
      return NextResponse.json(
        {
          error: `Gelecek aylar için dekont yükleyemezsiniz.`,
        },
        { status: 400 }
      );
    }

    // Tarih validasyonlarını öğretmenler için esnet: TEACHER rolünde bu kontrolleri atla
    if (authResult.user?.role !== "TEACHER") {
      // Tarih validasyonu 2: Staj başlama tarihi kontrolü
      const stajBaslangic = new Date(uploadStaj.startDate);
      const stajBaslangicYear = stajBaslangic.getFullYear();
      const stajBaslangicMonth = stajBaslangic.getMonth() + 1; // 0-based to 1-based

      // Sadece yıl ve ay karşılaştırması yap (gün önemli değil)
      if (
        yilNum < stajBaslangicYear ||
        (yilNum === stajBaslangicYear && ayNum < stajBaslangicMonth)
      ) {
        const stajBaslangicStr = stajBaslangic.toLocaleDateString("tr-TR", {
          year: "numeric",
          month: "long",
        });
        const dekontTarihiStr = new Date(
          yilNum,
          ayNum - 1,
          1
        ).toLocaleDateString("tr-TR", {
          year: "numeric",
          month: "long",
        });

        return NextResponse.json(
          {
            error: `Staj başlama tarihinden (${stajBaslangicStr}) öncesine dekont yüklenemez. Seçilen ay: ${dekontTarihiStr}`,
          },
          { status: 400 }
        );
      }
    }

    // Staj bitiş tarihi kontrolü
    const stajBitis = new Date(uploadStaj.endDate);
    const stajBitisYear = stajBitis.getFullYear();
    const stajBitisMonth = stajBitis.getMonth() + 1;

    if (
      yilNum > stajBitisYear ||
      (yilNum === stajBitisYear && ayNum > stajBitisMonth)
    ) {
      const stajBitisStr = stajBitis.toLocaleDateString("tr-TR", {
        year: "numeric",
        month: "long",
      });
      const dekontTarihiStr = new Date(yilNum, ayNum - 1, 1).toLocaleDateString(
        "tr-TR",
        {
          year: "numeric",
          month: "long",
        }
      );

      return NextResponse.json(
        {
          error: `Staj bitiş tarihinden (${stajBitisStr}) sonrasına dekont yüklenemez. Seçilen ay: ${dekontTarihiStr}`,
        },
        { status: 400 }
      );
    }

    // Fesih durumu özel kontrolü
    if (uploadStaj.status === "TERMINATED" && uploadStaj.terminationDate) {
      const fesihTarihi = new Date(uploadStaj.terminationDate);
      const fesihYear = fesihTarihi.getFullYear();
      const fesihMonth = fesihTarihi.getMonth() + 1;

      if (yilNum > fesihYear || (yilNum === fesihYear && ayNum > fesihMonth)) {
        return NextResponse.json(
          {
            error: `Staj ${fesihTarihi.toLocaleDateString(
              "tr-TR"
            )} tarihinde feshedildiği için bu ay için dekont yüklenemez.`,
          },
          { status: 400 }
        );
      }
    }

    // Bu öğrenci ve ay için mevcut dekontları kontrol et - SADECE AYNI İŞLETME İÇİN
    const mevcutDekontlar = await prisma.dekont.findMany({
      where: {
        studentId: uploadStaj.studentId,
        companyId: uploadStaj.companyId, // Sadece aynı işletmedeki dekontları kontrol et
        month: ayNum,
        year: yilNum,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    console.log("🔍 DEBUG: Existing dekontlar fetched", {
      count: mevcutDekontlar.length,
      statuses: mevcutDekontlar.map((d) => d.status),
    });

    // Business rule: Maximum 3 dekonts per month
    if (mevcutDekontlar.length >= 3) {
      console.warn("⛔ RULE: Max 3 dekont per month reached", {
        studentId: uploadStaj.studentId,
        ayNum,
        yilNum,
        existingCount: mevcutDekontlar.length,
      });
      const ayAdi = [
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
            ayAdi[ayNum - 1]
          } ${yilNum} ayı için maksimum 3 dekont yüklenebilir. Şu anda ${
            mevcutDekontlar.length
          } dekont mevcut.`,
        },
        { status: 400 }
      );
    }

    // Onaylanmış dekont varsa yükleme yapılamaz (sadece aynı işletme için)
    const onaylanmisDekont = mevcutDekontlar.find(
      (d) => d.status === "APPROVED"
    );
    if (onaylanmisDekont) {
      console.warn(
        "⛔ RULE: Approved dekont exists for student-company-month combination, blocking upload",
        {
          studentId: uploadStaj.studentId,
          companyId: uploadStaj.companyId,
          ayNum,
          yilNum,
          approvedDekontId: onaylanmisDekont.id,
        }
      );
      const ayAdi = [
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
          error: `Bu işletme için ${
            ayAdi[ayNum - 1]
          } ${yilNum} ayında onaylanmış dekont bulunmaktadır. O ayla ilgili işlemler kapanmıştır.`,
        },
        { status: 400 }
      );
    }

    // Calculate next sequence number
    const nextSequenceNumber =
      mevcutDekontlar.length > 0
        ? Math.max(
            ...mevcutDekontlar.map((d) => (d as any).sequenceNumber || 1)
          ) + 1
        : 1;

    // Beklemede dekont varsa: TEACHER için otomatik ek dekont oluştur (409 verme).
    // ADMIN veya diğer roller için (veya forceAdditional yoksa) 409 uyarısı döndür.
    const beklemedeDekont = mevcutDekontlar.find((d) => d.status === "PENDING");
    if (
      beklemedeDekont &&
      authResult.user?.role !== "TEACHER" &&
      !forceAdditional
    ) {
      const ayAdi = [
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
      console.warn("⚠️ WARNING: Pending dekont exists, returning 409 warning", {
        studentId: uploadStaj.studentId,
        ayNum,
        yilNum,
        existingCount: mevcutDekontlar.length,
        nextSequenceNumber,
      });
      return NextResponse.json(
        {
          warning: `${
            ayAdi[ayNum - 1]
          } ${yilNum} ayı için zaten dekont var. Yükleyeceğiniz dekont ek dekont olarak eklenecektir.`,
          isEkDekont: true,
          mevcutDekontSayisi: mevcutDekontlar.length,
          nextSequenceNumber: nextSequenceNumber,
        },
        { status: 409 }
      );
    }

    if (beklemedeDekont && forceAdditional) {
      console.log(
        "✅ DEBUG: forceAdditional=true, bypassing 409 and proceeding to create ek dekont",
        {
          studentId: uploadStaj.studentId,
          ayNum,
          yilNum,
          existingCount: mevcutDekontlar.length,
          nextSequenceNumber,
        }
      );
    }

    const isEkDekont = false;
    const ekSayisi = mevcutDekontlar.length;

    // Get teacher info for filename using the validated teacherId
    console.log("🔍 FETCHING TEACHER:", finalTeacherId);
    const teacher = await prisma.teacherProfile.findUnique({
      where: { id: finalTeacherId },
      select: { name: true, surname: true },
    });

    if (!teacher) {
      console.error("❌ TEACHER NOT FOUND:", {
        teacherId: finalTeacherId,
        originalOgretmenId: ogretmenId,
        userRole: authResult.user?.role,
      });
      return NextResponse.json(
        { error: "Öğretmen bulunamadı" },
        { status: 404 }
      );
    }

    console.log("✅ TEACHER FOUND:", {
      teacherId: finalTeacherId,
      teacherName: `${teacher.name} ${teacher.surname}`,
    });

    // Handle SECURE file upload if provided
    let fileUrl = null;
    if (dosya && dosya.size > 0) {
      console.log("🛡️ FILE SECURITY: Starting secure admin dekont upload:", {
        fileName: dosya.name,
        fileSize: dosya.size,
        fileType: dosya.type,
        uploadedBy: authResult.user?.email,
        timestamp: new Date().toISOString(),
      });

      // KRİTİK GÜVENLİK TARAMASI - Admin dekont uploads için
      const securityResult = await validateFileUpload(dosya, {
        maxSize: 10 * 1024 * 1024, // 10MB for admin uploads
        allowedTypes: [
          "image/jpeg",
          "image/png",
          "image/jpg",
          "application/pdf",
        ],
        strictMode: true, // Admin uploads için sıkı güvenlik
      });

      if (!securityResult.safe) {
        // Güvenli olmayan dosya - quarantine
        quarantineFile(
          {
            originalName: dosya.name,
            adminId: authResult.user?.id,
            userEmail: authResult.user?.email,
          },
          securityResult.error || "Security validation failed"
        );

        console.error(
          "🚨 FILE SECURITY: Malicious admin dekont file blocked:",
          {
            fileName: dosya.name,
            adminId: authResult.user?.id,
            error: securityResult.error,
            timestamp: new Date().toISOString(),
          }
        );

        return NextResponse.json(
          { error: securityResult.error },
          { status: 400 }
        );
      }

      // Security warnings varsa logla
      if (securityResult.warnings && securityResult.warnings.length > 0) {
        console.warn("⚠️ FILE SECURITY: Admin dekont file warnings:", {
          fileName: dosya.name,
          warnings: securityResult.warnings,
          adminId: authResult.user?.id,
        });
      }

      console.log("✅ FILE SECURITY: Admin dekont file passed security scan");

      // Create upload directory if it doesn't exist
      const uploadDir = join(process.cwd(), "public", "uploads", "dekontlar");
      if (!existsSync(uploadDir)) {
        await mkdir(uploadDir, { recursive: true });
      }
      console.log("📁 Upload dizini oluşturuldu:", uploadDir);

      // Check for existing dekontlar for this month to handle additional dekontlar
      // Use consistent query with the main validation (studentId + companyId)
      const existingDekontlar = await prisma.dekont.findMany({
        where: {
          studentId: uploadStaj.studentId,
          companyId: uploadStaj.companyId,
          month: ay ? ay : new Date().getMonth() + 1,
          year: yil ? yil : new Date().getFullYear(),
        },
        orderBy: {
          createdAt: "asc",
        },
      });

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

      // Generate meaningful, safe filename with underscore and _ekN suffix
      const dekontNamingData: DekontNamingData = {
        studentName: fullStudent?.name || uploadStaj.student.name,
        studentSurname: fullStudent?.surname || uploadStaj.student.surname,
        studentClass:
          fullStudent?.className ||
          uploadStaj.student.className ||
          "Bilinmeyen",
        studentNumber:
          fullStudent?.number || uploadStaj.student.number || undefined,
        fieldName:
          fullStudent?.alan?.name ||
          uploadStaj.student.alan?.name ||
          "Bilinmeyen",
        companyName: uploadStaj.company.name,
        month: ay,
        year: yil,
        originalFileName: dosya.name, // preserve extension
        isAdditional: existingDekontlar.length > 0,
        additionalIndex: existingDekontlar.length,
      };
      const fileName = generateDekontFileName(dekontNamingData);
      const filePath = join(uploadDir, fileName);

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
      console.log("✅ FILE SECURITY: Secure admin dekont upload completed:", {
        originalName: dosya.name,
        secureFileName: fileName,
        fileHash: securityResult.fileInfo?.hash?.substring(0, 16) + "...",
        adminId: authResult.user?.id,
        timestamp: new Date().toISOString(),
      });
    }

    // GEÇİCİ FIX: Encryption devre dışı - normal decimal değer kullan
    const decimalAmount = miktar ? parseFloat(miktar) : null;

    console.log(`💰 FINANCIAL: Dekont amount (not encrypted)`, {
      amount: decimalAmount,
      adminId: authResult.user?.id,
      timestamp: new Date().toISOString(),
    });

    const createDekontData = {
      stajId: uploadStaj.id,
      companyId: uploadStaj.companyId,
      teacherId: finalTeacherId, // Use the validated teacher ID
      studentId: uploadStaj.studentId,
      amount: decimalAmount,
      paymentDate: new Date(),
      month: ay ? ay : new Date().getMonth() + 1,
      year: yil ? yil : new Date().getFullYear(),
      sequenceNumber: nextSequenceNumber,
      status: "PENDING" as const,
      fileUrl: fileUrl,
    };

    console.log("Final dekont data:", createDekontData);

    console.log("🛠️ DEBUG: Creating dekont via prisma", createDekontData);
    const data = await prisma.dekont.create({
      data: createDekontData as any, // Type assertion until Prisma client is regenerated
      include: {
        staj: {
          include: {
            student: {
              include: {
                alan: true,
              },
            },
            company: true,
            teacher: true,
          },
        },
        company: true,
        teacher: true,
      },
    });

    // Format the response to match what frontend expects with decrypted amount
    const formattedData = {
      id: data.id,
      isletme_ad:
        data.staj?.company?.name || uploadStaj.company.name || "Bilinmiyor",
      ogrenci_ad: data.staj?.student
        ? `${data.staj.student.name} ${data.staj.student.surname}`
        : `${uploadStaj.student.name} ${uploadStaj.student.surname}`,
      miktar: data.amount ? Number(data.amount) : null,
      odeme_tarihi: data.paymentDate,
      onay_durumu: data.status,
      ay: data.month,
      yil: data.year,
      dosya_url: data.fileUrl,
      aciklama: data.rejectReason,
      red_nedeni: data.rejectReason,
      yukleyen_kisi: data.teacher
        ? `${data.teacher.name} ${data.teacher.surname} (Öğretmen)`
        : `${teacher.name} ${teacher.surname} (Öğretmen)`,
      created_at: data.createdAt,
    };

    return NextResponse.json({ data: formattedData });
  } catch (error) {
    console.error("❌ DEKONT CREATION ERROR - TAM DETAY:", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      errorType: error instanceof Error ? error.constructor.name : typeof error,
      userRole: authResult.user?.role,
      userId: authResult.user?.id,
      timestamp: new Date().toISOString(),
    });

    // Return detailed error message for debugging - her zaman detay göster
    const errorMessage = error instanceof Error ? error.message : String(error);
    const stackTrace = error instanceof Error ? error.stack : undefined;

    return NextResponse.json(
      {
        error: `HATA DETAYI: ${errorMessage}`,
        stack: stackTrace,
        errorType:
          error instanceof Error ? error.constructor.name : typeof error,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

// Dekont güncelle - SADECE ADMIN
export async function PUT(request: Request) {
  const authResult = await validateAuthAndRole(request, ["ADMIN"]);
  if (!authResult.success) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    );
  }

  try {
    const body = await request.json();
    const { id, ...updateData } = body;

    const data = await prisma.dekont.update({
      where: { id },
      data: updateData,
      include: {
        staj: {
          include: {
            student: {
              include: {
                alan: true,
              },
            },
            company: true,
            teacher: true,
          },
        },
        company: true,
        teacher: true,
      },
    });

    return NextResponse.json({ data });
  } catch (error) {
    console.error("Dekont güncellenirken hata:", error);
    return NextResponse.json(
      { error: "Dekont güncellenirken bir hata oluştu" },
      { status: 500 }
    );
  }
}
