import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Database } from '@/types/supabase'

// Client-side Supabase client
export const createClientComponent = () => createClientComponentClient<Database>()

// Singleton client instance for client components
export const supabase = createClientComponentClient<Database>() 