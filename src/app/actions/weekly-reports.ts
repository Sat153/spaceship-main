'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { GoogleGenerativeAI } from '@google/generative-ai'
import Groq from 'groq-sdk'

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || '')
const geminiModel = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' })
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || '' })

export type FilterRange = 'this_week' | 'last_week' | 'this_month' | 'last_month'

export interface TaskAttachment {
  id: string
  file_name: string
  file_url: string
  mime_type: string
}

export interface CompletedTask {
  id: string
  title: string
  description: string | null
  type: string | null
  tags: string[]
  completed_at: string
  department_name: string | null
  attachments: TaskAttachment[]
}

export interface DayActivity {
  date: string
  day_name: string
  tasks: CompletedTask[]
}

export interface WeeklyReportData {
  range_start: string
  range_end: string
  range_label: string
  days: DayActivity[]
  total_tasks: number
  report_text: string | null
  report_generated_at: string | null
}

export interface EmployeeSummary {
  user_id: string
  first_name: string
  last_name: string
  email: string
  total_tasks: number
  department_name: string | null
}

export async function getDateRange(filter: FilterRange): Promise<{ start: string; end: string }> {
  const now = new Date()
  const day = now.getDay()
  const diffToMonday = day === 0 ? -6 : 1 - day

  if (filter === 'this_week') {
    const monday = new Date(now)
    monday.setDate(now.getDate() + diffToMonday)
    monday.setHours(0, 0, 0, 0)
    const sunday = new Date(monday)
    sunday.setDate(monday.getDate() + 6)
    sunday.setHours(23, 59, 59, 999)
    return { start: monday.toISOString(), end: sunday.toISOString() }
  }

  if (filter === 'last_week') {
    const thisMonday = new Date(now)
    thisMonday.setDate(now.getDate() + diffToMonday)
    const lastMonday = new Date(thisMonday)
    lastMonday.setDate(thisMonday.getDate() - 7)
    lastMonday.setHours(0, 0, 0, 0)
    const lastSunday = new Date(lastMonday)
    lastSunday.setDate(lastMonday.getDate() + 6)
    lastSunday.setHours(23, 59, 59, 999)
    return { start: lastMonday.toISOString(), end: lastSunday.toISOString() }
  }

  if (filter === 'this_month') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0)
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
    return { start: start.toISOString(), end: end.toISOString() }
  }

  // last_month
  const start = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0)
  const end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999)
  return { start: start.toISOString(), end: end.toISOString() }
}

function formatRangeLabel(filter: FilterRange) {
  const now = new Date()
  if (filter === 'this_week') return 'This Week'
  if (filter === 'last_week') return 'Last Week'
  if (filter === 'this_month') return now.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
  const last = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  return last.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
}

async function fetchTasksInRange(userId: string, start: string, end: string): Promise<CompletedTask[]> {
  const admin = createAdminClient()

  // Fetch all completed tasks for this user — we'll filter by due_date (primary) or completed_at (fallback)
  const { data: tasks } = await admin
    .from('admin_tasks')
    .select('id, title, description, type, tags, completed_at, due_date, department_id')
    .eq('assigned_to', userId)
    .eq('status', 'completed')
    .order('completed_at', { ascending: true })

  if (!tasks || tasks.length === 0) return []

  // Use due_date as the bucket date; fall back to completed_at if due_date is missing
  const filtered = tasks.filter((t: any) => {
    const bucketDate = t.due_date || t.completed_at
    if (!bucketDate) return false
    return bucketDate >= start && bucketDate <= end
  })

  // Dept names
  const deptIds = Array.from(new Set(filtered.map((t: any) => t.department_id).filter(Boolean))) as string[]
  const deptMap: Record<string, string> = {}
  if (deptIds.length > 0) {
    const { data: depts } = await admin.from('departments').select('id, name').in('id', deptIds)
    depts?.forEach((d: any) => { deptMap[d.id] = d.name })
  }

  // Attachments
  const taskIds = filtered.map((t: any) => t.id)
  const { data: attachments } = await admin
    .from('admin_task_attachments')
    .select('id, task_id, file_name, file_url, mime_type')
    .in('task_id', taskIds)

  const attachMap: Record<string, TaskAttachment[]> = {}
  attachments?.forEach((a: any) => {
    if (!attachMap[a.task_id]) attachMap[a.task_id] = []
    attachMap[a.task_id].push({ id: a.id, file_name: a.file_name, file_url: a.file_url, mime_type: a.mime_type })
  })

  return filtered.map((t: any): CompletedTask => ({
    id: t.id,
    title: t.title,
    description: t.description,
    type: t.type,
    tags: t.tags || [],
    completed_at: t.completed_at,
    department_name: t.department_id ? (deptMap[t.department_id] || null) : null,
    attachments: attachMap[t.id] || [],
  }))
}

