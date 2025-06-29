-- Enhanced file tracking and duplicate prevention schema
-- This provides robust file tracking while preventing duplicates

-- Create user_interviews table with enhanced tracking
CREATE TABLE IF NOT EXISTS user_interviews (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  filename TEXT NOT NULL,
  upload_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status TEXT CHECK (status IN ('processing', 'completed', 'failed')) DEFAULT 'processing',
  
  -- Enhanced file metadata
  content_hash TEXT NOT NULL, -- SHA256 hash of file content
  file_size BIGINT NOT NULL,
  file_type TEXT, -- MIME type
  blob_url TEXT,
  
  -- Auto-extracted metadata
  company_size TEXT CHECK (company_size IN ('solo', 'small', 'medium', 'large', 'enterprise')),
  role TEXT,
  industry TEXT,
  region TEXT,
  
  -- User-added metadata
  tags TEXT[],
  notes TEXT,
  custom_fields JSONB,
  
  -- Processing results
  quotes_extracted INTEGER DEFAULT 0,
  processing_time INTEGER DEFAULT 0,
  unique_speakers TEXT[] DEFAULT '{}',
  
  -- RAG storage reference
  pinecone_namespace TEXT,
  vectors_stored INTEGER DEFAULT 0,
  
  -- Duplicate tracking
  is_duplicate_of UUID REFERENCES user_interviews(id), -- Points to original file if this is a duplicate
  duplicate_reason TEXT, -- 'filename', 'content_hash', 'similar_content'
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Enhanced constraints for duplicate prevention
  UNIQUE(user_id, filename), -- Prevent same filename per user
  UNIQUE(user_id, content_hash) -- Prevent same content per user
);

