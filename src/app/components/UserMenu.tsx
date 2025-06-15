'use client'
import { useState, useEffect } from 'react'
import { User } from '@supabase/auth-helpers-nextjs'
import { createClientComponent } from '@/lib/supabase-client'

export default function UserMenu() {
  const [user, setUser] = useState<User | null>(null)
  const supabase = createClientComponent()

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
    }

    getUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null)
      }
    )

    return () => subscription.unsubscribe()
  }, [supabase])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
  }

  if (!user) return null

  return (
    <div className="flex items-center gap-4">
      <span className="text-sm text-gray-700">{user.email}</span>
      <button
        onClick={handleSignOut}
        className="text-sm text-red-600 hover:text-red-800"
      >
        Sign Out
      </button>
    </div>
  )
}