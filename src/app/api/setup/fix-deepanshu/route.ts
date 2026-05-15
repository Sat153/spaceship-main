import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  const admin = createAdminClient()
  const EMAIL = 'deepanshu@anyasegen.com'
  const PASSWORD = 'DeepanshuAnya2024'

  try {
    const { data: { users } } = await admin.auth.admin.listUsers({ perPage: 1000 })
    const existing = users.find(u => u.email === EMAIL)

    if (existing) {
      await admin.auth.admin.updateUserById(existing.id, { password: PASSWORD, email_confirm: true })
      await admin.from('profiles').update({ id: existing.id }).eq('email', EMAIL)
      return NextResponse.json({ ok: true, action: 'reset', userId: existing.id, password: PASSWORD })
    }

    const { data, error } = await admin.auth.admin.createUser({ email: EMAIL, password: PASSWORD, email_confirm: true })
    if (error) return NextResponse.json({ ok: false, error: error.message })

    const { data: profile } = await admin.from('profiles').select('id').eq('email', EMAIL).single()
    if (profile) {
      await admin.from('profiles').update({ id: data.user.id }).eq('email', EMAIL)
    } else {
      const { data: dept } = await admin.from('departments').select('id').limit(1).single()
      await admin.from('profiles').insert({ id: data.user.id, email: EMAIL, first_name: 'Deepanshu', last_name: '', role: 'user', department_id: dept?.id ?? null })
    }

    return NextResponse.json({ ok: true, action: 'created', userId: data.user.id, password: PASSWORD })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message })
  }
}
