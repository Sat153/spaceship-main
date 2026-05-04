'use server'

import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'

// ============ TYPES ============

export interface ClientShare {
    id: string
    client_id: string
    client_name: string
    shared_with_user_id: string
    shared_with_name: string
    shared_with_email: string
    shared_by_name: string
    created_at: string
}

export interface ShareableUser {
    id: string
    name: string
    email: string
    department_name: string
    role: string
}

// ============ HELPER ============

async function getSupabaseClient() {
    const cookieStore = await cookies()
    return createClient(cookieStore)
}

// ============ GET CLIENT SHARES ============

export async function getClientShares(clientId: string): Promise<{
    success: boolean;
    data?: ClientShare[];
    error?: string
}> {
    console.log('🔍 ACTION: getClientShares')
    try {
        const supabase = await getSupabaseClient()

        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return { success: false, error: 'Unauthorized' }
        }

        // Check if caller is admin/manager
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()

        if (!profile || !['admin', 'manager'].includes(profile.role)) {
            return { success: false, error: 'Only Admin/Manager can view shares' }
        }

        const { data: shares, error: sharesError } = await supabase
            .from('client_shares')
            .select('*')
            .eq('client_id', clientId)

        if (sharesError) {
            return { success: false, error: sharesError.message }
        }

        if (!shares || shares.length === 0) {
            return { success: true, data: [] }
        }

        // Get user details
        const userIds = [
            ...shares.map(s => s.shared_with_user_id),
            ...shares.map(s => s.shared_by_user_id)
        ]
        const { data: users } = await supabase
            .from('profiles')
            .select('id, first_name, last_name, email')
            .in('id', userIds)

        // Get client name
        const { data: client } = await supabase
            .from('clients')
            .select('name')
            .eq('id', clientId)
            .single()

        const enrichedShares: ClientShare[] = shares.map(share => {
            const sharedWith = users?.find(u => u.id === share.shared_with_user_id)
            const sharedBy = users?.find(u => u.id === share.shared_by_user_id)

            return {
                id: share.id,
                client_id: share.client_id,
                client_name: client?.name || 'Unknown',
                shared_with_user_id: share.shared_with_user_id,
                shared_with_name: sharedWith ? `${sharedWith.first_name} ${sharedWith.last_name}` : 'Unknown',
                shared_with_email: sharedWith?.email || '',
                shared_by_name: sharedBy ? `${sharedBy.first_name} ${sharedBy.last_name}` : 'Unknown',
                created_at: share.created_at
            }
        })

        return { success: true, data: enrichedShares }
    } catch (error) {
        console.error('Error in getClientShares:', error)
        return { success: false, error: 'Failed to fetch shares' }
    }
}

// ============ GET SHAREABLE USERS ============

export async function getShareableUsers(clientId: string): Promise<{
    success: boolean;
    data?: ShareableUser[];
    error?: string
}> {
    console.log('🔍 ACTION: getShareableUsers')
    try {
        const supabase = await getSupabaseClient()

        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return { success: false, error: 'Unauthorized' }
        }

        // Get all users except current user
        const { data: allUsers, error: usersError } = await supabase
            .from('profiles')
            .select('id, first_name, last_name, email, role, department_id')
            .neq('id', user.id)
            .order('first_name')

        if (usersError) {
            return { success: false, error: usersError.message }
        }

        // Get users who already have access
        const { data: existingShares } = await supabase
            .from('client_shares')
            .select('shared_with_user_id')
            .eq('client_id', clientId)

        const sharedUserIds = new Set(existingShares?.map(s => s.shared_with_user_id) || [])

        // Filter out users who already have access
        const availableUsers = allUsers?.filter(u => !sharedUserIds.has(u.id)) || []

        // Get department names
        const deptIds = Array.from(new Set(availableUsers.map(u => u.department_id).filter(Boolean)))
        const { data: departments } = await supabase
            .from('departments')
            .select('id, name')
            .in('id', deptIds)

        const shareableUsers: ShareableUser[] = availableUsers.map(u => {
            const dept = departments?.find(d => d.id === u.department_id)
            return {
                id: u.id,
                name: `${u.first_name} ${u.last_name}`,
                email: u.email,
                department_name: dept?.name || 'Unknown',
                role: u.role
            }
        })

        return { success: true, data: shareableUsers }
    } catch (error) {
        console.error('Error in getShareableUsers:', error)
        return { success: false, error: 'Failed to fetch users' }
    }
}

// ============ SHARE CLIENT ============

export async function shareClientWithUser(clientId: string, userId: string): Promise<{
    success: boolean;
    error?: string
}> {
    try {
        const supabase = await getSupabaseClient()

        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return { success: false, error: 'Unauthorized' }
        }

        // Check if caller is admin/manager
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()

        if (!profile || !['admin', 'manager'].includes(profile.role)) {
            return { success: false, error: 'Only Admin/Manager can share clients' }
        }

        // Check if already shared
        const { data: existing } = await supabase
            .from('client_shares')
            .select('id')
            .eq('client_id', clientId)
            .eq('shared_with_user_id', userId)
            .single()

        if (existing) {
            return { success: false, error: 'Client already shared with this user' }
        }

        // Create share
        const { error: insertError } = await supabase
            .from('client_shares')
            .insert({
                client_id: clientId,
                shared_with_user_id: userId,
                shared_by_user_id: user.id
            })

        if (insertError) {
            console.error('Error sharing client:', insertError)
            return { success: false, error: insertError.message }
        }

        revalidatePath('/admin')
        return { success: true }
    } catch (error) {
        console.error('Error in shareClientWithUser:', error)
        return { success: false, error: 'Failed to share client' }
    }
}

// ============ UNSHARE CLIENT ============

export async function unshareClient(shareId: string): Promise<{
    success: boolean;
    error?: string
}> {
    try {
        const supabase = await getSupabaseClient()

        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return { success: false, error: 'Unauthorized' }
        }

        // Check if caller is admin/manager
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()

        if (!profile || !['admin', 'manager'].includes(profile.role)) {
            return { success: false, error: 'Only Admin/Manager can unshare clients' }
        }

        const { error: deleteError } = await supabase
            .from('client_shares')
            .delete()
            .eq('id', shareId)

        if (deleteError) {
            return { success: false, error: deleteError.message }
        }

        revalidatePath('/admin')
        return { success: true }
    } catch (error) {
        console.error('Error in unshareClient:', error)
        return { success: false, error: 'Failed to unshare client' }
    }
}
