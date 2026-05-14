import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

const SECRET = process.env.SETUP_SECRET || 'anya-setup-2024'

export async function POST(request: NextRequest) {
    const secret = request.nextUrl.searchParams.get('secret')
    if (secret !== SECRET) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })

    const supabase = createAdminClient()

    // Create auth account
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
        email: 'ishika@anyasegen.com',
        password: 'Ishika@Anya2024!',
        email_confirm: true,
    })

    if (authError && !authError.message.includes('already been registered')) {
        return NextResponse.json({ ok: false, error: authError.message })
    }

    const userId = authUser?.user?.id

    // Find existing profile by email and update with auth id
    if (userId) {
        const { data: dept } = await supabase
            .from('departments')
            .select('id')
            .eq('name', 'PR & Social Media')
            .single()

        await supabase.from('profiles').upsert({
            id: userId,
            email: 'ishika@anyasegen.com',
            first_name: 'Ishika',
            last_name: '',
            role: 'user',
            department_id: dept?.id ?? null,
        }, { onConflict: 'id' })
    }

    return NextResponse.json({ ok: true, userId, message: 'Ishika account created successfully' })
}
