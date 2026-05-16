'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { Loader2 } from 'lucide-react'

export default function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, profile, loading, isAdmin } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (loading) return
    if (!user) { router.push('/auth/login'); return }
    // Only redirect once profile is confirmed non-admin (avoid flicker on profile load)
    if (user && profile && !isAdmin) { router.push('/dashboard') }
  }, [user, profile, loading, isAdmin, router])

  // Only block on the initial auth check (session cookie validation)
  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
      </div>
    )
  }

  // No session at all → spinner while redirect fires
  if (!user) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
      </div>
    )
  }

  // Profile confirmed non-admin → spinner while redirect fires
  if (profile && !isAdmin) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
      </div>
    )
  }

  // User is authenticated — render immediately, profile loads in background
  return <>{children}</>
}
