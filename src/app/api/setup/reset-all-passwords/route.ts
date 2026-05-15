import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

const USERS = [
  { id: 'deba5498-2066-4960-80d8-838e1109e58d', email: 'ishika@anyasegen.com', password: 'Ishika@2026' },
  { id: 'd07b636b-43e1-4139-a38a-6201ad339146', email: 'robin@anyasegen.com', password: 'Robin@2026' },
  { id: 'edbaa49c-46d9-4db7-ba74-1902f8c18b94', email: 'rakesh@anyasegen.com', password: 'Rakesh@2026' },
  { id: 'be09d121-260f-40eb-acb3-960636588d05', email: 'vikas@anyasegen.com', password: 'Vikas@2026' },
  { id: '184a83c7-7945-4eb7-914c-07854a90cf75', email: 'iqra@anyasegen.com', password: 'Iqra@2026' },
  { id: 'e2504013-dcf0-41dd-a56e-1e68ed4c6dd0', email: 'prashant@anyasegen.com', password: 'Prashant@2026' },
  { id: '8bd60502-fe10-4e01-bd09-feba180836a0', email: 'satyam@anyasegen.com', password: 'Satyam@2026' },
]

export async function GET() {
  const admin = createAdminClient()
  const results = []

  for (const u of USERS) {
    const { error } = await admin.auth.admin.updateUserById(u.id, { password: u.password, email_confirm: true })
    results.push({ email: u.email, password: u.password, ok: !error, error: error?.message })
  }

  return NextResponse.json({ results })
}
