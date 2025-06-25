
-- Add missing columns for duplicate detection and content tracking
-- Run this in your Supabase SQL editor

-- Add content tracking fields to user_interviews table
ALTER TABLE user_interviews 
ADD COLUMN IF NOT EXISTS content_hash TEXT,
ADD COLUMN IF NOT EXISTS file_size BIGINT,
ADD COLUMN IF NOT EXISTS blob_url TEXT;

-- Create indexes for fast content hash lookups (if they don't exist)
CREATE INDEX IF NOT EXISTS idx_user_interviews_content_hash ON user_interviews(user_id, content_hash);
CREATE INDEX IF NOT EXISTS idx_user_interviews_filename ON user_interviews(user_id, filename);

-- Verify the changes
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'user_interviews' 
ORDER BY ordinal_position;

