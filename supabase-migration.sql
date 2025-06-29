-- BuyerMap Database Schema Migration
-- This migration creates tables for storing complete BuyerMap sessions and data

-- Enable Row Level Security (RLS)
ALTER TABLE IF EXISTS buyer_map_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS buyer_map_assumptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS buyer_map_quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS buyer_map_files ENABLE ROW LEVEL SECURITY;

-- Create buyer_map_sessions table
CREATE TABLE IF NOT EXISTS buyer_map_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  session_name TEXT NOT NULL,
  description TEXT,
  deck_filename TEXT,
  deck_blob_url TEXT,
  overall_alignment_score INTEGER,
  validated_count INTEGER DEFAULT 0,
  partially_validated_count INTEGER DEFAULT 0,
  pending_count INTEGER DEFAULT 0,
  total_assumptions INTEGER DEFAULT 0,
  score_breakdown JSONB,
  outcome_weights JSONB,
  summary_stats JSONB,
  current_step INTEGER DEFAULT 1,
  is_complete BOOLEAN DEFAULT FALSE,
  last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create buyer_map_assumptions table
CREATE TABLE IF NOT EXISTS buyer_map_assumptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES buyer_map_sessions(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  icp_attribute TEXT NOT NULL,
  icp_theme TEXT NOT NULL,
  v1_assumption TEXT NOT NULL,
  why_assumption TEXT,
  evidence_from_deck TEXT,
  reality_from_interviews TEXT,
  reality TEXT,
  comparison_outcome TEXT CHECK (comparison_outcome IN ('Validated', 'Contradicted', 'Gap Identified', 'Insufficient Data', 'Aligned', 'Misaligned', 'New Data Added', 'Refined')),
  ways_to_adjust_messaging TEXT,
  confidence_score INTEGER DEFAULT 0,
  confidence_explanation TEXT DEFAULT '',
  confidence_breakdown JSONB,
  validation_status TEXT CHECK (validation_status IN ('pending', 'partial', 'validated', 'contradicted')) DEFAULT 'pending',
  display_outcome TEXT,
  display_reality TEXT,
  display_confidence INTEGER,
  quotes_count INTEGER DEFAULT 0,
  has_interview_data BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create buyer_map_quotes table
CREATE TABLE IF NOT EXISTS buyer_map_quotes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  assumption_id UUID REFERENCES buyer_map_assumptions(id) ON DELETE CASCADE NOT NULL,
  session_id UUID REFERENCES buyer_map_sessions(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  text TEXT NOT NULL,
  speaker TEXT,
  role TEXT,
  source TEXT NOT NULL,
  classification TEXT CHECK (classification IN ('RELEVANT', 'IRRELEVANT', 'ALIGNED', 'MISALIGNED', 'NEW_INSIGHT', 'NEUTRAL')),
  company_snapshot TEXT,
  rejected BOOLEAN DEFAULT FALSE,
  relevance_score INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create buyer_map_files table
CREATE TABLE IF NOT EXISTS buyer_map_files (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES buyer_map_sessions(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  filename TEXT NOT NULL,
  file_type TEXT CHECK (file_type IN ('deck', 'interview')) NOT NULL,
  blob_url TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  content_hash TEXT,
  upload_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processing_status TEXT CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed')) DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_buyer_map_sessions_user_id ON buyer_map_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_buyer_map_sessions_created_at ON buyer_map_sessions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_buyer_map_assumptions_session_id ON buyer_map_assumptions(session_id);
CREATE INDEX IF NOT EXISTS idx_buyer_map_assumptions_user_id ON buyer_map_assumptions(user_id);
CREATE INDEX IF NOT EXISTS idx_buyer_map_quotes_assumption_id ON buyer_map_quotes(assumption_id);
CREATE INDEX IF NOT EXISTS idx_buyer_map_quotes_session_id ON buyer_map_quotes(session_id);
CREATE INDEX IF NOT EXISTS idx_buyer_map_files_session_id ON buyer_map_files(session_id);
CREATE INDEX IF NOT EXISTS idx_buyer_map_files_user_id ON buyer_map_files(user_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_buyer_map_sessions_updated_at BEFORE UPDATE ON buyer_map_sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_buyer_map_assumptions_updated_at BEFORE UPDATE ON buyer_map_assumptions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_buyer_map_quotes_updated_at BEFORE UPDATE ON buyer_map_quotes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_buyer_map_files_updated_at BEFORE UPDATE ON buyer_map_files FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create RLS policies for buyer_map_sessions
CREATE POLICY "Users can view their own sessions" ON buyer_map_sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own sessions" ON buyer_map_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sessions" ON buyer_map_sessions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own sessions" ON buyer_map_sessions
  FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for buyer_map_assumptions
CREATE POLICY "Users can view their own assumptions" ON buyer_map_assumptions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own assumptions" ON buyer_map_assumptions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own assumptions" ON buyer_map_assumptions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own assumptions" ON buyer_map_assumptions
  FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for buyer_map_quotes
CREATE POLICY "Users can view their own quotes" ON buyer_map_quotes
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own quotes" ON buyer_map_quotes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own quotes" ON buyer_map_quotes
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own quotes" ON buyer_map_quotes
  FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for buyer_map_files
CREATE POLICY "Users can view their own files" ON buyer_map_files
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own files" ON buyer_map_files
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own files" ON buyer_map_files
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own files" ON buyer_map_files
  FOR DELETE USING (auth.uid() = user_id); 