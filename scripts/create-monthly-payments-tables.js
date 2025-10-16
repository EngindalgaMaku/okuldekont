const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function createMonthlyPaymentsTables() {
  try {
    console.log("🚀 Aylık ödeme tablolarını oluşturuyor...");

    // Monthly Payments tablosu
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS \`monthly_payments\` (
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
      CREATE TABLE IF NOT EXISTS \`payment_import_logs\` (
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

    // Foreign Key Constraints Ekle (Hata olursa devam et)
    try {
      await prisma.$executeRaw`
        ALTER TABLE \`monthly_payments\` 
        ADD CONSTRAINT \`monthly_payments_studentId_fkey\` 
        FOREIGN KEY (\`studentId\`) REFERENCES \`students\`(\`id\`) 
        ON DELETE RESTRICT ON UPDATE CASCADE
      `;
      console.log("✅ studentId foreign key eklendi");
    } catch (error) {
      console.log(
        "⚠️  studentId foreign key zaten var veya students tablosu bulunamadı"
      );
    }

    try {
      await prisma.$executeRaw`
        ALTER TABLE \`monthly_payments\` 
        ADD CONSTRAINT \`monthly_payments_companyId_fkey\` 
        FOREIGN KEY (\`companyId\`) REFERENCES \`companies\`(\`id\`) 
        ON DELETE RESTRICT ON UPDATE CASCADE
      `;
      console.log("✅ companyId foreign key eklendi");
    } catch (error) {
      console.log(
        "⚠️  companyId foreign key zaten var veya companies tablosu bulunamadı"
      );
    }

    try {
      await prisma.$executeRaw`
        ALTER TABLE \`monthly_payments\` 
        ADD CONSTRAINT \`monthly_payments_teacherId_fkey\` 
        FOREIGN KEY (\`teacherId\`) REFERENCES \`teachers\`(\`id\`) 
        ON DELETE SET NULL ON UPDATE CASCADE
      `;
      console.log("✅ teacherId foreign key eklendi");
    } catch (error) {
      console.log(
        "⚠️  teacherId foreign key zaten var veya teachers tablosu bulunamadı"
      );
    }

    try {
      await prisma.$executeRaw`
        ALTER TABLE \`monthly_payments\` 
        ADD CONSTRAINT \`monthly_payments_stajId_fkey\` 
        FOREIGN KEY (\`stajId\`) REFERENCES \`internships\`(\`id\`) 
        ON DELETE SET NULL ON UPDATE CASCADE
      `;
      console.log("✅ stajId foreign key eklendi");
    } catch (error) {
      console.log(
        "⚠️  stajId foreign key zaten var veya internships tablosu bulunamadı"
      );
    }

    try {
      await prisma.$executeRaw`
        ALTER TABLE \`monthly_payments\` 
        ADD CONSTRAINT \`monthly_payments_educationYearId_fkey\` 
        FOREIGN KEY (\`educationYearId\`) REFERENCES \`education_years\`(\`id\`) 
        ON DELETE RESTRICT ON UPDATE CASCADE
      `;
      console.log("✅ educationYearId foreign key eklendi");
    } catch (error) {
      console.log(
        "⚠️  educationYearId foreign key zaten var veya education_years tablosu bulunamadı"
      );
    }

    console.log("\n🎉 Aylık ödeme tabloları başarıyla oluşturuldu!");
    console.log(
      "📝 Artık Excel dosyalarını import edebilir ve dekont karşılaştırması yapabilirsiniz.\n"
    );
  } catch (error) {
    console.error("❌ Hata:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Script çalıştırma
if (require.main === module) {
  createMonthlyPaymentsTables();
}

module.exports = { createMonthlyPaymentsTables };
