-- Clear existing interview records to start fresh
-- This will remove all existing interview records so we can re-upload with proper analysis results

-- Delete all records from user_interviews table
DELETE FROM user_interviews;

-- Reset the sequence if there is one (optional)
-- ALTER SEQUENCE user_interviews_id_seq RESTART WITH 1;

-- Verify the table is empty
SELECT COUNT(*) as remaining_records FROM user_interviews; 