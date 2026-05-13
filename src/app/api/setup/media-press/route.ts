import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// One-time setup route — DELETE this file after running once
export async function POST(request: NextRequest) {
    const secret = request.nextUrl.searchParams.get('secret')
    if (secret !== process.env.TELEGRAM_WEBHOOK_SECRET && secret !== 'anya-segen-setup-2026') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createAdminClient()

    // 1. Ensure department exists
    let { data: dept } = await supabase
        .from('departments')
        .select('id')
        .eq('name', 'Media & Press Operations')
        .maybeSingle()

    if (!dept) {
        const { data: created, error: deptErr } = await supabase
            .from('departments')
            .insert({ name: 'Media & Press Operations' })
            .select('id')
            .single()
        if (deptErr) return NextResponse.json({ error: 'Failed to create department: ' + deptErr.message }, { status: 500 })
        dept = created
    }

    const members = [
        { email: 'vikas@anyasegen.com', password: 'fd3fSd&v', first_name: 'Vikas', last_name: 'Shah' },
        { email: 'rakesh@anyasegen.com', password: 'r9uj@Pny', first_name: 'Rakesh', last_name: 'Garia' },
    ]

    const results: { email: string; status: string; error?: string }[] = []

    for (const member of members) {
        // Check if user already exists
        const { data: existing } = await supabase
            .from('profiles')
            .select('id')
            .eq('email', member.email)
            .maybeSingle()

        if (existing) {
            // Just update their department
            await supabase
                .from('profiles')
                .update({ department_id: dept!.id, first_name: member.first_name, last_name: member.last_name })
                .eq('id', existing.id)
            results.push({ email: member.email, status: 'updated (already existed)' })
            continue
        }

        const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
            email: member.email,
            password: member.password,
            email_confirm: true,
            user_metadata: { first_name: member.first_name, last_name: member.last_name },
        })

        if (authErr) {
            results.push({ email: member.email, status: 'error', error: authErr.message })
            continue
        }

        // Upsert profile
        const { error: profileErr } = await supabase.from('profiles').upsert({
            id: authData.user.id,
            email: member.email,
            first_name: member.first_name,
            last_name: member.last_name,
            role: 'user',
            department_id: dept!.id,
        })

        if (profileErr) {
            results.push({ email: member.email, status: 'auth created but profile failed', error: profileErr.message })
        } else {
            results.push({ email: member.email, status: 'created' })
        }
    }

    return NextResponse.json({ department: { id: dept!.id, name: 'Media & Press Operations' }, members: results })
}
