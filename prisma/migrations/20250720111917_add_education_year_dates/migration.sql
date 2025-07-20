-- AlterTable
ALTER TABLE `education_years` ADD COLUMN `endDate` DATETIME(3) NULL,
    ADD COLUMN `startDate` DATETIME(3) NULL;

-- AlterTable
ALTER TABLE `internships` ADD COLUMN `lastModifiedAt` DATETIME(3) NULL,
    ADD COLUMN `lastModifiedBy` VARCHAR(191) NULL,
    ADD COLUMN `terminatedBy` VARCHAR(191) NULL,
    ADD COLUMN `terminationDocumentId` VARCHAR(191) NULL,
    ADD COLUMN `terminationNotes` VARCHAR(191) NULL,
    ADD COLUMN `terminationReason` VARCHAR(191) NULL,
    MODIFY `status` ENUM('ACTIVE', 'COMPLETED', 'CANCELLED', 'TERMINATED', 'SUSPENDED', 'PENDING_TERMINATION') NOT NULL DEFAULT 'ACTIVE';

-- AlterTable
ALTER TABLE `teachers` ADD COLUMN `active` BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE `internship_history` (
    `id` VARCHAR(191) NOT NULL,
    `internshipId` VARCHAR(191) NOT NULL,
    `action` ENUM('CREATED', 'ASSIGNED', 'COMPANY_CHANGED', 'TEACHER_CHANGED', 'TERMINATED', 'REACTIVATED', 'COMPLETED', 'UPDATED') NOT NULL,
    `previousData` JSON NULL,
    `newData` JSON NULL,
    `performedBy` VARCHAR(191) NOT NULL,
    `performedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `reason` VARCHAR(191) NULL,
    `notes` VARCHAR(191) NULL,

    INDEX `internship_history_internshipId_idx`(`internshipId`),
    INDEX `internship_history_performedAt_idx`(`performedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `gorev_belgeleri` (
    `id` VARCHAR(191) NOT NULL,
    `ogretmenId` VARCHAR(191) NOT NULL,
    `hafta` VARCHAR(191) NOT NULL,
    `isletmeIdler` VARCHAR(191) NOT NULL,
    `durum` VARCHAR(191) NOT NULL DEFAULT 'Verildi',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `belgeler` (
    `id` VARCHAR(191) NOT NULL,
    `ad` VARCHAR(191) NOT NULL,
    `belgeTuru` VARCHAR(191) NOT NULL,
    `documentType` ENUM('ASSIGNMENT_DOCUMENT', 'TERMINATION_DOCUMENT', 'COMPLETION_CERTIFICATE', 'EVALUATION_FORM', 'OTHER') NULL,
    `dosyaUrl` VARCHAR(191) NOT NULL,
    `dosyaAdi` VARCHAR(191) NOT NULL,
    `yuklenenTaraf` VARCHAR(191) NOT NULL,
    `ogretmenId` VARCHAR(191) NULL,
    `isletmeId` VARCHAR(191) NULL,
    `relatedInternshipId` VARCHAR(191) NULL,
    `status` ENUM('PENDING', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
    `onaylayanId` VARCHAR(191) NULL,
    `onaylanmaTarihi` DATETIME(3) NULL,
    `redNedeni` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `notifications` (
    `id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `content` TEXT NOT NULL,
    `priority` ENUM('LOW', 'NORMAL', 'HIGH') NOT NULL DEFAULT 'NORMAL',
    `recipient_id` VARCHAR(191) NOT NULL,
    `recipient_type` VARCHAR(191) NOT NULL,
    `sent_by` VARCHAR(191) NOT NULL,
    `is_read` BOOLEAN NOT NULL DEFAULT false,
    `read_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `internships_studentId_status_idx` ON `internships`(`studentId`, `status`);

-- CreateIndex
CREATE INDEX `internships_companyId_status_idx` ON `internships`(`companyId`, `status`);

-- CreateIndex
CREATE INDEX `internships_teacherId_status_idx` ON `internships`(`teacherId`, `status`);

-- AddForeignKey
ALTER TABLE `internships` ADD CONSTRAINT `internships_terminatedBy_fkey` FOREIGN KEY (`terminatedBy`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `internships` ADD CONSTRAINT `internships_terminationDocumentId_fkey` FOREIGN KEY (`terminationDocumentId`) REFERENCES `belgeler`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `internships` ADD CONSTRAINT `internships_lastModifiedBy_fkey` FOREIGN KEY (`lastModifiedBy`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `internship_history` ADD CONSTRAINT `internship_history_internshipId_fkey` FOREIGN KEY (`internshipId`) REFERENCES `internships`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `internship_history` ADD CONSTRAINT `internship_history_performedBy_fkey` FOREIGN KEY (`performedBy`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `gorev_belgeleri` ADD CONSTRAINT `gorev_belgeleri_ogretmenId_fkey` FOREIGN KEY (`ogretmenId`) REFERENCES `teachers`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `belgeler` ADD CONSTRAINT `belgeler_ogretmenId_fkey` FOREIGN KEY (`ogretmenId`) REFERENCES `teachers`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `belgeler` ADD CONSTRAINT `belgeler_isletmeId_fkey` FOREIGN KEY (`isletmeId`) REFERENCES `companies`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `belgeler` ADD CONSTRAINT `belgeler_relatedInternshipId_fkey` FOREIGN KEY (`relatedInternshipId`) REFERENCES `internships`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
