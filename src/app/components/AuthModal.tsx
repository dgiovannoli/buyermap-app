'use client'
import { Auth } from '@supabase/auth-ui-react'
import { ThemeSupa } from '@supabase/auth-ui-shared'
import { createClientComponent } from '../../lib/supabase-client'
import { ReactElement, useState, useEffect } from 'react'

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function AuthModal({ isOpen, onClose }: AuthModalProps): ReactElement | null {
  const supabase = createClientComponent()
  const [mounted, setMounted] = useState(false)
  const [origin, setOrigin] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setMounted(true)
    setOrigin(window.location.origin)
    
    // Debug logging for production
    console.log('🔧 Auth Modal Debug Info:', {
      origin: window.location.origin,
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
      redirectTo: `${window.location.origin}/auth/callback`
    })
  }, [])

  // Listen for auth events
  useEffect(() => {
    if (!mounted) return

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('🔐 Auth Event:', event, session?.user?.email)
        
        if (event === 'SIGNED_IN') {
          console.log('✅ User signed in successfully')
          onClose()
        }
        
        if (event === 'INITIAL_SESSION') {
          console.log('🔄 Initial session loaded')
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [mounted, supabase, onClose])

  const handleAuthError = (error: any) => {
    console.error('❌ Auth Error:', error)
    setError(error.message || 'Authentication failed. Please try again.')
  }

  if (!isOpen || !mounted) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-96 max-w-md mx-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Create Free Account</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
            aria-label="Close modal"
          >
            ×
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            <p className="text-sm">{error}</p>
            <button 
              onClick={() => setError(null)}
              className="text-xs underline mt-1"
            >
              Dismiss
            </button>
          </div>
        )}

        <Auth
          supabaseClient={supabase}
          appearance={{
            theme: ThemeSupa,
            style: {
              button: {
                background: '#3b82f6',
                color: 'white',
                borderRadius: '8px',
              },
              anchor: {
                color: '#3b82f6',
              },
            }
          }}
          providers={[]}
          onlyThirdPartyProviders={false}
          redirectTo={`${origin}/auth/callback`}
          showLinks={true}
          view="sign_up"
          localization={{
            variables: {
              sign_up: {
                email_label: 'Email address',
                password_label: 'Create a password',
                button_label: 'Create account',
                loading_button_label: 'Creating account...',
                social_provider_text: 'Continue with {{provider}}',
                link_text: 'Already have an account? Sign in',
                confirmation_text: 'Check your email for a verification link'
              },
              sign_in: {
                email_label: 'Email address', 
                password_label: 'Your password',
                button_label: 'Sign in',
                loading_button_label: 'Signing in...',
                social_provider_text: 'Continue with {{provider}}',
                link_text: "Don't have an account? Create one"
              }
            }
          }}
        />

        <div className="mt-4 text-xs text-gray-500 text-center">
          <p>By creating an account, you agree to our terms of service.</p>
          <p className="mt-1">
            Having trouble? Check your email for the magic link.
          </p>
        </div>
      </div>
    </div>
  )
}

