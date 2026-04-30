'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { cookies } from 'next/headers'
import { revalidateTag } from 'next/cache'
import { sendTaskAssignmentEmail } from '@/lib/email'

export interface AdminTask {
  id: string
  title: string
  description?: string
  status: 'todo' | 'in_progress' | 'review' | 'completed' | 'cancelled'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  type: 'reminder' | 'task' | 'meeting' | 'deadline' | 'follow_up' | 'general'
  assigned_to?: string
  created_by: string
  department_id?: string
  project_id?: string
  start_date?: string
  due_date?: string
  completed_at?: string
  tags?: string[]
  estimated_hours?: number
  actual_hours?: number
  kanban_position: number
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

export interface TaskPayload {
  title: string
  description?: string
  status: string
  priority: string
  type: string
  assigned_to?: string
  department_id?: string
  project_id?: string
  start_date?: string
  due_date?: string
  estimated_hours?: number
  tags?: string[]
  created_by: string
  kanban_position: number
}

async function getSupabaseClient() {
  const cookieStore = await cookies()
  return createClient(cookieStore)
}

export async function fetchTasks(): Promise<{ data: AdminTask[] | null; error: string | null }> {
  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('admin_tasks')
      .select('*')
      .order('kanban_position', { ascending: true })

    if (error) return { data: null, error: error.message }
    return { data: data || [], error: null }
  } catch {
    return { data: null, error: 'Failed to fetch tasks' }
  }
}

export async function fetchDepartments(): Promise<{ data: Department[] | null; error: string | null }> {
  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('departments')
      .select('id, name')
      .order('name')

    if (error) return { data: null, error: error.message }
    return { data: data || [], error: null }
  } catch {
    return { data: null, error: 'Failed to fetch departments' }
  }
}

export async function fetchUsers(): Promise<{ data: User[] | null; error: string | null }> {
  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('profiles')
      .select('id, first_name, last_name')
      .order('first_name')

    if (error) return { data: null, error: error.message }
    return { data: data || [], error: null }
  } catch {
    return { data: null, error: 'Failed to fetch users' }
  }
}

export async function moveTask(
  taskId: string,
  newStatus: string,
  newPosition: number
): Promise<{ success: boolean; error: string | null }> {
  try {
    const supabase = await getSupabaseClient()
    const adminClient = createAdminClient()

    const { data: currentTask, error: fetchError } = await supabase
      .from('admin_tasks')
      .select('status, kanban_position, title, assigned_to')
      .eq('id', taskId)
      .single()

    if (fetchError || !currentTask) return { success: false, error: 'Task not found' }

    if (currentTask.status === newStatus) {
      const { data: columnTasks } = await supabase
        .from('admin_tasks')
        .select('id, kanban_position')
        .eq('status', newStatus)
        .order('kanban_position')

      if (columnTasks) {
        const currentIndex = columnTasks.findIndex(t => t.id === taskId)
        const targetTask = columnTasks.find(t => Math.abs(t.kanban_position - newPosition) < 0.1)

        if (targetTask && currentIndex !== -1) {
          const newIndex = columnTasks.findIndex(t => t.id === targetTask.id)
          if (currentIndex !== newIndex) {
            const updates: { id: string; position: number }[] = []
            if (currentIndex < newIndex) {
              for (let i = currentIndex + 1; i <= newIndex; i++) {
                updates.push({ id: columnTasks[i].id, position: columnTasks[i - 1].kanban_position })
              }
            } else {
              for (let i = newIndex; i < currentIndex; i++) {
                updates.push({ id: columnTasks[i].id, position: columnTasks[i + 1].kanban_position })
              }
            }
            for (const update of updates) {
              await supabase.from('admin_tasks').update({ kanban_position: update.position }).eq('id', update.id)
            }
          }
        }
      }
    }

    const { error } = await supabase
      .from('admin_tasks')
      .update({
        status: newStatus,
        kanban_position: newPosition,
        ...(newStatus === 'completed' && currentTask.status !== 'completed' && { completed_at: new Date().toISOString() }),
        ...(newStatus !== 'completed' && currentTask.status === 'completed' && { completed_at: null }),
      })
      .eq('id', taskId)

    if (error) return { success: false, error: error.message }

    // Send status update email if assignee exists and status actually changed
    if (currentTask.assigned_to && currentTask.status !== newStatus) {
      try {
        const { data: assignee } = await adminClient.from('profiles').select('email, first_name, last_name').eq('id', currentTask.assigned_to).single()
        if (assignee?.email) {
          const name = `${assignee.first_name || ''} ${assignee.last_name || ''}`.trim() || assignee.email
          const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
          await sendTaskAssignmentEmail({
            toEmail: assignee.email,
            toName: name,
            assignedBy: 'Admin',
            taskTitle: currentTask.title,
            priority: 'medium',
            dashboardUrl: `${appUrl}/admin?tab=assets`,
            taskDescription: `Your task status has been updated to: ${newStatus.replace('_', ' ')}`,
          })
        }
      } catch (emailErr) {
        console.error('Status update email failed (non-fatal):', emailErr)
      }
    }

    revalidateTag('admin-tasks')
    return { success: true, error: null }
  } catch {
    return { success: false, error: 'Failed to move task' }
  }
}

