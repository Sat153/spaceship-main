import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const admin = createAdminClient()

    const { data, error } = await admin.auth.admin.updateUserById(
      '8937ab9b-f9b6-4c11-997e-080b19a7886c',
      { password: 'Utkarsh@2026', email_confirm: true }
    )

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    return NextResponse.json({ success: true, email: data.user.email })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
