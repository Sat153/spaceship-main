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
    let isRefreshing = false
    let initialLoadComplete = false
    
    const refreshProfile = async (currentUser: any) => {
      if (isRefreshing || !mounted) return
      
      isRefreshing = true
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', currentUser.id)
          .maybeSingle()

        if (!mounted) return

        if (error) {
          console.error('Error fetching profile:', error)
          setProfile(null)
        } else if (data) {
          console.log('Profile loaded successfully:', data)
          setProfile(data)
        } else {
          console.warn('No profile found for user - creating account without profile')
          setProfile(null)
        }
      } catch (err) {
        console.error('Error in refreshProfile:', err)
        if (mounted) {
          setProfile(null)
        }
      } finally {
        isRefreshing = false
      }
    }
    
    // Get initial user - simplified to prevent loops
    const getInitialUser = async () => {
      if (!mounted) return
      
      console.log('🔄 Getting initial user...')
      setLoading(true)
      
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        
        if (!mounted) return
        
        if (userError) {
          console.error('❌ Error getting user:', userError)
          setUser(null)
          setProfile(null)
        } else {
          console.log('✅ Initial user loaded:', user ? `user found (${user.email})` : 'no user')
          setUser(user)
          if (user) {
            await refreshProfile(user)
          } else {
            setProfile(null)
          }
        }
      } catch (error) {
        console.error('❌ Error getting initial user:', error)
        if (mounted) {
          setUser(null)
          setProfile(null)
        }
      } finally {
        if (mounted) {
          setLoading(false)
          initialLoadComplete = true
        }
      }
    }

    getInitialUser()

    // Listen for auth changes with simplified logic
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return
        
        console.log('🔄 Auth state change:', event, 'Session:', session ? 'exists' : 'none')
        
        // Handle different auth events
        switch (event) {
          case 'INITIAL_SESSION':
            console.log('⏭️ Processing INITIAL_SESSION event')
            setUser(session?.user || null)
            if (session?.user) {
              await refreshProfile(session.user)
            } else {
              setProfile(null)
            }
            if (mounted) {
              setLoading(false)
              initialLoadComplete = true
            }
            break
            
          case 'TOKEN_REFRESHED':
            console.log('🔄 Token refreshed')
            if (session?.user) {
              setUser(session.user)
              // Don't refresh profile on token refresh to avoid unnecessary calls
            }
            break
            
          case 'SIGNED_IN':
            console.log('✅ User signed in:', session?.user?.email)
            setUser(session?.user || null)
            if (session?.user) {
              await refreshProfile(session.user)
            }
            break
            
          case 'SIGNED_OUT':
            console.log('🔄 User signed out, clearing state')
            setUser(null)
            setProfile(null)
            break
            
          default:
            console.log('🔄 Other auth event:', event)
            // For any other event, just update user state without additional calls
            setUser(session?.user || null)
            if (!session?.user) {
              setProfile(null)
            }
            break
        }
      }
    )

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, []) // Remove refreshProfile dependency to prevent infinite loop

  // Remove the duplicate useEffect that was causing issues

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
    try {
      // Clear local state and redirect immediately — don't wait for Supabase
      setUser(null)
      setProfile(null)
      window.location.href = '/'

      // Sign out from Supabase in the background
      supabase.auth.signOut()
      
    } catch {
      window.location.href = '/'
    }
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