-- Create a separate table for global file tracking (optional - for cross-user deduplication)
CREATE TABLE IF NOT EXISTS global_files (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  content_hash TEXT NOT NULL UNIQUE, -- Global unique content hash
  file_size BIGINT NOT NULL,
  file_type TEXT,
  first_uploaded_by UUID REFERENCES auth.users(id),
  first_uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  total_uploads INTEGER DEFAULT 1,
  last_uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Processing metadata
  processing_status TEXT CHECK (processing_status IN ('pending', 'completed', 'failed')) DEFAULT 'pending',
  analysis_results JSONB, -- Store cached analysis results
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create file upload history table for detailed tracking
CREATE TABLE IF NOT EXISTS file_upload_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  global_file_id UUID REFERENCES global_files(id) ON DELETE CASCADE NOT NULL,
  filename TEXT NOT NULL,
  upload_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  upload_reason TEXT, -- 'new', 'duplicate', 'reupload'
  processing_time INTEGER,
  status TEXT CHECK (status IN ('processing', 'completed', 'failed')) DEFAULT 'processing',
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on all tables
ALTER TABLE user_interviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE global_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE file_upload_history ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own interviews" ON user_interviews;
DROP POLICY IF EXISTS "Users can insert their own interviews" ON user_interviews;
DROP POLICY IF EXISTS "Users can update their own interviews" ON user_interviews;
DROP POLICY IF EXISTS "Users can delete their own interviews" ON user_interviews;

-- Create enhanced policies for user_interviews
CREATE POLICY "Users can view their own interviews" ON user_interviews
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own interviews" ON user_interviews
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own interviews" ON user_interviews
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own interviews" ON user_interviews
  FOR DELETE USING (auth.uid() = user_id);

-- Policies for global_files (read-only for all authenticated users)
CREATE POLICY "Users can view global files" ON global_files
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can insert global files" ON global_files
  FOR INSERT WITH CHECK (auth.uid() = first_uploaded_by);

CREATE POLICY "Users can update global files" ON global_files
  FOR UPDATE USING (auth.uid() = first_uploaded_by);

-- Policies for file_upload_history
CREATE POLICY "Users can view their upload history" ON file_upload_history
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their upload history" ON file_upload_history
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create comprehensive indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_interviews_user_id ON user_interviews(user_id);
CREATE INDEX IF NOT EXISTS idx_user_interviews_filename ON user_interviews(filename);
CREATE INDEX IF NOT EXISTS idx_user_interviews_status ON user_interviews(status);
CREATE INDEX IF NOT EXISTS idx_user_interviews_content_hash ON user_interviews(content_hash);
CREATE INDEX IF NOT EXISTS idx_user_interviews_user_content_hash ON user_interviews(user_id, content_hash);

CREATE INDEX IF NOT EXISTS idx_global_files_content_hash ON global_files(content_hash);
CREATE INDEX IF NOT EXISTS idx_global_files_processing_status ON global_files(processing_status);

CREATE INDEX IF NOT EXISTS idx_file_upload_history_user_id ON file_upload_history(user_id);
CREATE INDEX IF NOT EXISTS idx_file_upload_history_global_file_id ON file_upload_history(global_file_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_user_interviews_updated_at BEFORE UPDATE ON user_interviews FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_global_files_updated_at BEFORE UPDATE ON global_files FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_file_upload_history_updated_at BEFORE UPDATE ON file_upload_history FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create function to handle file upload with duplicate detection
CREATE OR REPLACE FUNCTION handle_file_upload(
  p_user_id UUID,
  p_filename TEXT,
  p_content_hash TEXT,
  p_file_size BIGINT,
  p_file_type TEXT,
  p_blob_url TEXT
) RETURNS JSONB AS $$
DECLARE
  v_global_file_id UUID;
  v_user_interview_id UUID;
  v_is_duplicate BOOLEAN := FALSE;
  v_duplicate_reason TEXT;
  v_existing_user_interview_id UUID;
BEGIN
  -- Check if user already has this content
  SELECT id INTO v_existing_user_interview_id
  FROM user_interviews 
  WHERE user_id = p_user_id AND content_hash = p_content_hash;
  
  IF v_existing_user_interview_id IS NOT NULL THEN
    v_is_duplicate := TRUE;
    v_duplicate_reason := 'content_hash';
  END IF;
  
  -- Check if user already has this filename
  SELECT id INTO v_existing_user_interview_id
  FROM user_interviews 
  WHERE user_id = p_user_id AND filename = p_filename;
  
  IF v_existing_user_interview_id IS NOT NULL THEN
    v_is_duplicate := TRUE;
    v_duplicate_reason := 'filename';
  END IF;
  
  -- If duplicate, return existing record
  IF v_is_duplicate THEN
    SELECT id INTO v_user_interview_id
    FROM user_interviews 
    WHERE user_id = p_user_id AND (content_hash = p_content_hash OR filename = p_filename)
    LIMIT 1;
    
    RETURN jsonb_build_object(
      'success', true,
      'is_duplicate', true,
      'duplicate_reason', v_duplicate_reason,
      'existing_id', v_user_interview_id,
      'message', 'File already exists'
    );
  END IF;
  
  -- Check if global file exists
  SELECT id INTO v_global_file_id
  FROM global_files 
  WHERE content_hash = p_content_hash;
  
  -- Create or update global file record
  IF v_global_file_id IS NULL THEN
    INSERT INTO global_files (content_hash, file_size, file_type, first_uploaded_by)
    VALUES (p_content_hash, p_file_size, p_file_type, p_user_id)
    RETURNING id INTO v_global_file_id;
  ELSE
    -- Update existing global file
    UPDATE global_files 
    SET total_uploads = total_uploads + 1,
        last_uploaded_at = NOW()
    WHERE id = v_global_file_id;
  END IF;
  
  -- Create user interview record
  INSERT INTO user_interviews (
    user_id, filename, content_hash, file_size, file_type, blob_url
  ) VALUES (
    p_user_id, p_filename, p_content_hash, p_file_size, p_file_type, p_blob_url
  ) RETURNING id INTO v_user_interview_id;
  
  -- Create upload history record
  INSERT INTO file_upload_history (
    user_id, global_file_id, filename, upload_reason
  ) VALUES (
    p_user_id, v_global_file_id, p_filename, 'new'
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'is_duplicate', false,
    'user_interview_id', v_user_interview_id,
    'global_file_id', v_global_file_id,
    'message', 'File uploaded successfully'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 