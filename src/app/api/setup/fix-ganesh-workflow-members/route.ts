import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  const admin = createAdminClient()

  // ── 1. Get all profiles by email ───────────────────────────────────────
  const emails = [
    'ishika@anyasegen.com',
    'iqra@anyasegen.com',
    'deepanshu@anyasegen.com',
    'vikas@anyasegen.com',
    'rakesh@anyasegen.com',
    'utkarsh@anyasegen.com',
    'robin@anyasegen.com',
    'rupin@anyasegen.com',
    'mohit@anyasegen.com',
    'satyam@anyasegen.com',
    'prashant@anyasegen.com',
  ]

  const { data: profiles } = await admin
    .from('profiles')
    .select('id, email, first_name, last_name')
    .in('email', emails)

  // Also find Akhilesh by name (email unknown)
  const { data: akhileshResults } = await admin
    .from('profiles')
    .select('id, email, first_name, last_name')
    .ilike('first_name', '%akhilesh%')

  const allProfiles = [...(profiles || []), ...(akhileshResults || [])]
  const byEmail: Record<string, string> = {}
  allProfiles.forEach((p: any) => { if (p.email) byEmail[p.email] = p.id })

  const id = (email: string) => byEmail[email]
  const akhileshId = akhileshResults?.[0]?.id ?? null

  // ── 2. Get Ganesh Joshi client ─────────────────────────────────────────
  const { data: client } = await admin
    .from('clients')
    .select('id')
    .ilike('name', '%ganesh joshi%')
    .single()

  if (!client) return NextResponse.json({ error: 'Ganesh Joshi client not found' })

  // ── 3. Get all stage rooms ─────────────────────────────────────────────
  const { data: rooms } = await admin
    .from('chat_rooms')
    .select('id, name, stage_id, workflow_stages(stage_order)')
    .eq('client_id', client.id)

  const roomByStage: Record<number, string> = {}
  ;(rooms || []).forEach((r: any) => {
    const order = r.workflow_stages?.stage_order
    if (order != null) roomByStage[order] = r.id
  })

  // ── 4. Define who goes in each stage ──────────────────────────────────
  const everyone = [
    id('ishika@anyasegen.com'),
    id('iqra@anyasegen.com'),
    id('deepanshu@anyasegen.com'),
    id('vikas@anyasegen.com'),
    id('rakesh@anyasegen.com'),
    id('utkarsh@anyasegen.com'),
    id('robin@anyasegen.com'),
    id('rupin@anyasegen.com'),
    id('mohit@anyasegen.com'),
    id('satyam@anyasegen.com'),
    id('prashant@anyasegen.com'),
  ].filter(Boolean)

  const stageMembers: Record<number, string[]> = {
    1: everyone,                                   // Raw Assets & PR — everyone
    2: everyone,                                   // Creative Production — everyone
    3: everyone,                                   // Internal Review — everyone
    4: [                                           // Final Approval
      id('prashant@anyasegen.com'),
      id('ishika@anyasegen.com'),
      id('iqra@anyasegen.com'),
      id('utkarsh@anyasegen.com'),
      id('satyam@anyasegen.com'),
      akhileshId,
    ].filter(Boolean) as string[],
    5: [                                           // Content Posting — only these 4
      id('utkarsh@anyasegen.com'),
      id('ishika@anyasegen.com'),
      id('prashant@anyasegen.com'),
      id('iqra@anyasegen.com'),
    ].filter(Boolean) as string[],
    6: [                                           // Posted Verification
      id('utkarsh@anyasegen.com'),
      id('prashant@anyasegen.com'),
      id('ishika@anyasegen.com'),
      id('iqra@anyasegen.com'),
      akhileshId,
    ].filter(Boolean) as string[],
  }

  // ── 5. Upsert members for each stage ──────────────────────────────────
  const log: any[] = []

  for (const [stageStr, userIds] of Object.entries(stageMembers)) {
    const stage = Number(stageStr)
    const roomId = roomByStage[stage]
    if (!roomId) { log.push({ stage, error: 'room not found' }); continue }

    // For stages 5 & 6 — remove members NOT in the target list first
    if (stage === 5 || stage === 6) {
      const { data: existing } = await admin
        .from('chat_room_members')
        .select('user_id')
        .eq('room_id', roomId)

      const toRemove = (existing || [])
        .map((m: any) => m.user_id)
        .filter((uid: string) => !userIds.includes(uid))

      if (toRemove.length > 0) {
        await admin
          .from('chat_room_members')
          .delete()
          .eq('room_id', roomId)
          .in('user_id', toRemove)
        log.push({ stage, removed: toRemove.length })
      }
    }

    // Upsert all target members
    const rows = userIds.map(uid => ({ room_id: roomId, user_id: uid }))
    const { error } = await admin
      .from('chat_room_members')
      .upsert(rows, { onConflict: 'room_id,user_id', ignoreDuplicates: true })

    log.push({ stage, added: userIds.length, error: error?.message ?? null })
  }

  return NextResponse.json({
    ok: true,
    akhilesh: akhileshResults?.[0] ?? 'not found in profiles',
    log,
  })
}
