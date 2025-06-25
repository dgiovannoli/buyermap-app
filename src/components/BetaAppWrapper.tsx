'use client'

import { useEffect, useState, ReactNode } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase-client'
import BetaAuth from './BetaAuth'
import AuthModal from '../app/components/AuthModal'

interface BetaAppWrapperProps {
  children: React.ReactNode
}

export default function BetaAppWrapper({ children }: BetaAppWrapperProps) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [betaAuthorized, setBetaAuthorized] = useState(false)
  // supabase client is already instantiated, no need to call createClientComponent()

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setUser(session?.user ?? null)
      setLoading(false)
    }

    getInitialSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        const newUser = session?.user ?? null
        
        // Log auth events for monitoring
        if (event === 'SIGNED_IN' && newUser) {
          console.log('🎉 User signed in:', {
            email: newUser.email,
            id: newUser.id,
            created_at: newUser.created_at,
            timestamp: new Date().toISOString()
          })
          
          // Optional: Send to your monitoring service
          // await fetch('/api/analytics/user-signin', {
          //   method: 'POST',
          //   body: JSON.stringify({ user: newUser, event })
          // })
        }
        
        if (event === 'SIGNED_IN' && newUser && !user) {
          // This is likely a new signup (first sign in)
          console.log('🚀 NEW USER SIGNED UP:', {
            email: newUser.email,
            id: newUser.id,
            created_at: newUser.created_at,
            timestamp: new Date().toISOString()
          })
          
          // You could send yourself an email here
          // await notifyNewUser(newUser)
        }
        
        setUser(newUser)
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [supabase])

  // Show loading spinner while checking auth
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  // Step 3: Beta password check (comes first)
  if (!betaAuthorized) {
    return (
      <BetaAuth 
        onAuthorized={() => setBetaAuthorized(true)}
      />
    )
  }

  // Step 2: Auth check (comes second, after beta password)
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
        <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl p-8 w-96 text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Welcome to BuyerMap</h1>
          <p className="text-white/80 mb-6">Sign in to access your account</p>
          
          <button
            onClick={() => setShowAuthModal(true)}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg transition-colors"
          >
            Sign In / Sign Up
          </button>
          
          {showAuthModal && (
            <AuthModal 
              isOpen={showAuthModal}
              onClose={() => setShowAuthModal(false)}
            />
          )}
        </div>
      </div>
    )
  }

  // User is authenticated and beta authorized - show the app
  return <>{children}</>
} 