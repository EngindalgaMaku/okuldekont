import { prisma } from "@/lib/prisma";

let tableEnsured = false;

export async function ensureTeacherIssueReportsTable() {
  if (tableEnsured) return;

  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS teacher_issue_reports (
        id VARCHAR(191) NOT NULL PRIMARY KEY,
        teacherId VARCHAR(191) NOT NULL,
        category VARCHAR(100) NOT NULL,
        title VARCHAR(255) NULL,
        message TEXT NULL,
        audioUrl VARCHAR(500) NULL,
        audioDuration INT NULL,
        studentInfo VARCHAR(255) NULL,
        companyInfo VARCHAR(255) NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
        adminNote TEXT NULL,
        resolvedAt DATETIME(3) NULL,
        resolvedBy VARCHAR(191) NULL,
        createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        updatedAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
        INDEX idx_teacher_issue_reports_teacherId (teacherId),
        INDEX idx_teacher_issue_reports_status (status)
      ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    `);
    tableEnsured = true;
  } catch (error) {
    console.error("Error ensuring teacher_issue_reports table:", error);
    // Don't crash; if table already exists or permissions differ, continue
    tableEnsured = true;
  }
}
