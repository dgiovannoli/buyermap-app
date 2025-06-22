'use client'

import { useState, useEffect } from 'react'

interface BetaAuthProps {
  onAuthorized: () => void
}

export default function BetaAuth({ onAuthorized }: BetaAuthProps) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [isTestMode, setIsTestMode] = useState(false)

  // Check if we're in test mode (for internal testing)
  useEffect(() => {
    const testMode = process.env.NODE_ENV === 'development' && 
                    window.location.search.includes('skipBeta=true')
    setIsTestMode(testMode)
    
    // Auto-authorize in test mode
    if (testMode) {
      onAuthorized()
    }
  }, [onAuthorized])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      // Call our API route to verify the password
      const response = await fetch('/api/auth/verify-beta-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password }),
      })

      const data = await response.json()

      if (data.success) {
        // Store authorization in localStorage for this session
        localStorage.setItem('betaAuthorized', 'true')
        onAuthorized()
      } else {
        setError('Incorrect password. Please try again.')
      }
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // Check if already authorized from localStorage
  useEffect(() => {
    const isAuthorized = localStorage.getItem('betaAuthorized') === 'true'
    if (isAuthorized) {
      onAuthorized()
    }
  }, [onAuthorized])

  if (isTestMode) {
    return null // Component will auto-authorize in test mode
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl p-8 w-96">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">BuyerMap</h1>
          <p className="text-white/80">Private Beta Access</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-white/90 mb-2">
              Beta Access Password
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter beta password"
              required
            />
          </div>

          {error && (
            <div className="text-red-400 text-sm text-center">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-3 px-6 rounded-lg transition-colors"
          >
            {loading ? 'Verifying...' : 'Access Beta'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-white/60 text-sm">
            Need access? Contact us for a beta invitation.
          </p>
        </div>
      </div>
    </div>
  )
} 