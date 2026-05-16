import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  const admin = createAdminClient()
  const EMAIL = 'iqra@anyasegen.com'
  const PASSWORD = 'Iqra@2026'

  try {
    const { data: { users } } = await admin.auth.admin.listUsers({ perPage: 1000 })
    const existing = users.filter(u => u.email === EMAIL)

    if (existing.length === 0) {
      // No account — create fresh
      const { data, error } = await admin.auth.admin.createUser({
        email: EMAIL, password: PASSWORD, email_confirm: true
      })
      if (error) return NextResponse.json({ ok: false, step: 'create', error: error.message })

      const { data: dept } = await admin.from('departments').select('id').limit(1).single()
      await admin.from('profiles').insert({
        id: data.user.id, email: EMAIL, first_name: 'Iqra', last_name: '',
        role: 'user', department_id: dept?.id ?? null
      })
      return NextResponse.json({ ok: true, action: 'created', email: EMAIL, password: PASSWORD })
    }

    // Delete duplicates, keep first
    for (let i = 1; i < existing.length; i++) {
      await admin.auth.admin.deleteUser(existing[i].id)
    }
    const userId = existing[0].id

    // Reset password + confirm email
    const { error } = await admin.auth.admin.updateUserById(userId, {
      password: PASSWORD,
      email_confirm: true,
      ban_duration: 'none',
    })
    if (error) return NextResponse.json({ ok: false, step: 'update', error: error.message })

    // Check profile
    const { data: profile } = await admin.from('profiles').select('id, first_name, department_id').eq('id', userId).single()

    return NextResponse.json({
      ok: true,
      action: 'reset',
      userId,
      email: EMAIL,
      password: PASSWORD,
      emailConfirmed: true,
      profile: profile ?? 'missing',
    })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message })
  }
}
