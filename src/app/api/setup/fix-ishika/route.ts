import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  const admin = createAdminClient()

  try {
    const ISHIKA_AUTH_ID = 'deba5498-2066-4960-80d8-838e1109e58d'

    // Get PR & Social Media department ID
    const { data: dept, error: deptErr } = await admin
      .from('departments')
      .select('id, name')
      .eq('name', 'PR & Social Media')
      .single()

    if (deptErr || !dept) {
      return NextResponse.json({ ok: false, step: 'dept', error: deptErr?.message })
    }

    // Update the profile with correct data
    const { error: updateErr } = await admin
      .from('profiles')
      .update({
        first_name: 'Ishika',
        last_name: '',
        role: 'user',
        department_id: dept.id,
        designation: 'Social Media Manager',
        email: 'ishika@anyasegen.com',
      })
      .eq('id', ISHIKA_AUTH_ID)

    if (updateErr) return NextResponse.json({ ok: false, step: 'update', error: updateErr.message })

    return NextResponse.json({ ok: true, action: 'profile_updated', dept: dept.name, deptId: dept.id })

  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message })
  }
}
