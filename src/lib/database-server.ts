import { createServerClient } from './supabase-server'
import { DatabaseInterview, DatabaseQuote, DatabaseAssumption } from './database'
import crypto from 'crypto'

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

// Enhanced file upload handler with duplicate detection
export async function handle_file_upload(
  file: File | { name: string; size: number; type: string },
  fileContent: Buffer | string,
  userId: string,
  options: {
    allowOverwrite?: boolean;
    allowRename?: boolean;
    checkGlobalDuplicates?: boolean;
  } = {}
) {
  const supabase = await createServerClient()
  
  // Generate content hash
  const contentHash = crypto.createHash('sha256').update(fileContent).digest('hex')
  
  // Check for existing file by content hash (user-specific)
  const existingInterview = await findInterviewByContentHash(contentHash, userId)
  
  if (existingInterview) {
    console.log(`🔍 [FILE_TRACKING] Duplicate detected for user ${userId}:`, {
      filename: file.name,
      contentHash: contentHash.substring(0, 16) + '...',
      existingId: existingInterview.id
    })
    
    return {
      isDuplicate: true,
      existingFile: existingInterview,
      contentHash,
      action: 'use-existing' as const
    }
  }
  
  // Check for filename conflicts (user-specific)
  const { data: filenameConflict, error: filenameError } = await supabase
    .from('user_interviews')
    .select('*')
    .eq('user_id', userId)
    .eq('filename', file.name)
    .single()
  
  if (filenameConflict && !options.allowOverwrite) {
    console.log(`🔍 [FILE_TRACKING] Filename conflict detected:`, {
      filename: file.name,
      existingId: filenameConflict.id
    })
    
    return {
      isDuplicate: false,
      isConflict: true,
      existingFile: filenameConflict,
      contentHash,
      action: 'rename' as const
    }
  }
  
  // Check global duplicates if enabled
  if (options.checkGlobalDuplicates) {
    const { data: globalDuplicate, error: globalError } = await supabase
      .from('user_interviews')
      .select('*')
      .eq('content_hash', contentHash)
      .neq('user_id', userId)
      .single()
    
    if (globalDuplicate) {
      console.log(`🔍 [FILE_TRACKING] Global duplicate detected:`, {
        filename: file.name,
        contentHash: contentHash.substring(0, 16) + '...',
        existingUserId: globalDuplicate.user_id
      })
      
      return {
        isDuplicate: true,
        isGlobalDuplicate: true,
        existingFile: globalDuplicate,
        contentHash,
        action: 'use-existing' as const
      }
    }
  }
  
  // No conflicts, proceed with upload
  console.log(`✅ [FILE_TRACKING] No conflicts detected, proceeding with upload:`, {
    filename: file.name,
    contentHash: contentHash.substring(0, 16) + '...',
    fileSize: file.size
  })
  
  return {
    isDuplicate: false,
    isConflict: false,
    contentHash,
    action: 'upload' as const
  }
}

// Enhanced function to save interview with file tracking
export async function saveInterviewWithTracking(
  interview: Omit<DatabaseInterview, 'id' | 'created_at' | 'updated_at' | 'user_id'> & {
    content_hash: string;
    file_size: number;
    blob_url?: string;
    user_id?: string;
  }
) {
  const supabase = await createServerClient()
  
  let userId = interview.user_id;
  
  // Get current user if user_id not provided
  if (!userId) {
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) throw new Error('User not authenticated')
    userId = user.id;
  }
  
  // Insert with enhanced tracking
  const { data, error } = await supabase
    .from('user_interviews')
    .insert([{ 
      ...interview, 
      user_id: userId,
      upload_date: new Date().toISOString(),
      status: 'processing'
    }])
    .select()
    .single()
  
  if (error) throw error
  
  console.log(`✅ [FILE_TRACKING] Interview saved with tracking:`, {
    id: data.id,
    filename: data.filename,
    contentHash: data.content_hash?.substring(0, 16) + '...',
    fileSize: data.file_size
  })
  
  return data
}

// Function to update interview status after processing
export async function updateInterviewStatus(
  interviewId: string,
  status: 'processing' | 'completed' | 'failed',
  metadata?: {
    quotes_extracted?: number;
    processing_time?: number;
    unique_speakers?: string[];
    vectors_stored?: number;
  }
) {
  const supabase = await createServerClient()
  
  const updateData: any = { status }
  if (metadata) {
    Object.assign(updateData, metadata)
  }
  
  const { data, error } = await supabase
    .from('user_interviews')
    .update(updateData)
    .eq('id', interviewId)
    .select()
    .single()
  
  if (error) throw error
  
  console.log(`🔄 [FILE_TRACKING] Interview status updated:`, {
    id: interviewId,
    status,
    metadata
  })
  
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