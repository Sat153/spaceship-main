import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  const admin = createAdminClient()

  try {
    // Check existing auth account
    const { data: { users } } = await admin.auth.admin.listUsers({ perPage: 1000 })
    const existing = users.find(u => u.email === 'rupin@anyasegen.com')

    if (existing) {
      // Reset password
      await admin.auth.admin.updateUserById(existing.id, {
        password: 'RupinAnya2024',
        email_confirm: true,
      })
      // Ensure profile is linked
      await admin.from('profiles').update({ id: existing.id }).eq('email', 'rupin@anyasegen.com')
      return NextResponse.json({ ok: true, action: 'reset', userId: existing.id, password: 'RupinAnya2024' })
    }

    // Create auth account
    const { data, error } = await admin.auth.admin.createUser({
      email: 'rupin@anyasegen.com',
      password: 'RupinAnya2024',
      email_confirm: true,
    })
    if (error) return NextResponse.json({ ok: false, error: error.message })

    // Check if profile exists by email
    const { data: profile } = await admin.from('profiles').select('id').eq('email', 'rupin@anyasegen.com').single()

    if (profile) {
      await admin.from('profiles').update({ id: data.user.id }).eq('email', 'rupin@anyasegen.com')
    } else {
      // Get a department — default to Operations
      const { data: dept } = await admin.from('departments').select('id').limit(1).single()
      await admin.from('profiles').insert({
        id: data.user.id,
        email: 'rupin@anyasegen.com',
        first_name: 'Rupin',
        last_name: '',
        role: 'user',
        department_id: dept?.id ?? null,
      })
    }

    return NextResponse.json({ ok: true, action: 'created', userId: data.user.id, password: 'RupinAnya2024' })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message })
  }
}
