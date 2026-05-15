'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { GoogleGenerativeAI } from '@google/generative-ai'
import Groq from 'groq-sdk'

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || '')
const geminiModel = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' })
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || '' })

export interface WeeklyReport {
  id: string
  user_id: string
  week_start: string
  week_end: string
  report_text: string | null
  completed_count: number
  in_progress_count: number
  pending_count: number
  overdue_count: number
  tasks_data: any[]
  created_at: string
  updated_at: string
}

function getWeekRange(date = new Date()) {
  const day = date.getDay()
  const diffToMonday = (day === 0 ? -6 : 1 - day)
  const monday = new Date(date)
  monday.setDate(date.getDate() + diffToMonday)
  monday.setHours(0, 0, 0, 0)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  sunday.setHours(23, 59, 59, 999)
  return {
    start: monday.toISOString().split('T')[0],
    end: sunday.toISOString().split('T')[0],
  }
}

async function generateAIReport(
  employeeName: string,
  weekStart: string,
  weekEnd: string,
  tasks: any[]
): Promise<string> {
  const completed = tasks.filter(t => t.status === 'completed')
  const inProgress = tasks.filter(t => t.status === 'in_progress')
  const review = tasks.filter(t => t.status === 'review')
  const pending = tasks.filter(t => t.status === 'todo')
  const overdue = tasks.filter(t => t.status !== 'completed' && t.status !== 'cancelled' && t.due_date && new Date(t.due_date) < new Date())

  const prompt = `You are a professional HR and project management assistant for a political communications agency called ANYA SEGEN.

Generate a concise, professional weekly performance report for the following employee.

Employee: ${employeeName}
Week: ${weekStart} to ${weekEnd}

Task Summary:
- Completed (${completed.length}): ${completed.map(t => `"${t.title}"`).join(', ') || 'None'}
- In Review (${review.length}): ${review.map(t => `"${t.title}"`).join(', ') || 'None'}
- In Progress (${inProgress.length}): ${inProgress.map(t => `"${t.title}"`).join(', ') || 'None'}
- Pending/To Do (${pending.length}): ${pending.map(t => `"${t.title}"`).join(', ') || 'None'}
- Overdue (${overdue.length}): ${overdue.map(t => `"${t.title}"`).join(', ') || 'None'}

Write a 3-4 paragraph professional report covering:
1. Overall performance summary for the week
2. Key accomplishments (completed tasks)
3. Work in progress and next steps
4. Any concerns (overdue tasks, blockers)

Keep it professional, concise, and positive in tone. Write in third person.`

  try {
    const result = await geminiModel.generateContent(prompt)
    return result.response.text()
  } catch {
    try {
      const resp = await groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 600,
      })
      return resp.choices[0]?.message?.content || 'Report generation failed.'
    } catch {
      return 'Unable to generate AI report at this time. Please try again.'
    }
  }
}

export async function generateMyWeeklyReport(): Promise<{ success: boolean; report?: WeeklyReport; error?: string }> {
  try {
    const supabase = createClient(await cookies())
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return { success: false, error: 'Unauthorized' }

    const admin = createAdminClient()
    const { start, end } = getWeekRange()

    // Get employee name
    const { data: profile } = await admin.from('profiles').select('first_name, last_name').eq('id', user.id).single()
    const employeeName = profile ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() : 'Employee'

    // Get all tasks assigned to this user
    const { data: tasks } = await admin
      .from('admin_tasks')
      .select('id, title, status, priority, due_date, completed_at')
      .eq('assigned_to', user.id)

    const allTasks = tasks || []
    const now = new Date()

    const completed = allTasks.filter(t => t.status === 'completed').length
    const inProgress = allTasks.filter(t => t.status === 'in_progress').length
    const pending = allTasks.filter(t => t.status === 'todo').length
    const overdue = allTasks.filter(t =>
      t.status !== 'completed' && t.status !== 'cancelled' && t.due_date && new Date(t.due_date) < now
    ).length

    const reportText = await generateAIReport(employeeName, start, end, allTasks)

    // Upsert report
    const { data: report, error: upsertErr } = await admin
      .from('weekly_reports')
      .upsert({
        user_id: user.id,
        week_start: start,
        week_end: end,
        report_text: reportText,
        completed_count: completed,
        in_progress_count: inProgress,
        pending_count: pending,
        overdue_count: overdue,
        tasks_data: allTasks,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id,week_start' })
      .select()
      .single()

    if (upsertErr) return { success: false, error: upsertErr.message }
    return { success: true, report: report as WeeklyReport }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

export async function getMyWeeklyReports(): Promise<{ data: WeeklyReport[] }> {
  try {
    const supabase = createClient(await cookies())
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { data: [] }

    const admin = createAdminClient()
    const { data } = await admin
      .from('weekly_reports')
      .select('*')
      .eq('user_id', user.id)
      .order('week_start', { ascending: false })
      .limit(12)

    return { data: (data || []) as WeeklyReport[] }
  } catch {
    return { data: [] }
  }
}

// Admin: get all employees with their latest report
export async function getAllEmployeeReports(): Promise<{ data: any[] }> {
  try {
    const supabase = createClient(await cookies())
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { data: [] }

    const admin = createAdminClient()

    // Verify admin
    const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'admin') return { data: [] }

    const { data: employees } = await admin
      .from('profiles')
      .select('id, first_name, last_name, email')
      .eq('role', 'user')
      .order('first_name')

    if (!employees) return { data: [] }

    const results = await Promise.all(employees.map(async (emp) => {
      const { data: reports } = await admin
        .from('weekly_reports')
        .select('*')
        .eq('user_id', emp.id)
        .order('week_start', { ascending: false })
        .limit(12)

      return { employee: emp, reports: reports || [] }
    }))

    return { data: results }
  } catch {
    return { data: [] }
  }
}

export async function generateReportForEmployee(employeeId: string): Promise<{ success: boolean; report?: WeeklyReport; error?: string }> {
  try {
    const supabase = createClient(await cookies())
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Unauthorized' }

    const admin = createAdminClient()
    const { data: adminProfile } = await admin.from('profiles').select('role').eq('id', user.id).single()
    if (adminProfile?.role !== 'admin') return { success: false, error: 'Unauthorized' }

    const { start, end } = getWeekRange()

    const { data: profile } = await admin.from('profiles').select('first_name, last_name').eq('id', employeeId).single()
    const employeeName = profile ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() : 'Employee'

    const { data: tasks } = await admin
      .from('admin_tasks')
      .select('id, title, status, priority, due_date, completed_at')
      .eq('assigned_to', employeeId)

    const allTasks = tasks || []
    const now = new Date()

    const completed = allTasks.filter(t => t.status === 'completed').length
    const inProgress = allTasks.filter(t => t.status === 'in_progress').length
    const pending = allTasks.filter(t => t.status === 'todo').length
    const overdue = allTasks.filter(t =>
      t.status !== 'completed' && t.status !== 'cancelled' && t.due_date && new Date(t.due_date) < now
    ).length

    const reportText = await generateAIReport(employeeName, start, end, allTasks)

    const { data: report, error: upsertErr } = await admin
      .from('weekly_reports')
      .upsert({
        user_id: employeeId,
        week_start: start,
        week_end: end,
        report_text: reportText,
        completed_count: completed,
        in_progress_count: inProgress,
        pending_count: pending,
        overdue_count: overdue,
        tasks_data: allTasks,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id,week_start' })
      .select()
      .single()

    if (upsertErr) return { success: false, error: upsertErr.message }
    return { success: true, report: report as WeeklyReport }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}
