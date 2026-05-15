'use client'

import { useEffect } from 'react'
import { useAuth } from '@/lib/auth'

interface UserRouteProps {
  children: React.ReactNode
}

export default function UserRoute({ children }: UserRouteProps) {
  const { user, loading } = useAuth()

  useEffect(() => {
    if (!loading && !user) {
      window.location.href = '/auth/login'
    }
  }, [loading, user])

  if (!loading && !user) return null

  return <>{children}</>
}
