'use client'

import { useAuth } from '@/lib/auth'

interface UserRouteProps {
  children: React.ReactNode
}

export default function UserRoute({ children }: UserRouteProps) {
  const { user, loading } = useAuth()

  // Middleware already redirects unauthenticated users — render immediately
  // while auth initializes to avoid the full-page loading spinner
  if (!loading && !user) {
    window.location.href = '/auth/login'
    return null
  }

  return <>{children}</>
}