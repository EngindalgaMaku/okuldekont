-- AlterTable
ALTER TABLE `companies` ADD COLUMN `companyType` ENUM('PRIVATE', 'GOVERNMENT') NOT NULL DEFAULT 'PRIVATE';

-- CreateIndex
CREATE INDEX `companies_companyType_idx` ON `companies`(`companyType`);