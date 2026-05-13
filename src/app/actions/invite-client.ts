'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

export async function inviteClientUser(
    clientId: string,
    email: string,
    firstName: string,
    lastName: string
): Promise<{ error: string | null }> {
    try {
        const cookieStore = await cookies()
        const supabase = createClient(cookieStore)

        // Verify caller is admin
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return { error: 'Unauthorized' }

        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()

        if (profile?.role !== 'admin') return { error: 'Only admins can invite client users' }

        const admin = createAdminClient()
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.anyasegen.com'

        // Check if user already exists
        const { data: existingUsers } = await admin.auth.admin.listUsers()
        const exists = existingUsers?.users?.find(u => u.email === email)

        if (exists) return { error: 'A user with this email already exists' }

        // Send invite email
        const { data: inviteData, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
            data: {
                first_name: firstName,
                last_name: lastName,
                role: 'client',
                linked_client_id: clientId,
            },
            redirectTo: `${appUrl}/auth/callback`,
        })

        if (inviteError) return { error: inviteError.message }

        // Create profile immediately so they have access on first login
        if (inviteData?.user) {
            await admin.from('profiles').insert({
                id: inviteData.user.id,
                email,
                first_name: firstName,
                last_name: lastName,
                role: 'client',
                department_id: null,
                linked_client_id: clientId,
            })

            // Add them to stage 4 (Final Approval) room for this client
            const { data: stage4Room } = await admin
                .from('chat_rooms')
                .select('id')
                .eq('client_id', clientId)
                .eq('type', 'client')
                .filter('stage_id', 'in', `(SELECT id FROM workflow_stages WHERE stage_order = 4)`)
                .maybeSingle()

            if (stage4Room) {
                await admin.from('chat_room_members').insert({
                    room_id: stage4Room.id,
                    user_id: inviteData.user.id,
                }).select()
            }
        }

        return { error: null }
    } catch (err: any) {
        console.error('inviteClientUser error:', err)
        return { error: err?.message || 'Failed to send invite' }
    }
}

export async function getClientInvitees(clientId: string): Promise<{
    data: Array<{ id: string; email: string; first_name: string; last_name: string }> | null
    error: string | null
}> {
    try {
        const cookieStore = await cookies()
        const supabase = createClient(cookieStore)

        const { data, error } = await supabase
            .from('profiles')
            .select('id, email, first_name, last_name')
            .eq('role', 'client')
            .eq('linked_client_id', clientId)

        if (error) return { data: null, error: error.message }
        return { data, error: null }
    } catch (err: any) {
        return { data: null, error: err?.message || 'Failed to fetch invitees' }
    }
}
