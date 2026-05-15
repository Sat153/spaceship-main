'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const supabase = createClient()

interface Profile {
  id: string
  email: string
  first_name: string
  last_name: string
  role: string
  department_id: string | null
}

interface AuthContextType {
  user: any | null
  profile: Profile | null
  loading: boolean
  isAdmin: boolean
  signIn: (email: string, password: string) => Promise<{ error: any; user: any | null }>
  signUp: (email: string, password: string, firstName: string, lastName: string, departmentName: string) => Promise<{ error: any }>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  
  const isAdmin = profile?.role === 'admin'

  // Move refreshProfile inside useEffect to avoid dependency issues
  useEffect(() => {
    let mounted = true

    const CACHE_KEY = 'anya_profile_cache'

    const loadProfile = async (currentUser: any) => {
      // Serve cached profile immediately so UI renders without waiting
      try {
        const cached = sessionStorage.getItem(CACHE_KEY)
        if (cached) {
          const parsed = JSON.parse(cached)
          if (parsed.id === currentUser.id && mounted) {
            setProfile(parsed)
          }
        }
      } catch {}

      // Fetch fresh from DB in background
      const { data } = await supabase
        .from('profiles')
        .select('id, email, first_name, last_name, role, department_id')
        .eq('id', currentUser.id)
        .maybeSingle()
      if (mounted && data) {
        setProfile(data)
        try { sessionStorage.setItem(CACHE_KEY, JSON.stringify(data)) } catch {}
      } else if (mounted && !data) {
        setProfile(null)
        try { sessionStorage.removeItem(CACHE_KEY) } catch {}
      }
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return
        const currentUser = session?.user ?? null
        setUser(currentUser)

        if (event === 'INITIAL_SESSION') {
          if (mounted) setLoading(false)
          if (currentUser) {
            loadProfile(currentUser)
          } else {
            setProfile(null)
            try { sessionStorage.removeItem(CACHE_KEY) } catch {}
          }
        } else if (event === 'SIGNED_IN') {
          if (currentUser) await loadProfile(currentUser)
        } else if (event === 'SIGNED_OUT') {
          setProfile(null)
          try { sessionStorage.removeItem(CACHE_KEY) } catch {}
        }
      }
    )

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    return { error, user: data?.user ?? null }
  }

  const signUp = async (email: string, password: string, firstName: string, lastName: string, departmentName: string) => {
    try {
      // First get the department ID
      const { data: departments, error: deptError } = await supabase
        .from('departments')
        .select('id')
        .eq('name', departmentName)
        .single()

      if (deptError) {
        console.error('Department lookup error:', deptError)
        return { error: { message: 'Failed to find department. Please try again.' } }
      }

      if (!departments?.id) {
        return { error: { message: 'Invalid department selected. Please try again.' } }
      }

      console.log('Signing up user with department:', departments.id)

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
            department_id: departments.id,
            department_name: departmentName,
          },
        },
      })

      if (error) {
        console.error('Signup error:', error)
        return { error }
      }

      console.log('Signup successful:', data)
      return { error: null }
    } catch (err) {
      console.error('Unexpected signup error:', err)
      return { error: { message: 'An unexpected error occurred. Please try again.' } }
    }
  }

  const signOut = async () => {
    try { sessionStorage.removeItem('anya_profile_cache') } catch {}
    try { localStorage.removeItem('anya_profile_cache') } catch {}
    try { await supabase.auth.signOut({ scope: 'local' }) } catch {}
    window.location.replace('/auth/login')
  }

  // External refreshProfile function that can be called from components
  const externalRefreshProfile = useCallback(async () => {
    if (user) {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle()

        if (error) {
          console.error('❌ Error fetching profile:', error)
          setProfile(null)
        } else if (data) {
          console.log('✅ Profile refreshed for user:', user.email)
          setProfile(data)
        } else {
          console.error('❌ No profile found for user')
          setProfile(null)
        }
      } catch (err) {
        console.error('❌ Error in external refreshProfile:', err)
        setProfile(null)
      }
    }
  }, [user])

  const value = {
    user,
    profile,
    loading,
    isAdmin,
    signIn,
    signUp,
    signOut,
    refreshProfile: externalRefreshProfile,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}