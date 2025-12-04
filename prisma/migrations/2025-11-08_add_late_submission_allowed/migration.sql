-- Migration: Add companies.lateSubmissionAllowed (non-destructive)
-- Purpose  : Mark companies that are allowed to send receipts late
-- Provider : MySQL
-- Safety   : This migration only adds a new NOT NULL column with a sane default (0 = false).
--            Existing rows will be backfilled automatically by the default value. No data is dropped.

-- If your MySQL supports IF NOT EXISTS, you can keep it, otherwise remove the clause and run once.
ALTER TABLE `companies`
  ADD COLUMN `lateSubmissionAllowed` TINYINT(1) NOT NULL DEFAULT 0;

-- Optional: verify backfill (should return 0)
-- SELECT COUNT(*) AS null_count FROM `companies` WHERE `lateSubmissionAllowed` IS NULL;


