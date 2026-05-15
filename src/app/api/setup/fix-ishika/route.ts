import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  const secret = 'anya-fix-2026'
  const admin = createAdminClient()

  try {
    // List users to find ishika
    const { data: { users }, error: listErr } = await admin.auth.admin.listUsers()
    if (listErr) return NextResponse.json({ ok: false, error: listErr.message })

    const ishika = users.find(u => u.email === 'ishika@anyasegen.com')

    if (!ishika) {
      // Create fresh
      const { data, error } = await admin.auth.admin.createUser({
        email: 'ishika@anyasegen.com',
        password: 'Ishika@Anya2024!',
        email_confirm: true,
        user_metadata: { first_name: 'Ishika', role: 'user' },
      })
      if (error) return NextResponse.json({ ok: false, step: 'create', error: error.message })

      // Link to profile
      await admin.from('profiles').update({ id: data.user.id }).eq('email', 'ishika@anyasegen.com')
      return NextResponse.json({ ok: true, action: 'created', userId: data.user.id })
    }

    // User exists — reset password and confirm email
    const { error: updateErr } = await admin.auth.admin.updateUserById(ishika.id, {
      password: 'Ishika@Anya2024!',
      email_confirm: true,
    })
    if (updateErr) return NextResponse.json({ ok: false, step: 'update', error: updateErr.message })

    return NextResponse.json({
      ok: true,
      action: 'reset',
      userId: ishika.id,
      email: ishika.email,
      emailConfirmed: ishika.email_confirmed_at,
    })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message })
  }
}
