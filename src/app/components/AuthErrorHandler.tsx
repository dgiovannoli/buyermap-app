'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

export default function AuthErrorHandler() {
  const [error, setError] = useState<string | null>(null)
  const [showError, setShowError] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const authError = searchParams.get('auth_error')
    const authErrorCode = searchParams.get('auth_error_code')
    const authErrorDescription = searchParams.get('auth_error_description')

    if (authError) {
      console.log('🔐 Auth error detected:', {
        error: authError,
        errorCode: authErrorCode,
        description: authErrorDescription
      })

      // Create user-friendly error messages
      let userMessage = ''
      
      if (authErrorCode === 'otp_expired') {
        userMessage = 'Your email verification link has expired. Please request a new one.'
      } else if (authError === 'access_denied') {
        userMessage = 'Access was denied. Please try signing in again.'
      } else if (authError === 'exchange_failed') {
        userMessage = 'Authentication failed. Please try again.'
      } else if (authError === 'callback_exception') {
        userMessage = 'Something went wrong during sign in. Please try again.'
      } else {
        userMessage = authErrorDescription || 'Authentication error occurred. Please try again.'
      }

      setError(userMessage)
      setShowError(true)

      // Clean up URL parameters after showing error
      const cleanUrl = new URL(window.location.origin + window.location.pathname)
      router.replace(cleanUrl.toString())
    }
  }, [searchParams, router])

  const dismissError = () => {
    setShowError(false)
    setError(null)
  }

  if (!showError || !error) return null

  return (
    <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-md mx-4">
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 shadow-lg">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3 flex-1">
            <h3 className="text-sm font-medium text-red-800">
              Authentication Error
            </h3>
            <p className="mt-1 text-sm text-red-700">
              {error}
            </p>
          </div>
          <div className="ml-auto pl-3">
            <button
              onClick={dismissError}
              className="inline-flex rounded-md bg-red-50 p-1.5 text-red-500 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-600 focus:ring-offset-2 focus:ring-offset-red-50"
            >
              <span className="sr-only">Dismiss</span>
              <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
        
        <div className="mt-4">
          <button
            onClick={dismissError}
            className="text-sm bg-red-100 hover:bg-red-200 text-red-800 px-3 py-1 rounded-md transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    </div>
  )
} 