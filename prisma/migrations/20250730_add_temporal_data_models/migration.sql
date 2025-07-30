-- CreateTable StudentEnrollment
CREATE TABLE `student_enrollments` (
    `id` VARCHAR(191) NOT NULL,
    `studentId` VARCHAR(191) NOT NULL,
    `educationYearId` VARCHAR(191) NOT NULL,
    `classId` VARCHAR(191) NULL,
    `className` VARCHAR(191) NOT NULL,
    `grade` INTEGER NOT NULL,
    `gradeType` ENUM('NORMAL', 'MESEM') NOT NULL DEFAULT 'NORMAL',
    `enrollmentDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `promotionDate` DATETIME(3) NULL,
    `graduationDate` DATETIME(3) NULL,
    `status` ENUM('ACTIVE', 'PROMOTED', 'GRADUATED', 'TRANSFERRED', 'DROPPED_OUT', 'SUSPENDED') NOT NULL DEFAULT 'ACTIVE',
    `notes` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `archived` BOOLEAN NOT NULL DEFAULT false,
    `archivedAt` DATETIME(3) NULL,
    `archivedBy` VARCHAR(191) NULL,

    INDEX `student_enrollments_educationYearId_grade_idx`(`educationYearId`, `grade`),
    INDEX `student_enrollments_className_idx`(`className`),
    INDEX `student_enrollments_status_idx`(`status`),
    UNIQUE INDEX `student_enrollments_studentId_educationYearId_key`(`studentId`, `educationYearId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable CompanyHistory
CREATE TABLE `company_history` (
    `id` VARCHAR(191) NOT NULL,
    `companyId` VARCHAR(191) NOT NULL,
    `changeType` ENUM('MASTER_TEACHER_UPDATE', 'BANK_ACCOUNT_UPDATE', 'EMPLOYEE_COUNT_UPDATE', 'CONTACT_INFO_UPDATE', 'ADDRESS_UPDATE', 'ACTIVITY_FIELD_UPDATE', 'OTHER_UPDATE') NOT NULL,
    `fieldName` VARCHAR(191) NOT NULL,
    `previousValue` TEXT NULL,
    `newValue` TEXT NULL,
    `validFrom` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `validTo` DATETIME(3) NULL,
    `changedBy` VARCHAR(191) NOT NULL,
    `reason` VARCHAR(191) NULL,
    `notes` TEXT NULL,
    `archived` BOOLEAN NOT NULL DEFAULT false,
    `archivedAt` DATETIME(3) NULL,
    `archivedBy` VARCHAR(191) NULL,

    INDEX `company_history_companyId_validFrom_idx`(`companyId`, `validFrom`),
    INDEX `company_history_fieldName_idx`(`fieldName`),
    INDEX `company_history_changeType_idx`(`changeType`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable TeacherHistory
CREATE TABLE `teacher_history` (
    `id` VARCHAR(191) NOT NULL,
    `teacherId` VARCHAR(191) NOT NULL,
    `changeType` ENUM('PERSONAL_INFO_UPDATE', 'CONTACT_INFO_UPDATE', 'FIELD_ASSIGNMENT_UPDATE', 'POSITION_UPDATE', 'STATUS_UPDATE', 'OTHER_UPDATE') NOT NULL,
    `fieldName` VARCHAR(191) NOT NULL,
    `previousValue` TEXT NULL,
    `newValue` TEXT NULL,
    `validFrom` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `validTo` DATETIME(3) NULL,
    `changedBy` VARCHAR(191) NOT NULL,
    `reason` VARCHAR(191) NULL,
    `notes` TEXT NULL,
    `archived` BOOLEAN NOT NULL DEFAULT false,
    `archivedAt` DATETIME(3) NULL,
    `archivedBy` VARCHAR(191) NULL,

    INDEX `teacher_history_teacherId_validFrom_idx`(`teacherId`, `validFrom`),
    INDEX `teacher_history_fieldName_idx`(`fieldName`),
    INDEX `teacher_history_changeType_idx`(`changeType`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `student_enrollments` ADD CONSTRAINT `student_enrollments_studentId_fkey` FOREIGN KEY (`studentId`) REFERENCES `students`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `student_enrollments` ADD CONSTRAINT `student_enrollments_educationYearId_fkey` FOREIGN KEY (`educationYearId`) REFERENCES `education_years`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `student_enrollments` ADD CONSTRAINT `student_enrollments_classId_fkey` FOREIGN KEY (`classId`) REFERENCES `classes`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `company_history` ADD CONSTRAINT `company_history_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `company_history` ADD CONSTRAINT `company_history_changedBy_fkey` FOREIGN KEY (`changedBy`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `teacher_history` ADD CONSTRAINT `teacher_history_teacherId_fkey` FOREIGN KEY (`teacherId`) REFERENCES `teachers`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `teacher_history` ADD CONSTRAINT `teacher_history_changedBy_fkey` FOREIGN KEY (`changedBy`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;