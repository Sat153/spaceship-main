import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  const admin = createAdminClient()

  const { data: client } = await admin
    .from('clients')
    .select('id, name')
    .ilike('name', '%ganesh joshi%')
    .single()

  if (!client) return NextResponse.json({ error: 'Ganesh Joshi client not found' })

  const { data: rooms } = await admin
    .from('chat_rooms')
    .select('id, name, stage_id, workflow_stages(stage_order, name)')
    .eq('client_id', client.id)
    .order('created_at')

  const result = []

  for (const room of rooms || []) {
    const { data: members } = await admin
      .from('chat_room_members')
      .select('user_id, profiles(first_name, last_name, email, role)')
      .eq('room_id', room.id)

    result.push({
      stage: (room.workflow_stages as any)?.stage_order + ' — ' + (room.name || (room.workflow_stages as any)?.name),
      members: (members || []).map((m: any) => ({
        name: `${m.profiles?.first_name || ''} ${m.profiles?.last_name || ''}`.trim() || m.user_id,
        email: m.profiles?.email,
        role: m.profiles?.role,
      }))
    })
  }

  return NextResponse.json({ client: client.name, stages: result })
}
