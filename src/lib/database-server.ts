import { createServerClient } from './supabase-server'
import { DatabaseInterview, DatabaseQuote, DatabaseAssumption } from './database'

// Server-side functions (for API routes)
export async function createInterview(interview: Omit<DatabaseInterview, 'id' | 'created_at' | 'updated_at' | 'user_id'>) {
  const supabase = createServerClient()
  
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

export async function createQuote(quote: Omit<DatabaseQuote, 'id' | 'created_at' | 'updated_at' | 'user_id'>) {
  const supabase = createServerClient()
  
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
  const supabase = createServerClient()
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
  const supabase = createServerClient()
  const { data, error } = await supabase
    .from('user_assumptions')
    .insert([assumption])
    .select()
    .single()
  
  if (error) throw error
  return data
}

export async function getUserAssumptions(userId: string) {
  const supabase = createServerClient()
  const { data, error } = await supabase
    .from('user_assumptions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  
  if (error) throw error
  return data
}

export async function getCurrentUserServer() {
  const supabase = createServerClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  
  if (error) throw error
  return user
} 