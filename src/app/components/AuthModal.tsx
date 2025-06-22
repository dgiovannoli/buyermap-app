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

  useEffect(() => {
    setMounted(true)
    setOrigin(window.location.origin)
  }, [])

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
        />
      </div>
    </div>
  )
}// Updated for Vercel fix

