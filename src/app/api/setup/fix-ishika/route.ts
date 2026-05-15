import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  const admin = createAdminClient()

  try {
    // Find ALL users with this email
    const { data: { users }, error: listErr } = await admin.auth.admin.listUsers({ perPage: 1000 })
    if (listErr) return NextResponse.json({ ok: false, error: listErr.message })

    const ishikaUsers = users.filter(u => u.email === 'ishika@anyasegen.com')

    if (ishikaUsers.length === 0) {
      // No user at all — create fresh
      const { data, error } = await admin.auth.admin.createUser({
        email: 'ishika@anyasegen.com',
        password: 'IshikaAnya2024',
        email_confirm: true,
      })
      if (error) return NextResponse.json({ ok: false, step: 'create', error: error.message })
      await admin.from('profiles').update({ id: data.user.id }).eq('email', 'ishika@anyasegen.com')
      return NextResponse.json({ ok: true, action: 'created_fresh', userId: data.user.id, password: 'IshikaAnya2024' })
    }

    // Delete all existing ishika accounts and recreate clean
    for (const u of ishikaUsers) {
      await admin.auth.admin.deleteUser(u.id)
    }

    // Recreate with a clean simple password
    const { data: newUser, error: createErr } = await admin.auth.admin.createUser({
      email: 'ishika@anyasegen.com',
      password: 'IshikaAnya2024',
      email_confirm: true,
    })
    if (createErr) return NextResponse.json({ ok: false, step: 'recreate', error: createErr.message })

    // Re-link profile
    const { error: profileErr } = await admin.from('profiles')
      .update({ id: newUser.user.id })
      .eq('email', 'ishika@anyasegen.com')

    return NextResponse.json({
      ok: true,
      action: 'deleted_and_recreated',
      deletedCount: ishikaUsers.length,
      newUserId: newUser.user.id,
      password: 'IshikaAnya2024',
      profileUpdateError: profileErr?.message ?? null,
    })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message })
  }
}
