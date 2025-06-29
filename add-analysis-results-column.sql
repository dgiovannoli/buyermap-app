-- Add analysis_results column to user_interviews table
-- This column will store the analysis results from interview processing

ALTER TABLE user_interviews 
ADD COLUMN IF NOT EXISTS analysis_results JSONB;

-- Add comment to document the column
COMMENT ON COLUMN user_interviews.analysis_results IS 'Stores the analysis results from interview processing including assumptions, quotes, and validation data';

-- Create index for better query performance on analysis_results
CREATE INDEX IF NOT EXISTS idx_user_interviews_analysis_results ON user_interviews USING GIN (analysis_results);

-- Update the updated_at trigger to include analysis_results changes
-- (The existing trigger should already handle this, but let's make sure) 