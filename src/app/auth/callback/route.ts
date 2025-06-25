import { createServerClient } from '../../../lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const error = requestUrl.searchParams.get('error')
  const errorCode = requestUrl.searchParams.get('error_code')
  const errorDescription = requestUrl.searchParams.get('error_description')

  console.log('🔐 Auth callback received:', {
    code: code ? 'present' : 'missing',
    error,
    errorCode,
    errorDescription,
    url: request.url
  })

  // Handle auth errors (like expired OTP)
  if (error) {
    console.error('❌ Auth callback error:', {
      error,
      errorCode,
      errorDescription
    })

    // Redirect to home with error parameters for user notification
    const redirectUrl = new URL('/', request.url)
    redirectUrl.searchParams.set('auth_error', error)
    redirectUrl.searchParams.set('auth_error_code', errorCode || '')
    redirectUrl.searchParams.set('auth_error_description', errorDescription || '')
    
    return NextResponse.redirect(redirectUrl)
  }

  // Handle successful auth code exchange
  if (code) {
    try {
      const supabase = await createServerClient()
      const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
      
      if (exchangeError) {
        console.error('❌ Code exchange failed:', exchangeError)
        
        // Redirect with exchange error
        const redirectUrl = new URL('/', request.url)
        redirectUrl.searchParams.set('auth_error', 'exchange_failed')
        redirectUrl.searchParams.set('auth_error_description', exchangeError.message)
        
        return NextResponse.redirect(redirectUrl)
      }

      console.log('✅ Auth successful:', {
        userId: data.user?.id,
        email: data.user?.email
      })

      // Successful auth - redirect to home without error params
      return NextResponse.redirect(new URL('/', request.url))
      
    } catch (error: any) {
      console.error('❌ Auth callback exception:', error)
      
      const redirectUrl = new URL('/', request.url)
      redirectUrl.searchParams.set('auth_error', 'callback_exception')
      redirectUrl.searchParams.set('auth_error_description', error.message)
      
      return NextResponse.redirect(redirectUrl)
    }
  }

  // No code and no error - just redirect to home
  console.log('⚠️ Auth callback with no code or error')
  return NextResponse.redirect(new URL('/', request.url))
} 