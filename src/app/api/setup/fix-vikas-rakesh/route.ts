import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

const USERS = [
  { email: 'vikas@anyasegen.com', password: 'Vikas@2026', name: 'Vikas' },
  { email: 'rakesh@anyasegen.com', password: 'Rakesh@2026', name: 'Rakesh' },
]

export async function GET() {
  const admin = createAdminClient()
  const results = []

  for (const u of USERS) {
    const { data: { users } } = await admin.auth.admin.listUsers({ perPage: 1000 })
    const existing = users.filter(x => x.email === u.email)

    if (existing.length === 0) {
      const { data, error } = await admin.auth.admin.createUser({
        email: u.email, password: u.password, email_confirm: true
      })
      if (error) { results.push({ email: u.email, ok: false, error: error.message }); continue }
      const { data: dept } = await admin.from('departments').select('id').limit(1).single()
      await admin.from('profiles').insert({
        id: data.user.id, email: u.email, first_name: u.name, last_name: '',
        role: 'user', department_id: dept?.id ?? null
      })
      results.push({ email: u.email, ok: true, action: 'created' })
      continue
    }

    const userId = existing[0].id
    const { error } = await admin.auth.admin.updateUserById(userId, {
      password: u.password, email_confirm: true, ban_duration: 'none'
    })
    results.push({ email: u.email, ok: !error, action: 'reset', error: error?.message })
  }

  return NextResponse.json({ ok: true, results })
}
