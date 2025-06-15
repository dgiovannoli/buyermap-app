import { createClient } from '@supabase/supabase-js'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// For direct client usage
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// For client components
export const createClientComponent = () => createClientComponentClient()