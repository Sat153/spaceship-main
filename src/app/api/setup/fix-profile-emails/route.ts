import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  const admin = createAdminClient()

  const { data: { users } } = await admin.auth.admin.listUsers({ perPage: 1000 })

  const updates = []
  for (const u of users) {
    if (!u.email) continue
    const { error } = await admin
      .from('profiles')
      .update({ email: u.email })
      .eq('id', u.id)
      .is('email', null)
    if (!error) updates.push(u.email)
  }

  return NextResponse.json({ ok: true, updated: updates })
}
