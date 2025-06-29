# Database Migration Instructions

## Add analysis_results column to user_interviews table

The application is trying to store analysis results in the database, but the `analysis_results` column doesn't exist in the `user_interviews` table. This is causing 500 errors when updating interview records.

### Steps to fix:

1. **Go to your Supabase Dashboard**
   - Navigate to https://supabase.com/dashboard
   - Select your project

2. **Open the SQL Editor**
   - Click on "SQL Editor" in the left sidebar
   - Click "New query"

3. **Run the following SQL:**

```sql
-- Add analysis_results column to user_interviews table
-- This column will store the analysis results from interview processing

ALTER TABLE user_interviews 
ADD COLUMN IF NOT EXISTS analysis_results JSONB;

-- Add comment to document the column
COMMENT ON COLUMN user_interviews.analysis_results IS 'Stores the analysis results from interview processing including assumptions, quotes, and validation data';

-- Create index for better query performance on analysis_results
CREATE INDEX IF NOT EXISTS idx_user_interviews_analysis_results ON user_interviews USING GIN (analysis_results);
```

4. **Click "Run" to execute the migration**

5. **After the migration is complete:**
   - The application will be able to store analysis results in the database
   - Duplicate detection will work properly with stored analysis results
   - The 500 errors should be resolved

### What this does:

- Adds a `JSONB` column called `analysis_results` to store the full analysis results
- Creates an index for better query performance
- Allows the application to store and retrieve analysis results for duplicate files

### After running this migration:

1. Restart your development server if needed
2. Try uploading interview files again
3. The duplicate detection should now work properly with stored analysis results 