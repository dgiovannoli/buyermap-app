import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

// Export the singleton client instance
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Export a function to create a new client instance
export const createClientComponent = () => createClient(supabaseUrl, supabaseAnonKey)