export async function saveTask(
  taskData: TaskPayload,
  taskId?: string
): Promise<{ success: boolean; error: string | null }> {
  try {
    const supabase = await getSupabaseClient()
    const adminClient = createAdminClient()

    let previousAssignee: string | null = null

    if (taskId) {
      // Fetch current assignee before update to detect change
      const { data: existing } = await adminClient
        .from('admin_tasks')
        .select('assigned_to')
        .eq('id', taskId)
        .single()
      previousAssignee = existing?.assigned_to || null

      const { error } = await supabase.from('admin_tasks').update(taskData).eq('id', taskId)
      if (error) return { success: false, error: error.message }
    } else {
      const { error } = await supabase.from('admin_tasks').insert([taskData])
      if (error) return { success: false, error: error.message }
    }

    // Send email if assigned_to changed or was set on creation
    const newAssignee = taskData.assigned_to || null
    const assigneeChanged = newAssignee && newAssignee !== previousAssignee

    if (assigneeChanged) {
      try {
        const { data: assigneeProfile } = await adminClient
          .from('profiles')
          .select('email, first_name, last_name')
          .eq('id', newAssignee)
          .single()

        const { data: creatorProfile } = await adminClient
          .from('profiles')
          .select('first_name, last_name')
          .eq('id', taskData.created_by)
          .single()

        let projectName: string | undefined
        if (taskData.project_id) {
          const { data: project } = await adminClient
            .from('projects')
            .select('name')
            .eq('id', taskData.project_id)
            .single()
          projectName = project?.name
        }

        if (assigneeProfile?.email) {
          const assigneeName = `${assigneeProfile.first_name || ''} ${assigneeProfile.last_name || ''}`.trim() || assigneeProfile.email
          const assignedBy = creatorProfile
            ? `${creatorProfile.first_name || ''} ${creatorProfile.last_name || ''}`.trim() || 'Admin'
            : 'Admin'
          const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

          await sendTaskAssignmentEmail({
            toEmail: assigneeProfile.email,
            toName: assigneeName,
            assignedBy,
            taskTitle: taskData.title,
            taskDescription: taskData.description,
            priority: taskData.priority,
            dueDate: taskData.due_date
              ? new Date(taskData.due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
              : undefined,
            projectName,
            dashboardUrl: `${appUrl}/admin?tab=assets`,
          })
        }
      } catch (emailErr) {
        console.error('Email notification failed (non-fatal):', emailErr)
      }
    }

    revalidateTag('admin-tasks')
    return { success: true, error: null }
  } catch {
    return { success: false, error: 'Failed to save task' }
  }
}

export async function deleteTask(taskId: string): Promise<{ success: boolean; error: string | null }> {
  try {
    const supabase = await getSupabaseClient()
    const { error } = await supabase.from('admin_tasks').delete().eq('id', taskId)
    if (error) return { success: false, error: error.message }
    revalidateTag('admin-tasks')
    return { success: true, error: null }
  } catch {
    return { success: false, error: 'Failed to delete task' }
  }
}
