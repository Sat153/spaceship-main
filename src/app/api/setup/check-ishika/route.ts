import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  const admin = createAdminClient()
  const ISHIKA_AUTH_ID = 'deba5498-2066-4960-80d8-838e1109e58d'

  // Check share rows for Ishika (bypasses RLS)
  const { data: shares, error } = await admin
    .from('client_shares')
    .select('id, client_id, shared_with_user_id, shared_by_user_id, clients:client_id(name)')
    .eq('shared_with_user_id', ISHIKA_AUTH_ID)

  return NextResponse.json({ shares, error: error?.message })
}
