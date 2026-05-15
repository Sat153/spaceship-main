'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

export interface UserTask {
  id: string
  title: string
  description?: string
  status: string
  priority: string
  due_date?: string
  department_id?: string
}

export async function getMyTasks(): Promise<{ data: UserTask[]; error?: string }> {
  try {
    const supabase = createClient(await cookies())
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return { data: [], error: 'Unauthorized' }

    const admin = createAdminClient()
    const { data, error } = await admin
      .from('admin_tasks')
      .select('id, title, description, status, priority, due_date, department_id')
      .eq('assigned_to', user.id)
      .order('due_date', { ascending: true, nullsFirst: false })

    if (error) return { data: [], error: error.message }
    return { data: data || [] }
  } catch (e: any) {
    return { data: [], error: e.message }
  }
}
