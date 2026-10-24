-- Add sequence_number field to dekont table and create composite unique constraint
-- This migration solves the multiple dekont recording issue by implementing a sequence-based system

-- Step 1: Add sequence_number column with default value 1
ALTER TABLE `dekonts` ADD COLUMN `sequenceNumber` INT NOT NULL DEFAULT 1;

-- Step 2: Update existing records to have sequenceNumber = 1 
-- This ensures all existing dekonts get a proper sequence number
UPDATE `dekonts` SET `sequenceNumber` = 1 WHERE `sequenceNumber` IS NULL OR `sequenceNumber` = 0;

-- Step 3: Create composite unique constraint to prevent duplicate dekont records
-- This allows multiple dekonts per student/month/year but each must have unique sequence number
ALTER TABLE `dekonts` ADD CONSTRAINT `dekonts_stajId_month_year_sequenceNumber_key` UNIQUE (`stajId`, `month`, `year`, `sequenceNumber`);

-- Migration Notes:
-- - Existing dekonts are safely preserved with sequenceNumber = 1
-- - Business rule: Maximum 3 dekonts per student/month/year will be enforced in application logic
-- - UI will show sequence numbers as "Ekim 2024 - 1", "Ekim 2024 - 2", etc.
-- - This enables proper support for partial payment scenarios from companies