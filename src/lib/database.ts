import { supabase } from './supabase-client'

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
  // Content tracking fields for duplicate detection
  content_hash?: string
  file_size?: number
  blob_url?: string
  created_at: string
  updated_at: string
}

export interface DatabaseQuote {
  id: string
  user_id: string
  interview_id: string
  text: string
  speaker?: string
  role?: string
  source: string
  assumption_category?: string
  topic?: string
  specificity_score?: number
  rejected: boolean
  user_notes?: string
  created_at: string
  updated_at: string
}

export interface DatabaseAssumption {
  id: string
  user_id: string
  icp_attribute: string
  icp_theme: string
  v1_assumption: string
  why_assumption?: string
  evidence_from_deck?: string
  comparison_outcome?: 'Aligned' | 'New Data Added' | 'Contradicted' | 'pending'
  confidence_score?: number
  confidence_explanation?: string
  validation_status?: 'validated' | 'pending' | 'rejected'
  created_at: string
  updated_at: string
}



// Client-side functions (for components)
export async function getUserInterviewsClient(): Promise<DatabaseInterview[]> {
  // supabase client is already imported
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) throw new Error('Not authenticated')
  
  const { data, error } = await supabase
    .from('user_interviews')
    .select('*')
    .eq('user_id', user.id)
    .order('upload_date', { ascending: false })
  
  if (error) throw error
  return data || []
}

export async function getUserQuotesClient(interviewId?: string): Promise<DatabaseQuote[]> {
  // supabase client is already imported
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) throw new Error('Not authenticated')
  
  let query = supabase
    .from('user_quotes')
    .select('*')
    .eq('user_id', user.id)
  
  if (interviewId) {
    query = query.eq('interview_id', interviewId)
  }
  
  const { data, error } = await query.order('created_at', { ascending: false })
  
  if (error) throw error
  return data || []
}

export async function getUserAssumptionsClient(): Promise<DatabaseAssumption[]> {
  // supabase client is already imported
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) throw new Error('Not authenticated')
  
  const { data, error } = await supabase
    .from('user_assumptions')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
  
  if (error) throw error
  return data || []
}

// Utility functions
export async function getCurrentUser() {
  // supabase client is already imported
  const { data: { user }, error } = await supabase.auth.getUser()
  
  if (error) throw error
  return user
}

 