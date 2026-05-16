import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  const admin = createAdminClient()

  const { data: profiles } = await admin
    .from('profiles')
    .select('id, email')
    .in('email', ['vikas@anyasegen.com', 'rakesh@anyasegen.com'])

  if (!profiles || profiles.length === 0) {
    return NextResponse.json({ error: 'Vikas/Rakesh profiles not found' })
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

  const rows = profiles.map((p: any) => ({ room_id: room.id, user_id: p.id }))
  const { error } = await admin
    .from('chat_room_members')
    .upsert(rows, { onConflict: 'room_id,user_id', ignoreDuplicates: true })

  return NextResponse.json({
    ok: !error,
    room: room.name,
    added: profiles.map((p: any) => p.email),
    error: error?.message ?? null,
  })
}
