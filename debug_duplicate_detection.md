# Debug Guide: Interview Duplicate Detection Not Working

## Issue
Interview duplicate detection is not triggering even though the code appears correct.

## Debugging Steps

### 1. Check Database Schema
First, run this SQL in your Supabase SQL editor to add missing columns:

```sql
-- Add missing columns for duplicate detection and content tracking
ALTER TABLE user_interviews 
ADD COLUMN IF NOT EXISTS content_hash TEXT,
ADD COLUMN IF NOT EXISTS file_size BIGINT,
ADD COLUMN IF NOT EXISTS blob_url TEXT;

-- Create indexes for fast content hash lookups
CREATE INDEX IF NOT EXISTS idx_user_interviews_content_hash ON user_interviews(user_id, content_hash);
CREATE INDEX IF NOT EXISTS idx_user_interviews_filename ON user_interviews(user_id, filename);

-- Verify the changes
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'user_interviews' 
ORDER BY ordinal_position;
```

### 2. Check Browser Console
Open browser developer tools (F12) and look for these logs when uploading interviews:

**Expected logs when files are selected:**
- `🔍 Starting duplicate check for X interview files`
- `🔍 File details: [array of file info]`
- `🔍 Checking file 1/X: filename.docx`
- `🔍 Duplicate check result for filename.docx: {object}`

**If you see error logs:**
- `❌ Duplicate check failed for filename.docx:`
- `❌ Error details: {error info}`

### 3. Test API Endpoint Directly
Open browser console and run this test:

```javascript
// Test the duplicate check API directly
const testFile = new File(['test content'], 'test-interview.docx', { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });

const formData = new FormData();
formData.append('file', testFile);
formData.append('contentType', 'interview');
formData.append('checkSimilarity', 'true');
formData.append('similarityThreshold', '0.90');

fetch('/api/check-duplicates', {
  method: 'POST',
  body: formData
}).then(response => response.json())
  .then(data => console.log('✅ API Test Result:', data))
  .catch(error => console.error('❌ API Test Failed:', error));
```

### 4. Check Network Tab
In browser developer tools Network tab, look for:
- POST requests to `/api/check-duplicates`
- Status codes (should be 200)
- Response content

### 5. Common Issues & Solutions

**Issue**: No logs appear at all
**Solution**: Files aren't triggering the duplicate check function
- Check if `handleFileChange` is being called
- Verify file input element is working

**Issue**: "Failed to check duplicates" error  
**Solution**: API endpoint issue
- Check if `/api/check-duplicates` route exists
- Verify authentication is working
- Check server logs for API errors

**Issue**: Database column errors
**Solution**: Run the SQL schema update above

**Issue**: Files show as "ready" immediately
**Solution**: Duplicate check is failing silently
- Check browser console for error logs
- Test API endpoint directly

### 6. Force Test Duplicate Detection
To test if duplicate detection UI works, upload the same file twice:
1. Upload `interview1.docx`
2. Wait for processing to complete
3. Upload the exact same `interview1.docx` file again
4. Should see duplicate detection dialog

### 7. Enable More Detailed Logging
If still not working, add this to browser console for more debugging:

```javascript
// Override console.log to catch all duplicate-related logs
const originalLog = console.log;
console.log = function(...args) {
  if (args.some(arg => typeof arg === 'string' && (arg.includes('🔍') || arg.includes('duplicate')))) {
    originalLog.apply(console, ['[DUPLICATE DEBUG]', ...args]);
  }
  originalLog.apply(console, args);
};
```

## Expected Behavior
1. Select interview files → Status shows "checking"
2. If duplicates found → Dialog appears with options
3. If no duplicates → Status shows "ready"
4. Can upload files that are "ready"

## Next Steps
1. Run the database SQL update
2. Check browser console logs when uploading
3. Report back what logs/errors you see 