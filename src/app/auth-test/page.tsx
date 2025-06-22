'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClientComponent } from '../../lib/supabase-client'
import { User } from '@supabase/auth-helpers-nextjs'

export default function AuthTestPage() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [betaStatus, setBetaStatus] = useState<string>('')
  const supabase = createClientComponent()

  useEffect(() => {
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setUser(session?.user ?? null)
      setLoading(false)
    }

    getUser()

    // Check beta status
    const betaAuth = localStorage.getItem('betaAuthorized')
    setBetaStatus(betaAuth === 'true' ? 'Authorized' : 'Not Authorized')

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null)
      }
    )

    return () => subscription.unsubscribe()
  }, [supabase])

  const clearBetaAuth = () => {
    localStorage.removeItem('betaAuthorized')
    setBetaStatus('Not Authorized')
    window.location.reload()
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    localStorage.removeItem('betaAuthorized')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-8">Auth System Test Page</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Beta Access Status */}
          <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Beta Access Status</h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-white/80">Status:</span>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  betaStatus === 'Authorized' 
                    ? 'bg-green-500 text-white' 
                    : 'bg-red-500 text-white'
                }`}>
                  {betaStatus}
                </span>
              </div>
              <button
                onClick={clearBetaAuth}
                className="w-full bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-lg transition-colors"
              >
                Clear Beta Authorization
              </button>
            </div>
          </div>

          {/* Supabase Auth Status */}
          <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Supabase Auth Status</h2>
            <div className="space-y-3">
              {user ? (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-white/80">Email:</span>
                    <span className="text-white font-medium">{user.email}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-white/80">User ID:</span>
                    <span className="text-white font-mono text-xs">{user.id}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-white/80">Status:</span>
                    <span className="bg-green-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                      Authenticated
                    </span>
                  </div>
                  <button
                    onClick={signOut}
                    className="w-full bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-lg transition-colors"
                  >
                    Sign Out
                  </button>
                </>
              ) : (
                <div className="text-center">
                  <span className="bg-red-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                    Not Authenticated
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Environment Info */}
        <div className="mt-8 bg-white/10 backdrop-blur-lg rounded-lg p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Environment Info</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-white/80">Supabase URL:</span>
              <div className="text-white font-mono text-xs mt-1 break-all">
                {process.env.NEXT_PUBLIC_SUPABASE_URL || 'Not configured'}
              </div>
            </div>
            <div>
              <span className="text-white/80">Beta Password Set:</span>
              <div className="text-white mt-1">
                {process.env.BETA_ACCESS_PASSWORD ? '✅ Yes' : '❌ No'}
              </div>
            </div>
          </div>
        </div>

        {/* Test URLs */}
        <div className="mt-8 bg-white/10 backdrop-blur-lg rounded-lg p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Test URLs</h2>
          <div className="space-y-2 text-sm">
            <div>
              <Link 
                href="/?skipBeta=true" 
                className="text-blue-400 hover:text-blue-300 underline"
              >
                Skip Beta Password (Development)
              </Link>
            </div>
            <div>
              <a 
                href="/auth-test" 
                className="text-blue-400 hover:text-blue-300 underline"
              >
                This Test Page
              </a>
            </div>
          </div>
        </div>

        {/* Success Message */}
        {user && betaStatus === 'Authorized' && (
          <div className="mt-8 bg-green-500/20 border border-green-500/30 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-green-400 mb-2">🎉 Success!</h2>
            <p className="text-green-300">
              Your auth system is working correctly. Users have both beta access and are authenticated with Supabase.
            </p>
          </div>
        )}
      </div>
    </div>
  )
} 