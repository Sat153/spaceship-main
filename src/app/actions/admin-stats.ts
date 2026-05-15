'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

export interface AdminStats {
  total_members: number
  total_documents: number
  total_departments: number
  content_this_month: number
  tasks_completed: number
  tasks_total: number
  content_pipeline: { draft: number; internal_review: number; pending_review: number; approved: number; scheduled: number; rejected: number }
  recent_activity: { dot: string; text: string; time: string }[]
  content_alerts: { pending: number; scheduled: { id: string; title: string; scheduled_for: string }[] }
}

export async function getAdminStats(): Promise<AdminStats> {
  const supabase = createClient(await cookies())
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const admin = createAdminClient()
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0).toISOString()
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).toISOString()

  const [membersResult, documentsResult, departmentsResult, postsResult, tasksResult, scheduledResult] = await Promise.all([
    admin.from('profiles').select('id', { count: 'exact', head: true }),
    admin.from('documents').select('id', { count: 'exact', head: true }),
    admin.from('departments').select('id', { count: 'exact', head: true }),
    admin.from('content_posts').select('id, status, created_at, updated_at, title').gte('created_at', startOfMonth),
    admin.from('admin_tasks').select('id, status, title, updated_at'),
    admin.from('content_posts').select('id, title, scheduled_for').eq('is_scheduled', true).gte('scheduled_for', startOfDay).lte('scheduled_for', endOfDay).limit(5),
  ])

  const posts = postsResult.data || []
  const tasks = tasksResult.data || []

  const pipeline = { draft: 0, internal_review: 0, pending_review: 0, approved: 0, scheduled: 0, rejected: 0 }
  posts.forEach((p: any) => { if (p.status in pipeline) (pipeline as any)[p.status]++ })

  const relTime = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'just now'
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    return `${Math.floor(hrs / 24)}d ago`
  }

  const statusDot: Record<string, string> = {
    draft: '#6b7280', internal_review: '#60a5fa', pending_review: '#f59e0b',
    approved: '#34d399', scheduled: '#a78bfa', rejected: '#f87171',
  }

  type ActivityItem = { dot: string; text: string; time: string; ts: number }
  const activityItems: ActivityItem[] = []

  posts.slice(0, 5).forEach((p: any) => {
    activityItems.push({
      dot: statusDot[p.status] || '#60a5fa',
      text: `Content "${p.title || 'Untitled'}" → ${p.status.replace('_', ' ')}`,
      time: relTime(p.updated_at || p.created_at),
      ts: new Date(p.updated_at || p.created_at).getTime(),
    })
  })

  tasks.slice(0, 4).forEach((t: any) => {
    activityItems.push({
      dot: t.status === 'completed' ? '#34d399' : t.status === 'in_progress' ? '#60a5fa' : '#6b7280',
      text: `Task "${t.title || 'Untitled'}" is ${(t.status as string).replace('_', ' ')}`,
      time: relTime(t.updated_at),
      ts: new Date(t.updated_at).getTime(),
    })
  })

  activityItems.sort((a, b) => b.ts - a.ts)

  return {
    total_members: membersResult.count || 0,
    total_documents: documentsResult.count || 0,
    total_departments: departmentsResult.count || 0,
    content_this_month: posts.length,
    tasks_completed: tasks.filter((t: any) => t.status === 'completed').length,
    tasks_total: tasks.length,
    content_pipeline: pipeline,
    recent_activity: activityItems.slice(0, 8).map(({ dot, text, time }) => ({ dot, text, time })),
    content_alerts: {
      pending: posts.filter((p: any) => p.status === 'internal_review').length,
      scheduled: scheduledResult.data || [],
    },
  }
}
