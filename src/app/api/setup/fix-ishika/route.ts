import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  const admin = createAdminClient()

  try {
    const ISHIKA_AUTH_ID = 'deba5498-2066-4960-80d8-838e1109e58d'

    // Find Ganesh Joshi client
    const { data: clients, error: clientErr } = await admin
      .from('clients')
      .select('id, name')
      .ilike('name', '%ganesh%')

    if (clientErr) return NextResponse.json({ ok: false, step: 'find_client', error: clientErr.message })
    if (!clients || clients.length === 0) return NextResponse.json({ ok: false, error: 'No Ganesh client found' })

    const results = []
    for (const client of clients) {
      // Check if already shared
      const { data: existing } = await admin
        .from('client_shares')
        .select('id')
        .eq('client_id', client.id)
        .eq('user_id', ISHIKA_AUTH_ID)
        .single()

      if (existing) {
        results.push({ client: client.name, action: 'already_shared' })
        continue
      }

      const { error: shareErr } = await admin.from('client_shares').insert({
        client_id: client.id,
        user_id: ISHIKA_AUTH_ID,
      })
      results.push({ client: client.name, action: shareErr ? 'error' : 'shared', error: shareErr?.message })
    }

    return NextResponse.json({ ok: true, results })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message })
  }
}
