import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  const admin = createAdminClient()

  // Look up user IDs via auth (guaranteed to have email)
  const { data: { users } } = await admin.auth.admin.listUsers({ perPage: 1000 })
  const targets = users.filter(u =>
    u.email === 'vikas@anyasegen.com' || u.email === 'rakesh@anyasegen.com'
  )

  if (targets.length === 0) {
    return NextResponse.json({ error: 'Vikas/Rakesh auth users not found' })
  }

  const { data: client } = await admin
    .from('clients')
    .select('id')
    .ilike('name', '%ganesh joshi%')
    .single()

  if (!client) return NextResponse.json({ error: 'Ganesh Joshi client not found' })

  const { data: stage1 } = await admin
    .from('workflow_stages')
    .select('id')
    .eq('stage_order', 1)
    .single()

  if (!stage1) return NextResponse.json({ error: 'Stage 1 not found' })

  const { data: room } = await admin
    .from('chat_rooms')
    .select('id, name')
    .eq('client_id', client.id)
    .eq('stage_id', stage1.id)
    .single()

  if (!room) return NextResponse.json({ error: 'Stage 1 room not found for Ganesh Joshi' })

  const rows = targets.map(u => ({ room_id: room.id, user_id: u.id }))
  const { error } = await admin
    .from('chat_room_members')
    .upsert(rows, { onConflict: 'room_id,user_id', ignoreDuplicates: true })

  return NextResponse.json({
    ok: !error,
    room: room.name,
    added: targets.map(u => u.email),
    error: error?.message ?? null,
  })
}
