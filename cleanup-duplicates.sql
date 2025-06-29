-- Cleanup Duplicate Interview Records
-- This script will delete failed interview records while keeping successful ones
-- WARNING: This will permanently delete failed records!

-- First, let's see what we have
SELECT 
  filename,
  quotes_extracted,
  processing_time,
  vectors_stored,
  upload_date,
  CASE 
    WHEN quotes_extracted > 0 THEN 'SUCCESS'
    WHEN quotes_extracted = 0 AND processing_time < 100 THEN 'FAILED'
    ELSE 'UNKNOWN'
  END as status
FROM user_interviews 
ORDER BY filename, upload_date;

-- Delete failed records (0 quotes and short processing time)
-- These are the duplicates that failed to process properly
DELETE FROM user_interviews 
WHERE quotes_extracted = 0 
  AND processing_time < 100 
  AND filename IN (
    'Interview with Trish Herrera, Legal Assistant at JJL Law.docx',
    'Interview with Ben Evenstad, Owner at Evenstad Law.docx',
    '_Interview with Yusuf Elmarakby, Paralegal at Bruce Harvey Law Firm.docx',
    'An Interview with Brian Anderson, Attorney at Anderson Law.docx'
  );

-- Verify the cleanup
SELECT 
  filename,
  quotes_extracted,
  processing_time,
  vectors_stored,
  upload_date,
  CASE 
    WHEN quotes_extracted > 0 THEN 'SUCCESS'
    WHEN quotes_extracted = 0 AND processing_time < 100 THEN 'FAILED'
    ELSE 'UNKNOWN'
  END as status
FROM user_interviews 
ORDER BY filename, upload_date;

-- Show final count
SELECT 
  COUNT(*) as total_records,
  SUM(CASE WHEN quotes_extracted > 0 THEN 1 ELSE 0 END) as successful_records,
  SUM(CASE WHEN quotes_extracted = 0 THEN 1 ELSE 0 END) as failed_records
FROM user_interviews;

SELECT 'Cleanup completed successfully!' as status; 