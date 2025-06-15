import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

// For server components and API routes
export const createServerClient = () => createServerComponentClient({ cookies }) 