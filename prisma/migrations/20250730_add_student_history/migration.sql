-- CreateTable
CREATE TABLE `student_history` (
    `id` VARCHAR(191) NOT NULL,
    `studentId` VARCHAR(191) NOT NULL,
    `changeType` ENUM('PERSONAL_INFO_UPDATE', 'CONTACT_INFO_UPDATE', 'PARENT_INFO_UPDATE', 'SCHOOL_INFO_UPDATE', 'OTHER_UPDATE') NOT NULL,
    `fieldName` VARCHAR(191) NOT NULL,
    `previousValue` TEXT NULL,
    `newValue` TEXT NULL,
    `validFrom` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `validTo` DATETIME(3) NULL,
    `changedBy` VARCHAR(191) NOT NULL,
    `reason` TEXT NULL,
    `notes` TEXT NULL,
    `archived` BOOLEAN NOT NULL DEFAULT false,
    `archivedAt` DATETIME(3) NULL,
    `archivedBy` VARCHAR(191) NULL,

    INDEX `student_history_studentId_validFrom_idx`(`studentId`, `validFrom`),
    INDEX `student_history_fieldName_idx`(`fieldName`),
    INDEX `student_history_changeType_idx`(`changeType`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `student_history` ADD CONSTRAINT `student_history_studentId_fkey` FOREIGN KEY (`studentId`) REFERENCES `students`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `student_history` ADD CONSTRAINT `student_history_changedBy_fkey` FOREIGN KEY (`changedBy`) REFERENCES `users`(`id`) ON UPDATE CASCADE;