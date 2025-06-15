'use client'
import { useState, useEffect, useCallback } from 'react'
import { User } from '@supabase/auth-helpers-nextjs'
import { createClientComponent } from '@/lib/supabase'
import AuthModal from './AuthModal'

interface UserMenuProps {
  className?: string
}

export default function UserMenu({ className = '' }: UserMenuProps) {
  const [user, setUser] = useState<User | null>(null)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const supabase = createClientComponent()

  const getUser = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    setUser(user)
  }, [supabase])

  useEffect(() => {
    getUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null)
      }
    )

    return () => subscription.unsubscribe()
  }, [getUser, supabase])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
  }

  return (
    <div className={className}>
      {user ? (
        <div className="flex items-center gap-4">
          <span className="text-sm text-white/80">
            {user.email}
          </span>
          <button
            onClick={handleSignOut}
            className="px-4 py-2 text-sm text-white bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
          >
            Sign Out
          </button>
        </div>
      ) : (
        <button
          onClick={() => setShowAuthModal(true)}
          className="px-4 py-2 text-sm text-white bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
        >
          Sign In
        </button>
      )}

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
      />
    </div>
  )
}