import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { Database } from '../types/supabase'

// Server-side Supabase client for API route handlers
export const createServerClient = () => {
  try {
    return createRouteHandlerClient<Database>({ cookies })
  } catch (error) {
    // Fallback for non-server contexts
    console.error('Failed to create server client:', error)
    throw new Error('Server client can only be used in API routes')
  }
}

// Server-side Supabase client for server components  
export const createServerComponent = () => createServerComponentClient<Database>({ cookies }) 