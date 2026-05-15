'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

export interface CalendarEvent {
  id: string
  title: string
  description?: string
  event_type: string
  start_date: string
  end_date: string
  all_day: boolean
  location?: string
  meeting_url?: string
  priority: string
  color: string
  assigned_to?: string
}

export async function getMyCalendarEvents(): Promise<{ data: CalendarEvent[]; userId: string | null }> {
  try {
    const supabase = createClient(await cookies())
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return { data: [], userId: null }

    const admin = createAdminClient()

    const { data: profile } = await admin
      .from('profiles')
      .select('department_id')
      .eq('id', user.id)
      .single()

    if (!profile?.department_id) return { data: [], userId: user.id }

    const now = new Date().toISOString()
    const { data, error } = await admin
      .from('admin_events')
      .select('id, title, description, event_type, start_date, end_date, all_day, location, meeting_url, priority, color, assigned_to')
      .eq('department_id', profile.department_id)
      .gte('end_date', now)
      .order('start_date', { ascending: true })
      .limit(50)

    if (error || !data) return { data: [], userId: user.id }

    const filtered = data.filter(e => {
      if (!e.assigned_to) return true
      try {
        const ids: string[] = JSON.parse(e.assigned_to)
        return ids.length === 0 || ids.includes(user.id)
      } catch { return true }
    })

    return { data: filtered, userId: user.id }
  } catch {
    return { data: [], userId: null }
  }
}
