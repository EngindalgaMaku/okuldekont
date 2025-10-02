export const runtime = "nodejs";
export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
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

// Çoklu dekont dosyası yükleme - SADECE ADMIN
export async function POST(request: Request) {
  const authResult = await validateAuthAndRole(request, ["ADMIN"]);
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
    const files = formData.getAll("files[]") as File[];
    const stajIds = formData.getAll("stajIds[]") as string[];
    const teacherIds = formData.getAll("teacherIds[]") as string[];
    const amounts = formData.getAll("amounts[]") as string[];
    const months = formData.getAll("months[]") as string[];
    const years = formData.getAll("years[]") as string[];
    const descriptions = formData.getAll("descriptions[]") as string[];

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: "En az bir dosya seçilmelidir" },
        { status: 400 }
      );
    }

    console.log(`🗂️ BULK UPLOAD: Starting bulk dekont upload`, {
      fileCount: files.length,
      adminId: authResult.user?.id,
      timestamp: new Date().toISOString(),
    });

    const results = {
      successful: [] as any[],
      failed: [] as any[],
      total: files.length,
    };

    // Create upload directory if it doesn't exist
    const uploadDir = join(process.cwd(), "public", "uploads", "dekontlar");
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    // Process each file
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const stajId = stajIds[i];
      const teacherId = teacherIds[i];
      const amount = amounts[i];
      const month = months[i] ? parseInt(months[i]) : new Date().getMonth() + 1;
      const year = years[i] ? parseInt(years[i]) : new Date().getFullYear();
      const description = descriptions[i];

      try {
        console.log(`📄 Processing file ${i + 1}/${files.length}:`, file.name);

        // FILE SECURITY VALIDATION
        const securityResult = await validateFileUpload(file, {
          maxSize: 10 * 1024 * 1024, // 10MB
          allowedTypes: [
            "image/jpeg",
            "image/png",
            "image/jpg",
            "application/pdf",
          ],
          strictMode: true,
        });

        if (!securityResult.safe) {
          quarantineFile(
            {
              originalName: file.name,
              adminId: authResult.user?.id,
              userEmail: authResult.user?.email,
            },
            securityResult.error || "Security validation failed"
          );

          results.failed.push({
            fileName: file.name,
            error: securityResult.error || "Güvenlik kontrolü başarısız",
          });
          continue;
        }

        // VALIDATE STAJ ID
        if (!stajId) {
          results.failed.push({
            fileName: file.name,
            error: "Staj ID gerekli",
          });
          continue;
        }

        const stajIdValidation = ValidationFunctions.id(stajId);
        if (!stajIdValidation.valid) {
          results.failed.push({
            fileName: file.name,
            error: `Geçersiz Staj ID: ${stajIdValidation.error}`,
          });
          continue;
        }

        // VALIDATE TEACHER ID
        if (!teacherId) {
          results.failed.push({
            fileName: file.name,
            error: "Öğretmen ID gerekli",
          });
          continue;
        }

        const teacherIdValidation = ValidationFunctions.id(teacherId);
        if (!teacherIdValidation.valid) {
          results.failed.push({
            fileName: file.name,
            error: `Geçersiz Öğretmen ID: ${teacherIdValidation.error}`,
          });
          continue;
        }

        // GET STAJ DATA
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
          results.failed.push({
            fileName: file.name,
            error: "Staj bulunamadı",
          });
          continue;
        }

        // GET TEACHER DATA
        const teacher = await prisma.teacherProfile.findUnique({
          where: { id: teacherId },
          select: { name: true, surname: true },
        });

        if (!teacher) {
          results.failed.push({
            fileName: file.name,
            error: "Öğretmen bulunamadı",
          });
          continue;
        }

        // VALIDATE AMOUNT
        let processedAmount: number | undefined = undefined;
        if (amount && typeof amount === "string" && amount.trim() !== "") {
          const parsed = parseFloat(amount.trim());
          if (!isNaN(parsed) && isFinite(parsed) && parsed >= 0) {
            processedAmount = parsed;
          } else {
            results.failed.push({
              fileName: file.name,
              error: "Geçersiz miktar formatı",
            });
            continue;
          }
        }

        // DEKONT VALIDATION
        const dekontData = {
          stajId: sanitizeString(stajId),
          amount: processedAmount,
          month: month || undefined,
          year: year || undefined,
          description: description ? sanitizeString(description) : undefined,
        };

        const validationResult = validateDekont(dekontData);
        if (!validationResult.valid) {
          results.failed.push({
            fileName: file.name,
            error: `Validation hatası: ${validationResult.errors.join(", ")}`,
          });
          continue;
        }

        // CHECK FOR EXISTING DEKONTS AND CALCULATE SEQUENCE NUMBER
        const existingDekontlar = await prisma.dekont.findMany({
          where: {
            studentId: staj.studentId,
            month: month,
            year: year,
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
          results.failed.push({
            fileName: file.name,
            error: `${
              monthNames[month - 1]
            } ${year} ayı için maksimum 3 dekont yüklenebilir`,
          });
          continue;
        }

        const approvedDekont = existingDekontlar.find(
          (d) => d.status === "APPROVED"
        );

        if (approvedDekont) {
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
          results.failed.push({
            fileName: file.name,
            error: `${
              monthNames[month - 1]
            } ${year} ayı için onaylanmış dekont var`,
          });
          continue;
        }

        // Calculate next sequence number
        const nextSequenceNumber =
          existingDekontlar.length > 0
            ? Math.max(
                ...existingDekontlar.map((d) => (d as any).sequenceNumber || 1)
              ) + 1
            : 1;

        // GENERATE SECURE FILENAME
        const originalExtension =
          file.name.split(".").pop()?.toLowerCase() || "pdf";

        const dekontNamingData: DekontNamingData = {
          studentName: staj.student.name,
          studentSurname: staj.student.surname,
          studentClass: staj.student.className || "Bilinmeyen",
          studentNumber: staj.student.number || undefined,
          fieldName: staj.student.alan?.name || "Bilinmeyen",
          companyName: staj.company.name,
          month: month,
          year: year,
          originalFileName: file.name,
          isAdditional: existingDekontlar.length > 0,
          additionalIndex: existingDekontlar.length + 1,
        };

        const fileName = generateDekontFileName(dekontNamingData);
        const filePath = join(uploadDir, fileName);

        // SAVE FILE
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        await writeFile(filePath, buffer);

        // VERIFY FILE SAVED
        const fs = require("fs");
        if (!fs.existsSync(filePath)) {
          results.failed.push({
            fileName: file.name,
            error: "Dosya kaydedilemedi",
          });
          continue;
        }

        // ENCRYPT AMOUNT
        const encryptedAmount = processedAmount
          ? encryptFinancialData(processedAmount.toString())
          : null;

        // CREATE DEKONT RECORD
        const createDekontData = {
          stajId: staj.id,
          companyId: staj.companyId,
          teacherId: teacherId,
          studentId: staj.studentId,
          amount: encryptedAmount,
          paymentDate: new Date(),
          month: month,
          year: year,
          sequenceNumber: nextSequenceNumber,
          status: "PENDING" as const,
          fileUrl: `/uploads/dekontlar/${fileName}`,
        };

        const dekont = await prisma.dekont.create({
          data: createDekontData as any, // Type assertion until Prisma client is regenerated
        });

        // FORMAT SUCCESS RESULT
        results.successful.push({
          fileName: file.name,
          dekontId: dekont.id,
          student: `${staj.student.name} ${staj.student.surname}`,
          company: staj.company.name,
          amount: processedAmount,
          month: month,
          year: year,
          fileUrl: dekont.fileUrl,
        });

        console.log(`✅ File ${i + 1} processed successfully:`, fileName);
      } catch (error) {
        console.error(`❌ Error processing file ${i + 1}:`, error);
        results.failed.push({
          fileName: file.name,
          error: error instanceof Error ? error.message : "Bilinmeyen hata",
        });
      }
    }

    console.log(`🗂️ BULK UPLOAD: Completed`, {
      successful: results.successful.length,
      failed: results.failed.length,
      total: results.total,
      adminId: authResult.user?.id,
    });

    // Log successful uploads for audit
    if (results.successful.length > 0) {
      console.log(
        `✅ FINANCIAL: ${results.successful.length} dekont(s) created`,
        {
          adminId: authResult.user?.id,
          timestamp: new Date().toISOString(),
          totalAmount: results.successful.reduce(
            (sum, r) => sum + (r.amount || 0),
            0
          ),
        }
      );
    }

    return NextResponse.json({
      success: true,
      results,
      message: `${results.successful.length} dosya başarıyla yüklendi, ${results.failed.length} dosya başarısız`,
    });
  } catch (error) {
    console.error("Bulk dekont upload error:", error);
    return NextResponse.json(
      { error: "Toplu dekont yüklemesi sırasında bir hata oluştu" },
      { status: 500 }
    );
  }
}
