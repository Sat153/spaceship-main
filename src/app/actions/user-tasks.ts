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
  type?: string
  due_date?: string
  start_date?: string
  department_id?: string
  department_name?: string
  tags?: string[]
  estimated_hours?: number
  created_at?: string
}

export async function getMyTasks(): Promise<{ data: UserTask[]; error?: string }> {
  try {
    const supabase = createClient(await cookies())
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return { data: [], error: 'Unauthorized' }

    const admin = createAdminClient()
    const { data, error } = await admin
      .from('admin_tasks')
      .select('id, title, description, status, priority, type, due_date, start_date, department_id, tags, estimated_hours, created_at, departments(name)')
      .eq('assigned_to', user.id)
      .order('due_date', { ascending: true, nullsFirst: false })

    if (error) return { data: [], error: error.message }

    const tasks: UserTask[] = (data || []).map((t: any) => ({
      ...t,
      department_name: t.departments?.name ?? undefined,
      departments: undefined,
    }))

    return { data: tasks }
  } catch (e: any) {
    return { data: [], error: e.message }
  }
}

export async function startTask(taskId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createClient(await cookies())
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return { success: false, error: 'Unauthorized' }

    const admin = createAdminClient()
    const { data: task } = await admin.from('admin_tasks').select('id').eq('id', taskId).eq('assigned_to', user.id).single()
    if (!task) return { success: false, error: 'Task not found' }

    const { error } = await admin.from('admin_tasks').update({ status: 'in_progress' }).eq('id', taskId)
    if (error) return { success: false, error: error.message }
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

export async function completeTask(taskId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createClient(await cookies())
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return { success: false, error: 'Unauthorized' }

    const admin = createAdminClient()
    const { data: task } = await admin.from('admin_tasks').select('id').eq('id', taskId).eq('assigned_to', user.id).single()
    if (!task) return { success: false, error: 'Task not found' }

    const { error } = await admin.from('admin_tasks').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('id', taskId)
    if (error) return { success: false, error: error.message }
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}
