import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  const admin = createAdminClient()

  const { data: { users } } = await admin.auth.admin.listUsers({ perPage: 1000 })
  const targets = users.filter(u =>
    u.email === 'vikas@anyasegen.com' || u.email === 'rakesh@anyasegen.com'
  )
  if (targets.length === 0) return NextResponse.json({ error: 'Vikas/Rakesh not found' })

  const { data: client } = await admin
    .from('clients').select('id').ilike('name', '%ganesh joshi%').single()
  if (!client) return NextResponse.json({ error: 'Ganesh Joshi client not found' })

  const { data: stages } = await admin
    .from('workflow_stages').select('id, stage_order').in('stage_order', [2, 3])
  if (!stages || stages.length === 0) return NextResponse.json({ error: 'Stages not found' })

  const { data: rooms } = await admin
    .from('chat_rooms').select('id, stage_id')
    .eq('client_id', client.id)
    .in('stage_id', stages.map((s: any) => s.id))

  if (!rooms || rooms.length === 0) return NextResponse.json({ error: 'Stage rooms not found' })

  const roomIds = rooms.map((r: any) => r.id)
  const userIds = targets.map(u => u.id)

  const { error } = await admin
    .from('chat_room_members')
    .delete()
    .in('room_id', roomIds)
    .in('user_id', userIds)

  return NextResponse.json({
    ok: !error,
    removed: targets.map(u => u.email),
    fromStages: [2, 3],
    error: error?.message ?? null,
  })
}
