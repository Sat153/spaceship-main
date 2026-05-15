import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@supabase/supabase-js'

export async function GET() {
  const admin = createAdminClient()

  try {
    // Check current state of the user
    const { data: { users } } = await admin.auth.admin.listUsers({ perPage: 1000 })
    const ishika = users.find(u => u.email === 'ishika@anyasegen.com')

    if (!ishika) {
      return NextResponse.json({ ok: false, error: 'User not found in auth' })
    }

    // Test sign-in directly using the anon client
    const testClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    const { data: signInData, error: signInError } = await testClient.auth.signInWithPassword({
      email: 'ishika@anyasegen.com',
      password: 'IshikaAnya2024',
    })

    return NextResponse.json({
      userExists: true,
      userId: ishika.id,
      emailConfirmed: ishika.email_confirmed_at,
      banned: (ishika as any).banned ?? false,
      signInSuccess: !signInError,
      signInError: signInError?.message ?? null,
      signInUserId: signInData?.user?.id ?? null,
    })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message })
  }
}
