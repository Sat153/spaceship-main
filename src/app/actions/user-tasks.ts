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

export async function completeTask(taskId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createClient(await cookies())
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return { success: false, error: 'Unauthorized' }

    const admin = createAdminClient()
    // Verify task belongs to this user before updating
    const { data: task } = await admin.from('admin_tasks').select('id').eq('id', taskId).eq('assigned_to', user.id).single()
    if (!task) return { success: false, error: 'Task not found' }

    const { error } = await admin.from('admin_tasks').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('id', taskId)
    if (error) return { success: false, error: error.message }
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}
