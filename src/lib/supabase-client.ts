import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

// Client-side Supabase client
export const createClientComponent = () => createClientComponentClient()

// Singleton client instance for client components  
export const supabase = createClientComponentClient()