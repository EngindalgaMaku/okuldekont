/*
  Warnings:

  - A unique constraint covering the columns `[email]` on the table `admin_profiles` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE `admin_profiles` ADD COLUMN `email` VARCHAR(191) NULL,
    ADD COLUMN `role` ENUM('USER', 'ADMIN', 'TEACHER', 'COMPANY') NOT NULL DEFAULT 'ADMIN';

-- CreateTable
CREATE TABLE `system_settings` (
    `id` VARCHAR(191) NOT NULL,
    `key` VARCHAR(191) NOT NULL,
    `value` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `system_settings_key_key`(`key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `admin_profiles_email_key` ON `admin_profiles`(`email`);
