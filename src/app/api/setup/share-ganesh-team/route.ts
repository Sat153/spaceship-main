import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  const admin = createAdminClient()

  const { data: { users } } = await admin.auth.admin.listUsers({ perPage: 1000 })
  const targets = users.filter(u =>
    ['deepanshu@anyasegen.com', 'ishika@anyasegen.com'].includes(u.email ?? '')
  )
  if (targets.length === 0) return NextResponse.json({ error: 'Users not found' })

  const { data: adminProfile } = await admin
    .from('profiles').select('id').eq('role', 'admin').limit(1).single()

  const { data: client } = await admin
    .from('clients').select('id, name').ilike('name', '%ganesh joshi%').single()
  if (!client) return NextResponse.json({ error: 'Ganesh Joshi client not found' })

  const rows = targets.map(u => ({
    client_id: client.id,
    shared_with_user_id: u.id,
    shared_by_user_id: adminProfile?.id ?? u.id,
  }))

  const { error } = await admin
    .from('client_shares')
    .upsert(rows, { onConflict: 'client_id,shared_with_user_id', ignoreDuplicates: true })

  return NextResponse.json({
    ok: !error,
    client: client.name,
    sharedWith: targets.map(u => u.email),
    error: error?.message ?? null,
  })
}
