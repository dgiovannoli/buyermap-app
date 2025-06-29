-- Simple Database Wipe Script
-- This will delete all data from the user_interviews table
-- WARNING: This will permanently delete all data!

-- First, let's see what tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE '%interview%';

-- Disable RLS temporarily to allow data deletion
ALTER TABLE user_interviews DISABLE ROW LEVEL SECURITY;

-- Delete all data from user_interviews table
DELETE FROM user_interviews;

-- Re-enable RLS
ALTER TABLE user_interviews ENABLE ROW LEVEL SECURITY;

-- Verify the wipe
SELECT 
  'user_interviews' as table_name, 
  COUNT(*) as record_count 
FROM user_interviews;

-- Show final status
SELECT 'Database wipe completed successfully!' as status; 