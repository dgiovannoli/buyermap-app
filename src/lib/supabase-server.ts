import { createServerClient as createSupabaseServerClient } from '@supabase/ssr'
import { cookies as nextCookies } from 'next/headers'
import { Database } from '../types/supabase'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { NextRequest } from 'next/server'

// Server-side Supabase client for API route handlers and server components
export const createServerClient = async (request?: NextRequest): Promise<SupabaseClient<Database>> => {
  // Use cookies from the request if provided, otherwise fallback to next/headers (for server components)
  let cookieStore: any;
  if (request && request.cookies) {
    // For API routes, use cookies from the request
    cookieStore = request.cookies;
  } else {
    // For server components, use next/headers
    cookieStore = await nextCookies();
  }

  return createSupabaseServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options?: any }>) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )
}

// Keep the old function name for backward compatibility
export const createServerComponent = createServerClient 