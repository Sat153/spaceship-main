'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { cookies } from 'next/headers'
import { revalidateTag } from 'next/cache'

export interface AdminEvent {
  id: string
  title: string
  description?: string
  event_type: 'meeting' | 'deadline' | 'reminder' | 'appointment' | 'block_time' | 'general'
  start_date: string
  end_date: string
  all_day: boolean
  location?: string
  meeting_url?: string
  assigned_to?: string
  department_id?: string
  client_id?: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  color: string
  tags?: string[]
  created_by: string
  created_at: string
  updated_at: string
}

export interface Department {
  id: string
  name: string
}

export interface User {
  id: string
  first_name: string
  last_name: string
}

export interface Client {
  id: string
  name: string
}

export interface EventPayload {
  title: string
  description?: string
  event_type: string
  start_date: string
  end_date: string
  all_day: boolean
  location?: string
  meeting_url?: string
  assigned_to?: string
  department_id?: string
  client_id?: string
  priority: string
  color: string
  tags?: string[]
  created_by: string
}

async function getSupabaseClient() {
  const cookieStore = await cookies()
  return createClient(cookieStore)
}

export async function fetchEvents(): Promise<{ data: AdminEvent[] | null; error: string | null }> {
  console.log('🔍 ACTION: fetchEvents')
  try {
    console.log('Server Action: Fetching events...')
    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from('admin_events')
      .select('*')
      .order('start_date', { ascending: true })

    if (error) {
      console.error('Error fetching events:', error)
      return { data: null, error: error.message }
    }

    console.log('Server Action: Events fetched successfully:', data?.length || 0)
    return { data: data || [], error: null }
  } catch (error) {
    console.error('Server Action: Error in fetchEvents:', error)
    return { data: null, error: 'Failed to fetch events' }
  }
}

export async function fetchDepartments(): Promise<{ data: Department[] | null; error: string | null }> {
  try {
    console.log('Server Action: Fetching departments...')
    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from('departments')
      .select('id, name')
      .order('name')

    if (error) {
      console.error('Error fetching departments:', error)
      return { data: null, error: error.message }
    }

    console.log('Server Action: Departments fetched successfully:', data?.length || 0)
    return { data: data || [], error: null }
  } catch (error) {
    console.error('Server Action: Error in fetchDepartments:', error)
    return { data: null, error: 'Failed to fetch departments' }
  }
}

export async function fetchUsers(): Promise<{ data: User[] | null; error: string | null }> {
  try {
    console.log('Server Action: Fetching users...')
    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from('profiles')
      .select('id, first_name, last_name')
      .order('first_name')

    if (error) {
      console.error('Error fetching users:', error)
      return { data: null, error: error.message }
    }

    console.log('Server Action: Users fetched successfully:', data?.length || 0)
    return { data: data || [], error: null }
  } catch (error) {
    console.error('Server Action: Error in fetchUsers:', error)
    return { data: null, error: 'Failed to fetch users' }
  }
}

export async function fetchClients(): Promise<{ data: Client[] | null; error: string | null }> {
  try {
    console.log('Server Action: Fetching clients...')
    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from('clients')
      .select('id, name')
      .order('name')

    if (error) {
      console.error('Error fetching clients:', error)
      return { data: null, error: error.message }
    }

    console.log('Server Action: Clients fetched successfully:', data?.length || 0)
    return { data: data || [], error: null }
  } catch (error) {
    console.error('Server Action: Error in fetchClients:', error)
    return { data: null, error: 'Failed to fetch clients' }
  }
}

export async function saveEvent(
  eventData: EventPayload,
  eventId?: string
): Promise<{ success: boolean; error: string | null }> {
  try {
    console.log('Server Action: Saving event...', { eventId, eventData })
    const supabase = await getSupabaseClient()

    if (eventId) {
      // Update existing event
      const { error } = await supabase
        .from('admin_events')
        .update(eventData)
        .eq('id', eventId)

      if (error) {
        console.error('Error updating event:', error)
        return { success: false, error: error.message }
      }
    } else {
      // Create new event
      const { error } = await supabase
        .from('admin_events')
        .insert([eventData])

      if (error) {
        console.error('Error creating event:', error)
        return { success: false, error: error.message }
      }
    }

    console.log('Server Action: Event saved successfully')
    revalidateTag('admin-events')
    return { success: true, error: null }
  } catch (error) {
    console.error('Server Action: Error in saveEvent:', error)
    return { success: false, error: 'Failed to save event' }
  }
}

export async function deleteEvent(eventId: string): Promise<{ success: boolean; error: string | null }> {
  try {
    console.log('Server Action: Deleting event...', { eventId })
    const supabase = await getSupabaseClient()
    
    const { error } = await supabase
      .from('admin_events')
      .delete()
      .eq('id', eventId)

    if (error) {
      console.error('Error deleting event:', error)
      return { success: false, error: error.message }
    }

    console.log('Server Action: Event deleted successfully')
    revalidateTag('admin-events')
    return { success: true, error: null }
  } catch (error) {
    console.error('Server Action: Error in deleteEvent:', error)
    return { success: false, error: 'Failed to delete event' }
  }
}