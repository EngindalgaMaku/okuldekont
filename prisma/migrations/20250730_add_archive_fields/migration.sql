-- Add archive fields to education_years table
ALTER TABLE `education_years` ADD COLUMN `archived` BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE `education_years` ADD COLUMN `archivedAt` DATETIME(3) NULL;
ALTER TABLE `education_years` ADD COLUMN `archivedBy` VARCHAR(191) NULL;

-- Add archive fields to internships table
ALTER TABLE `internships` ADD COLUMN `archived` BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE `internships` ADD COLUMN `archivedAt` DATETIME(3) NULL;
ALTER TABLE `internships` ADD COLUMN `archivedBy` VARCHAR(191) NULL;

-- Add archive fields to dekonts table
ALTER TABLE `dekonts` ADD COLUMN `archived` BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE `dekonts` ADD COLUMN `archivedAt` DATETIME(3) NULL;
ALTER TABLE `dekonts` ADD COLUMN `archivedBy` VARCHAR(191) NULL;

-- Add archive fields to internship_history table
ALTER TABLE `internship_history` ADD COLUMN `archived` BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE `internship_history` ADD COLUMN `archivedAt` DATETIME(3) NULL;
ALTER TABLE `internship_history` ADD COLUMN `archivedBy` VARCHAR(191) NULL;