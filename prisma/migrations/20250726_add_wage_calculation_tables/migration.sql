-- CreateTable
CREATE TABLE `attendance` (
    `id` VARCHAR(191) NOT NULL,
    `studentId` VARCHAR(191) NOT NULL,
    `month` INTEGER NOT NULL,
    `year` INTEGER NOT NULL,
    `absentDays` INTEGER NOT NULL DEFAULT 0,
    `totalDays` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `attendance_studentId_month_year_key`(`studentId`, `month`, `year`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `public_holidays` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `date` DATETIME(3) NOT NULL,
    `month` INTEGER NOT NULL,
    `year` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `public_holidays_date_key`(`date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `wage_rates` (
    `id` VARCHAR(191) NOT NULL,
    `alanId` VARCHAR(191) NULL,
    `dailyRate` DECIMAL(10, 2) NOT NULL,
    `validFrom` DATETIME(3) NOT NULL,
    `validTo` DATETIME(3) NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `attendance` ADD CONSTRAINT `attendance_studentId_fkey` FOREIGN KEY (`studentId`) REFERENCES `students`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `wage_rates` ADD CONSTRAINT `wage_rates_alanId_fkey` FOREIGN KEY (`alanId`) REFERENCES `fields`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- Insert default wage rate
INSERT INTO `wage_rates` (`id`, `alanId`, `dailyRate`, `validFrom`, `active`) 
VALUES ('default_wage_rate', NULL, 50.00, '2024-01-01 00:00:00', true);

-- Insert some common Turkish public holidays for 2025
INSERT INTO `public_holidays` (`id`, `name`, `date`, `month`, `year`) VALUES
('new_year_2025', 'Yılbaşı', '2025-01-01 00:00:00', 1, 2025),
('national_sovereignty_2025', 'Ulusal Egemenlik ve Çocuk Bayramı', '2025-04-23 00:00:00', 4, 2025),
('labor_day_2025', 'Emek ve Dayanışma Günü', '2025-05-01 00:00:00', 5, 2025),
('youth_day_2025', 'Atatürk''ü Anma Gençlik ve Spor Bayramı', '2025-05-19 00:00:00', 5, 2025),
('victory_day_2025', 'Zafer Bayramı', '2025-08-30 00:00:00', 8, 2025),
('republic_day_2025', 'Cumhuriyet Bayramı', '2025-10-29 00:00:00', 10, 2025);