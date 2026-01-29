'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { AuthUser, getCurrentUser, signOut } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

interface AuthContextType {
  user: any
  agent: AuthUser | null
  loading: boolean
  signOut: () => Promise<void>
  refreshAuth: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null)
  const [agent, setAgent] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  const refreshAuth = async () => {
    try {
      const { user: currentUser, agent: currentAgent } = await getCurrentUser()
      setUser(currentUser)
      setAgent(currentAgent)
    } catch (error) {
      console.error('Error refreshing auth:', error)
      setUser(null)
      setAgent(null)
    } finally {
      setLoading(false)
    }
  }

  const handleSignOut = async () => {
    try {
      await signOut()
      setUser(null)
      setAgent(null)
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  useEffect(() => {
    // Carica utente iniziale
    refreshAuth()

    // Ascolta cambiamenti auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          refreshAuth()
        } else if (event === 'SIGNED_OUT') {
          setUser(null)
          setAgent(null)
          setLoading(false)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const value = {
    user,
    agent,
    loading,
    signOut: handleSignOut,
    refreshAuth
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}