function groupByDay(tasks: CompletedTask[]): DayActivity[] {
  const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const byDate: Record<string, CompletedTask[]> = {}
  tasks.forEach(t => {
    const bucketDate = (t as any).due_date || t.completed_at
    const date = new Date(bucketDate).toISOString().split('T')[0]
    if (!byDate[date]) byDate[date] = []
    byDate[date].push(t)
  })
  return Object.entries(byDate)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, dayTasks]) => ({
      date,
      day_name: DAY_NAMES[new Date(date + 'T12:00:00Z').getDay()],
      tasks: dayTasks,
    }))
}

async function buildAIReport(employeeName: string, days: DayActivity[]): Promise<string> {
  if (days.length === 0) return `${employeeName} had no completed tasks in this period.`

  const dayText = days.map(d =>
    `${d.day_name} (${d.date}):\n${d.tasks.map(t => `  - "${t.title}"${t.type ? ` [${t.type}]` : ''}`).join('\n')}`
  ).join('\n\n')

  const prompt = `You are an HR assistant for ANYA SEGEN, a political communications agency.

Generate a professional weekly performance report for ${employeeName}.

Day-wise completed work:
${dayText}

Total completed: ${days.reduce((s, d) => s + d.tasks.length, 0)} tasks

Write 3-4 paragraphs: overall summary, key accomplishments, productivity patterns, forward note. Professional, third-person, concise.`

  try {
    const result = await geminiModel.generateContent(prompt)
    return result.response.text()
  } catch {
    try {
      const resp = await groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 500,
      })
      return resp.choices[0]?.message?.content || 'Report generation failed.'
    } catch {
      return 'Unable to generate AI report at this time.'
    }
  }
}

// ─── Employee actions ───────────────────────────────────────────────────────

export async function getMyWeeklyReport(filter: FilterRange = 'this_week'): Promise<WeeklyReportData> {
  const supabase = createClient(await cookies())
  const { data: { user } } = await supabase.auth.getUser()
  const empty: WeeklyReportData = { range_start: '', range_end: '', range_label: '', days: [], total_tasks: 0, report_text: null, report_generated_at: null }
  if (!user) return empty

  const { start, end } = await getDateRange(filter)
  const tasks = await fetchTasksInRange(user.id, start, end)
  const days = groupByDay(tasks)

  // Load cached AI text (only for week-based filters)
  let report_text: string | null = null
  let report_generated_at: string | null = null
  if (filter === 'this_week' || filter === 'last_week') {
    const admin = createAdminClient()
    const weekStart = start.split('T')[0]
    const { data: cached } = await admin.from('weekly_reports').select('report_text, updated_at').eq('user_id', user.id).eq('week_start', weekStart).maybeSingle()
    report_text = cached?.report_text || null
    report_generated_at = cached?.updated_at || null
  }

  return { range_start: start.split('T')[0], range_end: end.split('T')[0], range_label: formatRangeLabel(filter), days, total_tasks: tasks.length, report_text, report_generated_at }
}

