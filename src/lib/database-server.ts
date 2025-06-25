import { createServerClient } from './supabase-server'
import { DatabaseInterview, DatabaseQuote, DatabaseAssumption } from './database'

// Server-side functions (for API routes)
export async function createInterview(interview: Omit<DatabaseInterview, 'id' | 'created_at' | 'updated_at' | 'user_id'>) {
  const supabase = await createServerClient()
  
  // Get current user
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) throw new Error('User not authenticated')
  
  const { data, error } = await supabase
    .from('user_interviews')
    .insert([{ ...interview, user_id: user.id }])
    .select()
    .single()
  
  if (error) throw error
  return data
}

// Enhanced function for creating interviews with content tracking
export async function createInterviewWithHash(interview: Omit<DatabaseInterview, 'id' | 'created_at' | 'updated_at' | 'user_id'> & {
  content_hash?: string;
  file_size?: number;
  blob_url?: string;
  user_id?: string; // Allow passing user_id directly
}) {
  const supabase = await createServerClient()
  
  let userId = interview.user_id;
  
  // Get current user if user_id not provided
  if (!userId) {
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) throw new Error('User not authenticated')
    userId = user.id;
  }
  
  const { data, error } = await supabase
    .from('user_interviews')
    .insert([{ ...interview, user_id: userId }])
    .select()
    .single()
  
  if (error) throw error
  return data
}

// Check for existing interview by content hash
export async function findInterviewByContentHash(contentHash: string, userId: string) {
  const supabase = await createServerClient()
  
  const { data, error } = await supabase
    .from('user_interviews')
    .select('*')
    .eq('user_id', userId)
    .eq('content_hash', contentHash)
    .single()
  
  if (error) {
    if (error.code === 'PGRST116') {
      // No rows returned
      return null
    }
    throw error
  }
  
  return data
}

export async function getUserInterviews(userId: string) {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from('user_interviews')
    .select('*')
    .eq('user_id', userId)
    .order('upload_date', { ascending: false })
  
  if (error) throw error
  return data
}

export async function createQuote(quote: Omit<DatabaseQuote, 'id' | 'created_at' | 'updated_at' | 'user_id'>) {
  const supabase = await createServerClient()
  
  // Get current user
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) throw new Error('User not authenticated')
  
  const { data, error } = await supabase
    .from('user_quotes')
    .insert([{ ...quote, user_id: user.id }])
    .select()
    .single()
  
  if (error) throw error
  return data
}

export async function getUserQuotes(userId: string, interviewId?: string) {
  const supabase = await createServerClient()
  let query = supabase
    .from('user_quotes')
    .select('*')
    .eq('user_id', userId)
  
  if (interviewId) {
    query = query.eq('interview_id', interviewId)
  }
  
  const { data, error } = await query.order('created_at', { ascending: false })
  
  if (error) throw error
  return data
}

export async function createAssumption(assumption: Omit<DatabaseAssumption, 'id' | 'created_at' | 'updated_at'>) {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from('user_assumptions')
    .insert([assumption])
    .select()
    .single()
  
  if (error) throw error
  return data
}

export async function getUserAssumptions(userId: string) {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from('user_assumptions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  
  if (error) throw error
  return data
}

export async function getCurrentUserServer() {
  const supabase = await createServerClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  
  if (error) throw error
  return user
} 