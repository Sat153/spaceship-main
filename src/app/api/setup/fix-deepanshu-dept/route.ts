import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  const admin = createAdminClient()

  // Find Creative Lab department
  const { data: dept, error: deptErr } = await admin
    .from('departments')
    .select('id, name')
    .ilike('name', '%creative%')
    .single()

  if (deptErr || !dept) {
    return NextResponse.json({ ok: false, error: 'Creative Lab department not found', deptErr })
  }

  // Update Deepanshu's profile
  const { data, error } = await admin
    .from('profiles')
    .update({ department_id: dept.id, first_name: 'Deepanshu' })
    .eq('email', 'deepanshu@anyasegen.com')
    .select('id, first_name, department_id')
    .single()

  if (error) return NextResponse.json({ ok: false, error: error.message })

  return NextResponse.json({ ok: true, profile: data, department: dept.name })
}