export async function generateMyAIReport(filter: FilterRange = 'this_week'): Promise<{ success: boolean; report_text?: string; error?: string }> {
  const supabase = createClient(await cookies())
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { success: false, error: 'Unauthorized' }

  const admin = createAdminClient()
  const { data: profile } = await admin.from('profiles').select('first_name, last_name').eq('id', user.id).single()
  const employeeName = profile ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() : 'Employee'

  const { start, end } = await getDateRange(filter)
  const tasks = await fetchTasksInRange(user.id, start, end)
  const days = groupByDay(tasks)
  const reportText = await buildAIReport(employeeName, days)

  if (filter === 'this_week' || filter === 'last_week') {
    const weekStart = start.split('T')[0]
    const weekEnd = end.split('T')[0]
    const [inProg, pend, over] = await Promise.all([
      admin.from('admin_tasks').select('id', { count: 'exact', head: true }).eq('assigned_to', user.id).eq('status', 'in_progress'),
      admin.from('admin_tasks').select('id', { count: 'exact', head: true }).eq('assigned_to', user.id).eq('status', 'todo'),
      admin.from('admin_tasks').select('id', { count: 'exact', head: true }).eq('assigned_to', user.id).neq('status', 'completed').neq('status', 'cancelled').lt('due_date', new Date().toISOString()),
    ])
    await admin.from('weekly_reports').upsert({
      user_id: user.id, week_start: weekStart, week_end: weekEnd,
      report_text: reportText, completed_count: tasks.length,
      in_progress_count: inProg.count || 0, pending_count: pend.count || 0, overdue_count: over.count || 0,
      tasks_data: tasks, updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,week_start' })
  }

  return { success: true, report_text: reportText }
}

// ─── Admin actions ───────────────────────────────────────────────────────────

export async function getEmployeeWeeklyReport(employeeId: string, filter: FilterRange = 'this_week'): Promise<WeeklyReportData> {
  const empty: WeeklyReportData = { range_start: '', range_end: '', range_label: '', days: [], total_tasks: 0, report_text: null, report_generated_at: null }
  const supabase = createClient(await cookies())
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return empty

  const admin = createAdminClient()
  const { data: adminProfile } = await admin.from('profiles').select('role').eq('id', user.id).single()
  if (adminProfile?.role !== 'admin') return empty

  const { start, end } = await getDateRange(filter)
  const tasks = await fetchTasksInRange(employeeId, start, end)
  const days = groupByDay(tasks)

  let report_text: string | null = null
  let report_generated_at: string | null = null
  if (filter === 'this_week' || filter === 'last_week') {
    const weekStart = start.split('T')[0]
    const { data: cached } = await admin.from('weekly_reports').select('report_text, updated_at').eq('user_id', employeeId).eq('week_start', weekStart).maybeSingle()
    report_text = cached?.report_text || null
    report_generated_at = cached?.updated_at || null
  }

  return { range_start: start.split('T')[0], range_end: end.split('T')[0], range_label: formatRangeLabel(filter), days, total_tasks: tasks.length, report_text, report_generated_at }
}

export async function generateAdminReport(employeeId: string, filter: FilterRange = 'this_week'): Promise<{ success: boolean; report_text?: string; error?: string }> {
  const supabase = createClient(await cookies())
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Unauthorized' }

  const admin = createAdminClient()
  const { data: adminProfile } = await admin.from('profiles').select('role').eq('id', user.id).single()
  if (adminProfile?.role !== 'admin') return { success: false, error: 'Unauthorized' }

  const { data: profile } = await admin.from('profiles').select('first_name, last_name').eq('id', employeeId).single()
  const employeeName = profile ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() : 'Employee'

  const { start, end } = await getDateRange(filter)
  const tasks = await fetchTasksInRange(employeeId, start, end)
  const days = groupByDay(tasks)
  const reportText = await buildAIReport(employeeName, days)

  if (filter === 'this_week' || filter === 'last_week') {
    const weekStart = start.split('T')[0]
    const weekEnd = end.split('T')[0]
    const [inProg, pend, over] = await Promise.all([
      admin.from('admin_tasks').select('id', { count: 'exact', head: true }).eq('assigned_to', employeeId).eq('status', 'in_progress'),
      admin.from('admin_tasks').select('id', { count: 'exact', head: true }).eq('assigned_to', employeeId).eq('status', 'todo'),
      admin.from('admin_tasks').select('id', { count: 'exact', head: true }).eq('assigned_to', employeeId).neq('status', 'completed').neq('status', 'cancelled').lt('due_date', new Date().toISOString()),
    ])
    await admin.from('weekly_reports').upsert({
      user_id: employeeId, week_start: weekStart, week_end: weekEnd,
      report_text: reportText, completed_count: tasks.length,
      in_progress_count: inProg.count || 0, pending_count: pend.count || 0, overdue_count: over.count || 0,
      tasks_data: tasks, updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,week_start' })
  }

  return { success: true, report_text: reportText }
}

export async function getAllEmployeesSummary(filter: FilterRange = 'this_week'): Promise<{ employees: EmployeeSummary[] }> {
  const supabase = createClient(await cookies())
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { employees: [] }

  const admin = createAdminClient()
  const { data: adminProfile } = await admin.from('profiles').select('role').eq('id', user.id).single()
  if (adminProfile?.role !== 'admin') return { employees: [] }

  const { start, end } = await getDateRange(filter)
  const { data: employees } = await admin.from('profiles').select('id, first_name, last_name, email, department_id').eq('role', 'user').order('first_name')
  if (!employees) return { employees: [] }

  const deptIds = Array.from(new Set(employees.map((e: any) => e.department_id).filter(Boolean))) as string[]
  const deptMap: Record<string, string> = {}
  if (deptIds.length > 0) {
    const { data: depts } = await admin.from('departments').select('id, name').in('id', deptIds)
    depts?.forEach((d: any) => { deptMap[d.id] = d.name })
  }

  const summaries = await Promise.all(employees.map(async (emp: any) => {
    // Count by due_date (primary) — tasks belong to the week they were due
    const { data: empTasks } = await admin.from('admin_tasks').select('id, due_date, completed_at').eq('assigned_to', emp.id).eq('status', 'completed')
    const count = (empTasks || []).filter((t: any) => {
      const d = t.due_date || t.completed_at
      return d && d >= start && d <= end
    }).length
    return { user_id: emp.id, first_name: emp.first_name || '', last_name: emp.last_name || '', email: emp.email, total_tasks: count || 0, department_name: emp.department_id ? (deptMap[emp.department_id] || null) : null }
  }))

  return { employees: summaries.sort((a, b) => b.total_tasks - a.total_tasks) }
}
