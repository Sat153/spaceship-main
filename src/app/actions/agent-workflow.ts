'use server'

import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export interface WorkflowAgent {
  id: string
  name: string
  type: 'parent' | 'sub'
  parent_id: string | null
  description: string | null
  icon: string | null
  color: string | null
  display_order: number
  sub_agents?: WorkflowAgent[]
  task_counts?: { urgent: number; pending: number; approved: number; total: number }
}

export interface AgentTask {
  id: string
  agent_id: string
  title: string
  description: string | null
  status: 'urgent' | 'pending' | 'approved'
  content_type: 'post' | 'reel' | 'vlog' | null
  photo_notes: string | null
  caption: string | null
  account_tag: string | null
  assigned_to: string | null
  due_date: string | null
  created_at: string
  updated_at: string
}

export async function getAgents(): Promise<{ data: WorkflowAgent[]; error: string | null }> {
  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    const { data: agents, error } = await supabase
      .from('workflow_agents')
      .select('*')
      .order('display_order')
    if (error) return { data: [], error: error.message }

    const { data: tasks } = await supabase
      .from('agent_tasks')
      .select('agent_id, status')

    const countMap: Record<string, { urgent: number; pending: number; approved: number; total: number }> = {}
    for (const t of tasks ?? []) {
      if (!countMap[t.agent_id]) countMap[t.agent_id] = { urgent: 0, pending: 0, approved: 0, total: 0 }
      countMap[t.agent_id][t.status as 'urgent' | 'pending' | 'approved']++
      countMap[t.agent_id].total++
    }

    const parents = (agents ?? []).filter(a => a.type === 'parent')
    const subs    = (agents ?? []).filter(a => a.type === 'sub')

    return {
      data: parents.map(p => ({
        ...p,
        task_counts: countMap[p.id] ?? { urgent: 0, pending: 0, approved: 0, total: 0 },
        sub_agents: subs
          .filter(s => s.parent_id === p.id)
          .map(s => ({ ...s, task_counts: countMap[s.id] ?? { urgent: 0, pending: 0, approved: 0, total: 0 } })),
      })),
      error: null,
    }
  } catch (e: any) {
    return { data: [], error: e.message }
  }
}

export async function getAgentTasks(agentId: string): Promise<{ data: AgentTask[]; error: string | null }> {
  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)
    const { data, error } = await supabase
      .from('agent_tasks')
      .select('*')
      .eq('agent_id', agentId)
      .order('created_at', { ascending: false })
    if (error) return { data: [], error: error.message }
    return { data: data ?? [], error: null }
  } catch (e: any) {
    return { data: [], error: e.message }
  }
}

export async function createAgentTask(input: {
  agent_id: string
  title: string
  description?: string
  status: 'urgent' | 'pending' | 'approved'
  content_type?: 'post' | 'reel' | 'vlog'
  photo_notes?: string
  caption?: string
  account_tag?: string
  due_date?: string
}): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createAdminClient()
    const { error } = await supabase.from('agent_tasks').insert({
      agent_id:     input.agent_id,
      title:        input.title,
      description:  input.description  || null,
      status:       input.status,
      content_type: input.content_type || null,
      photo_notes:  input.photo_notes  || null,
      caption:      input.caption      || null,
      account_tag:  input.account_tag  || null,
      due_date:     input.due_date     || null,
    })
    if (error) return { success: false, error: error.message }
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

export async function updateTaskStatus(
  taskId: string,
  status: 'urgent' | 'pending' | 'approved'
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createAdminClient()
    const { error } = await supabase
      .from('agent_tasks')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', taskId)
    if (error) return { success: false, error: error.message }
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

export async function deleteAgentTask(taskId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createAdminClient()
    const { error } = await supabase.from('agent_tasks').delete().eq('id', taskId)
    if (error) return { success: false, error: error.message }
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}
