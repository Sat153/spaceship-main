'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { Loader2 } from 'lucide-react'

interface AdminRouteProps {
  children: React.ReactNode
}

export default function AdminRoute({ children }: AdminRouteProps) {
  const { user, profile, loading, isAdmin } = useAuth()
  const router = useRouter()
  
  // Debug logging
  console.log('AdminRoute render:', { 
    user: !!user, 
    profile: !!profile, 
    loading, 
    isAdmin,
    profileRole: profile?.role 
  })

  useEffect(() => {
    if (!loading) {
      if (!user) {
        console.log('AdminRoute: No user found, redirecting to login')
        router.push('/auth/login')
        return
      }
      
      // Only redirect if we have a profile and user is not admin
      // This prevents redirecting admin users while profile is still loading
      if (user && profile && !isAdmin) {
        console.log('AdminRoute: User is not admin, redirecting to dashboard')
        router.push('/dashboard')
        return
      }
    }
  }, [user, profile, loading, isAdmin, router])

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-blue-400 mb-4" />
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    )
  }

  // If no user, redirect to login (but show loading while redirecting)
  if (!user) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-blue-400 mb-4" />
          <p className="text-gray-400">Redirecting to login...</p>
        </div>
      </div>
    )
  }

  // If user exists but profile not yet loaded, render children optimistically
  // (profile arrives shortly after; AdminRoute re-renders and redirects if not admin)

  // If user exists and profile is loaded but not admin, redirect to dashboard
  if (user && profile && !isAdmin) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-blue-400 mb-4" />
          <p className="text-gray-400">Redirecting to dashboard...</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}