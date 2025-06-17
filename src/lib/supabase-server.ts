import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { Database } from '../types/supabase'

// Server-side Supabase client for server components
export const createServerClient = () => createServerComponentClient<Database>({ cookies })

// Server-side Supabase client for route handlers
export const createRouteHandler = () => createRouteHandlerClient<Database>({ cookies }) 