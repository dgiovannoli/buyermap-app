# Supabase Row Level Security (RLS) Setup

## 🔒 Critical: User Data Isolation

Currently, your app stores data in localStorage, which means all users see the same data. This is a major security issue that needs to be fixed immediately.

## 📊 Database Schema Setup

### 1. **Create User Profiles Table**

In your Supabase SQL Editor, run:

```sql
-- Create profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Create trigger to auto-create profiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.created_at,
    NEW.updated_at
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

### 2. **Create User Interviews Table**

```sql
-- Create user_interviews table
CREATE TABLE IF NOT EXISTS user_interviews (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  filename TEXT NOT NULL,
  upload_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status TEXT CHECK (status IN ('processing', 'completed', 'failed')) DEFAULT 'processing',
  
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
  unique_speakers TEXT[],
  
  -- RAG storage reference
  pinecone_namespace TEXT,
  vectors_stored INTEGER DEFAULT 0,
  
  -- Add content tracking fields
  content_hash TEXT,
  file_size BIGINT,
  blob_url TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE user_interviews ENABLE ROW LEVEL SECURITY;

-- Create policies - users can only see their own interviews
CREATE POLICY "Users can view own interviews" ON user_interviews
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own interviews" ON user_interviews
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own interviews" ON user_interviews
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own interviews" ON user_interviews
  FOR DELETE USING (auth.uid() = user_id);

-- Create index for fast content hash lookups
CREATE INDEX IF NOT EXISTS idx_user_interviews_content_hash ON user_interviews(user_id, content_hash);
CREATE INDEX IF NOT EXISTS idx_user_interviews_filename ON user_interviews(user_id, filename);
```

### 3. **Create User Quotes Table**

```sql
-- Create user_quotes table
CREATE TABLE IF NOT EXISTS user_quotes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  interview_id UUID REFERENCES user_interviews(id) ON DELETE CASCADE NOT NULL,
  
  -- Quote content
  text TEXT NOT NULL,
  speaker TEXT,
  role TEXT,
  source TEXT NOT NULL,
  
  -- Classification
  assumption_category TEXT,
  topic TEXT,
  specificity_score INTEGER CHECK (specificity_score >= 1 AND specificity_score <= 10),
  
  -- User actions
  rejected BOOLEAN DEFAULT FALSE,
  user_notes TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE user_quotes ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view own quotes" ON user_quotes
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own quotes" ON user_quotes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own quotes" ON user_quotes
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own quotes" ON user_quotes
  FOR DELETE USING (auth.uid() = user_id);
```

### 4. **Create User Assumptions Table**

```sql
-- Create user_assumptions table
CREATE TABLE IF NOT EXISTS user_assumptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  -- Assumption content
  icp_attribute TEXT NOT NULL,
  icp_theme TEXT NOT NULL,
  v1_assumption TEXT NOT NULL,
  why_assumption TEXT,
  evidence_from_deck TEXT,
  
  -- Validation results
  comparison_outcome TEXT CHECK (comparison_outcome IN ('Aligned', 'New Data Added', 'Contradicted', 'pending')),
  confidence_score INTEGER CHECK (confidence_score >= 0 AND confidence_score <= 100),
  confidence_explanation TEXT,
  validation_status TEXT CHECK (validation_status IN ('validated', 'pending', 'rejected')),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE user_assumptions ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view own assumptions" ON user_assumptions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own assumptions" ON user_assumptions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own assumptions" ON user_assumptions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own assumptions" ON user_assumptions
  FOR DELETE USING (auth.uid() = user_id);
```

## 🔧 **Update Your Application Code**

### 1. **Create Database Service**

```typescript
// src/lib/database.ts
import { createServerClient } from './supabase-server'
import { createClientComponent } from './supabase-client'

export interface DatabaseInterview {
  id: string
  user_id: string
  filename: string
  upload_date: string
  status: 'processing' | 'completed' | 'failed'
  company_size?: 'solo' | 'small' | 'medium' | 'large' | 'enterprise'
  role?: string
  industry?: string
  region?: string
  tags?: string[]
  notes?: string
  custom_fields?: Record<string, any>
  quotes_extracted: number
  processing_time: number
  unique_speakers: string[]
  pinecone_namespace?: string
  vectors_stored: number
  created_at: string
  updated_at: string
}

// Server-side functions
export async function createInterview(interview: Omit<DatabaseInterview, 'id' | 'created_at' | 'updated_at'>) {
  const supabase = createServerClient()
  const { data, error } = await supabase
    .from('user_interviews')
    .insert([interview])
    .select()
    .single()
  
  if (error) throw error
  return data
}

export async function getUserInterviews(userId: string) {
  const supabase = createServerClient()
  const { data, error } = await supabase
    .from('user_interviews')
    .select('*')
    .eq('user_id', userId)
    .order('upload_date', { ascending: false })
  
  if (error) throw error
  return data
}

// Client-side functions
export async function getUserInterviewsClient() {
  const supabase = createClientComponent()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) throw new Error('Not authenticated')
  
  const { data, error } = await supabase
    .from('user_interviews')
    .select('*')
    .order('upload_date', { ascending: false })
  
  if (error) throw error
  return data
}
```

### 2. **Update Interview Processing API**

```typescript
// In your interview processing API routes
import { createInterview } from '../../../lib/database'

// After processing an interview successfully:
const interviewRecord = await createInterview({
  user_id: user.id, // Get from auth
  filename: file.name,
  status: 'completed',
  company_size: extractedMetadata.companySize,
  role: extractedMetadata.role,
  industry: extractedMetadata.industry,
  quotes_extracted: totalQuotes,
  processing_time: Math.round(processingTime / 1000),
  unique_speakers: extractedMetadata.uniqueSpeakers,
  vectors_stored: totalQuotes * 3
})
```

## 🚨 **Immediate Action Required**

1. **Run the SQL commands above** in your Supabase SQL Editor
2. **Update your interview processing** to save to the database instead of localStorage
3. **Update your interview library page** to load from the database
4. **Test with multiple user accounts** to ensure isolation

## 🧪 **Testing User Isolation**

1. Create two different user accounts
2. Upload interviews with each account
3. Verify each user only sees their own interviews
4. Check the database directly to confirm RLS is working

## 🔐 **Security Verification**

After setup, verify security by:
- Checking that `SELECT * FROM user_interviews` only returns current user's data
- Trying to access another user's data directly (should fail)
- Ensuring API endpoints require authentication

This will completely isolate user data and fix the security issue! 