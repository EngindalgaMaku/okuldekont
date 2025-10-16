import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    console.log("🚀 Aylık ödeme tablolarını oluşturuyor...");

    // Önce tabloların var olup olmadığını kontrol et
    try {
      await prisma.$queryRaw`SELECT 1 FROM monthly_payments LIMIT 1`;
      return NextResponse.json({
        success: false,
        message: "monthly_payments tablosu zaten mevcut",
        created: false,
      });
    } catch (error) {
      console.log("monthly_payments tablosu yok, oluşturulacak...");
    }

    // Monthly Payments tablosu
    await prisma.$executeRaw`
      CREATE TABLE \`monthly_payments\` (
        \`id\` VARCHAR(191) NOT NULL,
        \`studentId\` VARCHAR(191) NOT NULL,
        \`companyId\` VARCHAR(191) NOT NULL,
        \`teacherId\` VARCHAR(191) NULL,
        \`stajId\` VARCHAR(191) NULL,
        \`educationYearId\` VARCHAR(191) NOT NULL,
        \`month\` INTEGER NOT NULL,
        \`year\` INTEGER NOT NULL,
        \`amount\` DECIMAL(10, 2) NOT NULL,
        \`paymentDate\` DATETIME(3) NULL,
        \`paymentType\` ENUM('GOVERNMENT_CONTRIBUTION', 'SALARY_PAYMENT', 'BONUS_PAYMENT', 'OTHER') NOT NULL DEFAULT 'GOVERNMENT_CONTRIBUTION',
        \`status\` ENUM('IMPORTED', 'PROCESSED', 'VERIFIED', 'DISPUTED', 'CANCELLED') NOT NULL DEFAULT 'IMPORTED',
        \`importSource\` VARCHAR(191) NULL,
        \`importBatch\` VARCHAR(191) NULL,
        \`importedBy\` VARCHAR(191) NULL,
        \`importedAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        \`studentName\` VARCHAR(191) NULL,
        \`studentSurname\` VARCHAR(191) NULL,
        \`studentNumber\` VARCHAR(191) NULL,
        \`studentTcNo\` VARCHAR(191) NULL,
        \`className\` VARCHAR(191) NULL,
        \`fieldName\` VARCHAR(191) NULL,
        \`companyName\` VARCHAR(191) NULL,
        \`teacherName\` VARCHAR(191) NULL,
        \`notes\` VARCHAR(191) NULL,
        \`verificationStatus\` ENUM('PENDING', 'VERIFIED', 'DISCREPANCY_FOUND', 'MANUAL_REVIEW_NEEDED') NOT NULL DEFAULT 'PENDING',
        \`verifiedBy\` VARCHAR(191) NULL,
        \`verifiedAt\` DATETIME(3) NULL,
        \`discrepancies\` LONGTEXT NULL,
        \`archived\` BOOLEAN NOT NULL DEFAULT false,
        \`archivedAt\` DATETIME(3) NULL,
        \`archivedBy\` VARCHAR(191) NULL,

        UNIQUE INDEX \`monthly_payments_studentId_month_year_paymentType_key\`(\`studentId\`, \`month\`, \`year\`, \`paymentType\`),
        INDEX \`monthly_payments_month_year_idx\`(\`month\`, \`year\`),
        INDEX \`monthly_payments_importBatch_idx\`(\`importBatch\`),
        INDEX \`monthly_payments_verificationStatus_idx\`(\`verificationStatus\`),
        INDEX \`monthly_payments_companyId_idx\`(\`companyId\`),
        INDEX \`monthly_payments_teacherId_idx\`(\`teacherId\`),
        INDEX \`monthly_payments_stajId_idx\`(\`stajId\`),
        INDEX \`monthly_payments_educationYearId_idx\`(\`educationYearId\`),
        PRIMARY KEY (\`id\`)
      ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
    `;

    console.log("✅ monthly_payments tablosu oluşturuldu");

    // Payment Import Logs tablosu
    await prisma.$executeRaw`
      CREATE TABLE \`payment_import_logs\` (
        \`id\` VARCHAR(191) NOT NULL,
        \`fileName\` VARCHAR(191) NOT NULL,
        \`filePath\` VARCHAR(191) NULL,
        \`importBatch\` VARCHAR(191) NOT NULL,
        \`totalRows\` INTEGER NOT NULL,
        \`successfulRows\` INTEGER NOT NULL,
        \`failedRows\` INTEGER NOT NULL,
        \`importedBy\` VARCHAR(191) NOT NULL,
        \`importedAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        \`status\` ENUM('PROCESSING', 'COMPLETED', 'FAILED', 'PARTIAL_SUCCESS') NOT NULL DEFAULT 'PROCESSING',
        \`errors\` LONGTEXT NULL,
        \`summary\` LONGTEXT NULL,
        
        UNIQUE INDEX \`payment_import_logs_importBatch_key\`(\`importBatch\`),
        INDEX \`payment_import_logs_importedAt_idx\`(\`importedAt\`),
        INDEX \`payment_import_logs_status_idx\`(\`status\`),
        PRIMARY KEY (\`id\`)
      ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
    `;

    console.log("✅ payment_import_logs tablosu oluşturuldu");

    // Foreign Key Constraints Ekle (hata olursa devam et)
    const constraints = [
      {
        name: "studentId_fkey",
        sql: `ALTER TABLE \`monthly_payments\` ADD CONSTRAINT \`monthly_payments_studentId_fkey\` FOREIGN KEY (\`studentId\`) REFERENCES \`students\`(\`id\`) ON DELETE RESTRICT ON UPDATE CASCADE`,
        description: "studentId foreign key",
      },
      {
        name: "companyId_fkey",
        sql: `ALTER TABLE \`monthly_payments\` ADD CONSTRAINT \`monthly_payments_companyId_fkey\` FOREIGN KEY (\`companyId\`) REFERENCES \`companies\`(\`id\`) ON DELETE RESTRICT ON UPDATE CASCADE`,
        description: "companyId foreign key",
      },
      {
        name: "teacherId_fkey",
        sql: `ALTER TABLE \`monthly_payments\` ADD CONSTRAINT \`monthly_payments_teacherId_fkey\` FOREIGN KEY (\`teacherId\`) REFERENCES \`teachers\`(\`id\`) ON DELETE SET NULL ON UPDATE CASCADE`,
        description: "teacherId foreign key",
      },
      {
        name: "stajId_fkey",
        sql: `ALTER TABLE \`monthly_payments\` ADD CONSTRAINT \`monthly_payments_stajId_fkey\` FOREIGN KEY (\`stajId\`) REFERENCES \`internships\`(\`id\`) ON DELETE SET NULL ON UPDATE CASCADE`,
        description: "stajId foreign key",
      },
      {
        name: "educationYearId_fkey",
        sql: `ALTER TABLE \`monthly_payments\` ADD CONSTRAINT \`monthly_payments_educationYearId_fkey\` FOREIGN KEY (\`educationYearId\`) REFERENCES \`education_years\`(\`id\`) ON DELETE RESTRICT ON UPDATE CASCADE`,
        description: "educationYearId foreign key",
      },
    ];

    const constraintResults = [];
    for (const constraint of constraints) {
      try {
        await prisma.$executeRaw`${constraint.sql}`;
        constraintResults.push({
          constraint: constraint.description,
          status: "success",
        });
        console.log(`✅ ${constraint.description} eklendi`);
      } catch (error) {
        constraintResults.push({
          constraint: constraint.description,
          status: "skipped",
          reason: "already exists or table not found",
        });
        console.log(
          `⚠️  ${constraint.description} zaten var veya tablo bulunamadı`
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: "Aylık ödeme tabloları başarıyla oluşturuldu!",
      created: true,
      tables: ["monthly_payments", "payment_import_logs"],
      constraints: constraintResults,
    });
  } catch (error) {
    console.error("❌ Tablo oluşturma hatası:", error);

    if (
      error instanceof Error &&
      error.message.includes("No space left on device")
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Sunucuda disk alanı yetersiz. Lütfen disk alanını temizleyin.",
          error: "DISK_SPACE_ERROR",
          details: error.message,
        },
        { status: 507 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        message: "Tablolar oluşturulurken hata oluştu",
        error: error instanceof Error ? error.message : "Bilinmeyen hata",
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
