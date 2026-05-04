import { useState, useCallback, useEffect } from 'react'
import { useAuth } from '@/lib/auth'

export interface Client {
  id: string
  name: string
  client_type: 'politician' | 'corporate' | 'ngo' | 'government_body' | 'startup' | 'nonprofit'
  status: 'active' | 'inactive' | 'prospect' | 'archived' | 'on_hold'
  display_name?: string
  primary_email?: string
  primary_phone?: string
  website_url?: string
  address?: string
  industry?: string
  company_size?: string
  department?: { id: string; name: string }
  account_manager?: { id: string; first_name: string; last_name: string; email: string }
  created_by_user?: { id: string; first_name: string; last_name: string }
  client_department_assignments?: Array<{
    id: string
    department: { id: string; name: string }
    role: string
    assigned_at: string
  }>
  client_team_assignments?: Array<{
    id: string
    user: { id: string; first_name: string; last_name: string; email: string }
    role: string
    can_edit_client: boolean
    can_view_budget: boolean
    assigned_at: string
  }>
  client_contacts?: Array<{
    id: string
    name: string
    title?: string
    email?: string
    phone?: string
    is_primary: boolean
    is_decision_maker: boolean
    notes?: string
  }>
  client_projects?: Array<{
    id: string
    project_name: string
    project_type: string
    status: string
    start_date?: string
    deadline?: string
    budget_amount?: number
    budget_currency: string
    priority: number
    completion_percentage: number
  }>
  tags?: string[]
  // Social Media Profiles
  social_instagram?: string
  social_twitter?: string
  social_youtube?: string
  social_linkedin?: string
  social_facebook?: string
  social_tiktok?: string
  social_other?: Record<string, string>
  ai_summary?: string
  created_at: string
  updated_at: string
  last_activity_at: string
}

export interface ClientFilters {
  search?: string
  status?: string
  client_type?: string
  department_id?: string
}

export interface CreateClientData {
  name: string
  client_type: Client['client_type']
  status?: Client['status']
  display_name?: string
  primary_email?: string
  primary_phone?: string
  website_url?: string
  address?: string
  industry?: string
  company_size?: string
  annual_budget_range?: string
  department_id: string
  account_manager_id?: string
  tags?: string[]
  internal_notes?: string
  client_brief?: string
  // Social Media
  social_instagram?: string
  social_twitter?: string
  social_youtube?: string
  social_linkedin?: string
  social_facebook?: string
  social_tiktok?: string
  social_other?: Record<string, string>
}

export type UpdateClientData = Partial<CreateClientData>

export interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

export function useClients(filters: ClientFilters = {}, autoFetch = true) {
  const { user, profile } = useAuth()
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  })

  const fetchClients = useCallback(async (page = 1, limit = 20) => {
    if (!user || !profile) return

    setLoading(true)
    setError(null)

    try {
      const searchParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(filters.search && { search: filters.search }),
        ...(filters.status && { status: filters.status }),
        ...(filters.client_type && { client_type: filters.client_type }),
        ...(filters.department_id && { department_id: filters.department_id }),
      })

      const response = await fetch(`/api/clients?${searchParams}`)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch clients')
      }

      const data = await response.json()
      setClients(data.clients)
      setPagination(data.pagination)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch clients'
      setError(errorMessage)
      console.error('Error fetching clients:', err)
    } finally {
      setLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, profile?.id, filters.search, filters.status, filters.client_type, filters.department_id])

  const createClient = async (clientData: CreateClientData): Promise<Client | null> => {
    if (!user) throw new Error('User not authenticated')

    try {
      const response = await fetch('/api/clients', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(clientData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create client')
      }

      const data = await response.json()
      const newClient = data.client

      // Update local state
      setClients(prev => [newClient, ...prev])
      setPagination(prev => ({ ...prev, total: prev.total + 1 }))

      return newClient
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create client'
      setError(errorMessage)
      console.error('Error creating client:', err)
      return null
    }
  }

  const updateClient = async (clientId: string, clientData: UpdateClientData): Promise<Client | null> => {
    if (!user) throw new Error('User not authenticated')

    try {
      const response = await fetch(`/api/clients/${clientId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(clientData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update client')
      }

      const data = await response.json()
      const updatedClient = data.client

      // Update local state
      setClients(prev => prev.map(client =>
        client.id === clientId ? updatedClient : client
      ))

      return updatedClient
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update client'
      setError(errorMessage)
      console.error('Error updating client:', err)
      return null
    }
  }

  const deleteClient = async (clientId: string): Promise<boolean> => {
    if (!user) throw new Error('User not authenticated')

    try {
      const response = await fetch(`/api/clients/${clientId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete client')
      }

      // Update local state
      setClients(prev => prev.filter(client => client.id !== clientId))
      setPagination(prev => ({ ...prev, total: prev.total - 1 }))

      return true
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete client'
      setError(errorMessage)
      console.error('Error deleting client:', err)
      return false
    }
  }

  // Auto-fetch on mount and when filters change
  useEffect(() => {
    if (autoFetch && user && profile) {
      fetchClients(1, 20)
    }
    // Use stable IDs instead of object refs to prevent re-fetch loops
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoFetch, user?.id, profile?.id])

  const refetch = useCallback(() => {
    fetchClients(pagination.page, pagination.limit)
  }, [fetchClients, pagination.page, pagination.limit])

  return {
    clients,
    loading,
    error,
    pagination,
    fetchClients,
    createClient,
    updateClient,
    deleteClient,
    refetch,
  }
}

// Hook for fetching a single client
export function useClient(clientId: string | null) {
  const { user } = useAuth()
  const [client, setClient] = useState<Client | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchClient = useCallback(async () => {
    if (!clientId || !user) return

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/clients/${clientId}`)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch client')
      }

      const data = await response.json()
      setClient(data.client)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch client'
      setError(errorMessage)
      console.error('Error fetching client:', err)
    } finally {
      setLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId, user?.id])

  useEffect(() => {
    if (clientId && user) {
      fetchClient()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId, user?.id])

  return {
    client,
    loading,
    error,
    refetch: fetchClient,
  }
}