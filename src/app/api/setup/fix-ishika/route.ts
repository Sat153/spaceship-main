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

    // Check if profile already exists for this auth ID
    const { data: existing } = await admin
      .from('profiles')
      .select('id, first_name, last_name, department_id')
      .eq('id', ISHIKA_AUTH_ID)
      .single()

    if (existing) {
      return NextResponse.json({ ok: true, action: 'profile_already_exists', profile: existing })
    }

    // Check if there's an orphaned profile with her email (different ID)
    const { data: orphan } = await admin
      .from('profiles')
      .select('id, first_name, last_name, department_id')
      .eq('email', 'ishika@anyasegen.com')
      .single()

    if (orphan) {
      // Delete orphan and recreate with correct ID
      await admin.from('profiles').delete().eq('id', orphan.id)

      const { error: insertErr } = await admin.from('profiles').insert({
        id: ISHIKA_AUTH_ID,
        email: 'ishika@anyasegen.com',
        first_name: orphan.first_name || 'Ishika',
        last_name: orphan.last_name || '',
        role: 'user',
        department_id: orphan.department_id || dept.id,
        designation: 'Social Media Manager',
      })
      if (insertErr) return NextResponse.json({ ok: false, step: 'insert_from_orphan', error: insertErr.message })
      return NextResponse.json({ ok: true, action: 'recreated_from_orphan', newId: ISHIKA_AUTH_ID, dept: dept.name })
    }

    // No profile at all — create fresh
    const { error: insertErr } = await admin.from('profiles').insert({
      id: ISHIKA_AUTH_ID,
      email: 'ishika@anyasegen.com',
      first_name: 'Ishika',
      last_name: '',
      role: 'user',
      department_id: dept.id,
      designation: 'Social Media Manager',
    })
    if (insertErr) return NextResponse.json({ ok: false, step: 'insert_fresh', error: insertErr.message })
    return NextResponse.json({ ok: true, action: 'created_fresh', newId: ISHIKA_AUTH_ID, dept: dept.name })

  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message })
  }
}
