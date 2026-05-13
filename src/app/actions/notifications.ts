'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { cookies } from 'next/headers'

async function getSupabase() {
    const cookieStore = await cookies()
    return createClient(cookieStore)
}

export interface Notification {
    id: string
    user_id: string
    title: string
    message: string | null
    type: 'info' | 'approval_request' | 'approved' | 'changes_requested'
    is_read: boolean
    created_at: string
}

export async function getNotifications(): Promise<{
    data: Notification[]
    unreadCount: number
    error: string | null
}> {
    try {
        const supabase = await getSupabase()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return { data: [], unreadCount: 0, error: 'Unauthorized' }

        const { data, error } = await supabase
            .from('notifications')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(50)

        if (error) return { data: [], unreadCount: 0, error: error.message }

        const unreadCount = (data || []).filter(n => !n.is_read).length
        return { data: data || [], unreadCount, error: null }
    } catch (err: any) {
        return { data: [], unreadCount: 0, error: err?.message }
    }
}

export async function markAllRead(): Promise<void> {
    try {
        const supabase = await getSupabase()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        await supabase.from('notifications').update({ is_read: true }).eq('user_id', user.id).eq('is_read', false)
    } catch {}
}

export async function markOneRead(notificationId: string): Promise<void> {
    try {
        const supabase = await getSupabase()
        await supabase.from('notifications').update({ is_read: true }).eq('id', notificationId)
    } catch {}
}

// Internal — called by server actions using admin client
export async function createNotificationForUser(
    userId: string,
    title: string,
    message: string,
    type: Notification['type']
) {
    try {
        const admin = createAdminClient()
        await admin.from('notifications').insert({ user_id: userId, title, message, type })
    } catch (err) {
        console.error('Failed to create notification:', err)
    }
}

// Notify all admins
export async function notifyAdmins(title: string, message: string, type: Notification['type']) {
    try {
        const admin = createAdminClient()
        const { data: admins } = await admin.from('profiles').select('id').eq('role', 'admin')
        if (!admins?.length) return
        await admin.from('notifications').insert(
            admins.map(a => ({ user_id: a.id, title, message, type }))
        )
    } catch (err) {
        console.error('Failed to notify admins:', err)
    }
}

// Notify all client users linked to a client
export async function notifyClientUsers(clientId: string, title: string, message: string, type: Notification['type']) {
    try {
        const admin = createAdminClient()
        const { data: clients } = await admin
            .from('profiles')
            .select('id')
            .eq('role', 'client')
            .eq('linked_client_id', clientId)
        if (!clients?.length) return
        await admin.from('notifications').insert(
            clients.map(c => ({ user_id: c.id, title, message, type }))
        )
    } catch (err) {
        console.error('Failed to notify client users:', err)
    }
}

// Notify PR & Social Media team members
export async function notifyPRTeam(title: string, message: string, type: Notification['type']) {
    try {
        const admin = createAdminClient()
        const { data: dept } = await admin.from('departments').select('id').eq('name', 'PR & Social Media').single()
        if (!dept) return
        const { data: members } = await admin.from('profiles').select('id').eq('department_id', dept.id)
        if (!members?.length) return
        await admin.from('notifications').insert(
            members.map(m => ({ user_id: m.id, title, message, type }))
        )
    } catch (err) {
        console.error('Failed to notify PR team:', err)
    }
}
