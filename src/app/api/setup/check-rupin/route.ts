import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  const admin = createAdminClient()
  const RUPIN_AUTH_ID = 'fe9f9594-fa5e-48c0-ac34-9fad29459cdb'

  const [{ data: profile }, { data: tasks }] = await Promise.all([
    admin.from('profiles').select('id, first_name, email').eq('email', 'rupin@anyasegen.com').single(),
    admin.from('admin_tasks').select('id, title, assigned_to').ilike('title', '%rupin%').limit(5),
  ])

  // Also get tasks assigned to any profile with Rupin's name
  const { data: rupinProfile } = await admin.from('profiles').select('id').ilike('first_name', 'rupin').single()
  const { data: tasksByProfileId } = rupinProfile
    ? await admin.from('admin_tasks').select('id, title, assigned_to').eq('assigned_to', rupinProfile.id).limit(10)
    : { data: [] }

  const { data: tasksByAuthId } = await admin
    .from('admin_tasks').select('id, title, assigned_to').eq('assigned_to', RUPIN_AUTH_ID).limit(10)

  return NextResponse.json({
    profile,
    rupinProfileId: rupinProfile?.id,
    authId: RUPIN_AUTH_ID,
    profileMatchesAuth: profile?.id === RUPIN_AUTH_ID,
    tasksByProfileId,
    tasksByAuthId,
  })
}
