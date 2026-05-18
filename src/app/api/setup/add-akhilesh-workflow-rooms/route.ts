import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

const AKHILESH_EMAIL = 'satyamkr2806@gmail.com'
// Stages Akhilesh needs: 01 Raw Assets & PR, 04 Final Approval, 05 Content Posting, 06 Posted Verification
const STAGE_ORDERS = [1, 4, 5, 6]

export async function GET() {
  const admin = createAdminClient()

  const { data: { users } } = await admin.auth.admin.listUsers({ perPage: 1000 })
  const akhilesh = users.find(u => u.email?.toLowerCase() === AKHILESH_EMAIL)
  if (!akhilesh) return NextResponse.json({ error: 'Akhilesh user not found' })

  const { data: client } = await admin
    .from('clients').select('id, name').ilike('name', '%ganesh joshi%').single()
  if (!client) return NextResponse.json({ error: 'Ganesh Joshi client not found' })

  const { data: stages } = await admin
    .from('workflow_stages').select('id, stage_order, name').in('stage_order', STAGE_ORDERS)
  if (!stages || stages.length === 0) return NextResponse.json({ error: 'Workflow stages not found' })

  const { data: rooms } = await admin
    .from('chat_rooms').select('id, name, stage_id')
    .eq('client_id', client.id)
    .in('stage_id', stages.map(s => s.id))
  if (!rooms || rooms.length === 0) return NextResponse.json({ error: 'No chat rooms found for these stages' })

  const rows = rooms.map(r => ({ room_id: r.id, user_id: akhilesh.id }))
  const { error } = await admin
    .from('chat_room_members')
    .upsert(rows, { onConflict: 'room_id,user_id', ignoreDuplicates: true })

  return NextResponse.json({
    ok: !error,
    client: client.name,
    rooms_added: rooms.map(r => r.name),
    error: error?.message ?? null,
  })
}
