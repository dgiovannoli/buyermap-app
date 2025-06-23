'use client'

import { useState, useEffect } from 'react'
import { createClientComponent } from '../../lib/supabase-client'

export default function AuthDebugPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [debugInfo, setDebugInfo] = useState<any>({})
  const supabase = createClientComponent()

  useEffect(() => {
    // Collect debug information
    setDebugInfo({
      origin: typeof window !== 'undefined' ? window.location.origin : 'server',
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
      redirectUrl: typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : 'server',
      userAgent: typeof window !== 'undefined' ? navigator.userAgent : 'server'
    })
  }, [])

  const sendMagicLink = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')

    try {
      console.log('🔧 Attempting to send magic link:', {
        email,
        redirectTo: `${window.location.origin}/auth/callback`
      })

      const { data, error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`
        }
      })

      if (error) {
        console.error('❌ Supabase Error:', error)
        setError(`Error: ${error.message}`)
      } else {
        console.log('✅ Magic link sent:', data)
        setMessage('Magic link sent! Check your email.')
      }
    } catch (err: any) {
      console.error('❌ Network Error:', err)
      setError(`Network error: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen p-8 bg-gray-100">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Auth Debug Page</h1>
        
        {/* Debug Info */}
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <h2 className="text-xl font-semibold mb-4">Debug Information</h2>
          <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
            {JSON.stringify(debugInfo, null, 2)}
          </pre>
        </div>

        {/* Magic Link Test */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Test Magic Link</h2>
          
          <form onSubmit={sendMagicLink} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="your@email.com"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium py-2 px-4 rounded-md transition-colors"
            >
              {loading ? 'Sending...' : 'Send Magic Link'}
            </button>
          </form>

          {message && (
            <div className="mt-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded">
              {message}
            </div>
          )}

          {error && (
            <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}
        </div>

        <div className="mt-6 text-sm text-gray-600">
          <p>This page helps debug authentication issues in production.</p>
          <p>Check the browser console for detailed logs.</p>
        </div>
      </div>
    </div>
  )
} 