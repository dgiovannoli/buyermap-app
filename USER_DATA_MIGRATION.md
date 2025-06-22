# 🚨 URGENT: User Data Migration Guide

## ⚠️ **Critical Security Issue**

Your app currently stores all user data in localStorage, which means:
- ❌ **All users see the same interviews/transcripts**
- ❌ **No data privacy or isolation**
- ❌ **Major security vulnerability**

This needs to be fixed immediately before going to production.

## 🛠️ **Step-by-Step Fix**

### Step 1: Set Up Database Schema (5 minutes)

1. **Go to your Supabase dashboard**
2. **Click on "SQL Editor"**
3. **Copy and paste this SQL** (all at once):

```sql
-- Create profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_interviews table
CREATE TABLE IF NOT EXISTS user_interviews (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  filename TEXT NOT NULL,
  upload_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status TEXT CHECK (status IN ('processing', 'completed', 'failed')) DEFAULT 'processing',
  company_size TEXT CHECK (company_size IN ('solo', 'small', 'medium', 'large', 'enterprise')),
  role TEXT,
  industry TEXT,
  region TEXT,
  tags TEXT[],
  notes TEXT,
  custom_fields JSONB,
  quotes_extracted INTEGER DEFAULT 0,
  processing_time INTEGER DEFAULT 0,
  unique_speakers TEXT[],
  pinecone_namespace TEXT,
  vectors_stored INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_quotes table
CREATE TABLE IF NOT EXISTS user_quotes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  interview_id UUID REFERENCES user_interviews(id) ON DELETE CASCADE NOT NULL,
  text TEXT NOT NULL,
  speaker TEXT,
  role TEXT,
  source TEXT NOT NULL,
  assumption_category TEXT,
  topic TEXT,
  specificity_score INTEGER CHECK (specificity_score >= 1 AND specificity_score <= 10),
  rejected BOOLEAN DEFAULT FALSE,
  user_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_assumptions table
CREATE TABLE IF NOT EXISTS user_assumptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  icp_attribute TEXT NOT NULL,
  icp_theme TEXT NOT NULL,
  v1_assumption TEXT NOT NULL,
  why_assumption TEXT,
  evidence_from_deck TEXT,
  comparison_outcome TEXT CHECK (comparison_outcome IN ('Aligned', 'New Data Added', 'Contradicted', 'pending')),
  confidence_score INTEGER CHECK (confidence_score >= 0 AND confidence_score <= 100),
  confidence_explanation TEXT,
  validation_status TEXT CHECK (validation_status IN ('validated', 'pending', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_interviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_assumptions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for profiles
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Create RLS policies for user_interviews
CREATE POLICY "Users can view own interviews" ON user_interviews
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own interviews" ON user_interviews
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own interviews" ON user_interviews
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own interviews" ON user_interviews
  FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for user_quotes
CREATE POLICY "Users can view own quotes" ON user_quotes
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own quotes" ON user_quotes
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own quotes" ON user_quotes
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own quotes" ON user_quotes
  FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for user_assumptions
CREATE POLICY "Users can view own assumptions" ON user_assumptions
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own assumptions" ON user_assumptions
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own assumptions" ON user_assumptions
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own assumptions" ON user_assumptions
  FOR DELETE USING (auth.uid() = user_id);

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

4. **Click "Run"** - you should see "Success. No rows returned"

### Step 2: Update Interview Library Page (2 minutes)

Replace the mock data in `src/app/interviews/page.tsx`:

```typescript
// Replace this line:
const [interviews, setInterviews] = useState<StoredInterview[]>(mockInterviews);

// With this:
const [interviews, setInterviews] = useState<StoredInterview[]>([]);

// Add this useEffect to load real data:
useEffect(() => {
  const loadInterviews = async () => {
    try {
      const userInterviews = await getUserInterviewsClient();
      // Convert database format to StoredInterview format
      const convertedInterviews: StoredInterview[] = userInterviews.map(interview => ({
        id: interview.id,
        filename: interview.filename,
        uploadDate: new Date(interview.upload_date),
        status: interview.status,
        companySize: interview.company_size,
        role: interview.role,
        industry: interview.industry,
        region: interview.region,
        quotesExtracted: interview.quotes_extracted,
        processingTime: interview.processing_time,
        uniqueSpeakers: interview.unique_speakers,
        vectorsStored: interview.vectors_stored,
        tags: interview.tags || []
      }));
      setInterviews(convertedInterviews);
    } catch (error) {
      console.error('Failed to load interviews:', error);
    }
  };

  loadInterviews();
}, []);
```

### Step 3: Update Interview Processing API (3 minutes)

In your interview processing API routes, add user association:

```typescript
// At the top of your API route:
import { getCurrentUserServer, createInterview, createQuote } from '../../../lib/database';

// In your processing function, before processing:
const user = await getCurrentUserServer();
if (!user) {
  return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
}

// After processing an interview, save to database:
const interviewRecord = await createInterview({
  user_id: user.id,
  filename: file.name,
  status: 'completed',
  company_size: extractedMetadata.companySize,
  role: extractedMetadata.role,
  industry: extractedMetadata.industry,
  quotes_extracted: totalQuotes,
  processing_time: Math.round(processingTime / 1000),
  unique_speakers: extractedMetadata.uniqueSpeakers || [],
  vectors_stored: totalQuotes * 3
});

// Save each quote to database:
for (const quote of quotes) {
  await createQuote({
    user_id: user.id,
    interview_id: interviewRecord.id,
    text: quote.text,
    speaker: quote.speaker,
    role: quote.role,
    source: quote.source,
    assumption_category: quote.assumption_category,
    specificity_score: quote.specificity_score,
    rejected: false
  });
}
```

### Step 4: Test User Isolation (5 minutes)

1. **Create two test accounts:**
   - Account A: `test1@example.com`
   - Account B: `test2@example.com`

2. **Upload different interviews with each account**

3. **Verify isolation:**
   - Log in as Account A → should only see Account A's interviews
   - Log in as Account B → should only see Account B's interviews

4. **Check database directly:**
   ```sql
   SELECT user_id, filename FROM user_interviews;
   ```
   Should show different user_ids for different accounts

## 🚨 **Before Going Live**

- [ ] Run the SQL schema setup
- [ ] Update interview processing to save to database
- [ ] Update interview library to load from database
- [ ] Test with multiple user accounts
- [ ] Verify RLS is working (each user only sees their data)
- [ ] Remove any localStorage usage for user data

## 🔍 **Verify Security**

After implementation, test that:
1. User A cannot see User B's interviews
2. Database queries automatically filter by user
3. API endpoints require authentication
4. RLS policies are active and working

## 📞 **Need Help?**

If you run into issues:
1. Check Supabase logs for RLS policy errors
2. Verify environment variables are set correctly
3. Test authentication flow first
4. Check browser console for errors

**This is critical for user privacy and security!** Each user must only see their own data. 