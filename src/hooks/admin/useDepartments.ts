import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'

export interface Department {
  id: string
  name: string
  description?: string
  color?: string
  created_at: string
  updated_at: string
}

export function useDepartments() {
  const { user } = useAuth()
  const [departments, setDepartments] = useState<Department[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchDepartments = useCallback(async () => {
    if (!user) return

    try {
      setLoading(true)
      setError(null)

      const { data, error: fetchError } = await supabase
        .from('departments')
        .select('*')
        .order('name')

      if (fetchError) {
        console.error('Error fetching departments:', fetchError)
        setError('Failed to fetch departments')
        return
      }

      setDepartments(data || [])
    } catch (err) {
      console.error('Error in fetchDepartments:', err)
      setError('Failed to fetch departments')
    } finally {
      setLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  useEffect(() => {
    fetchDepartments()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  return {
    departments,
    loading,
    error,
    refetch: fetchDepartments,
  }
}