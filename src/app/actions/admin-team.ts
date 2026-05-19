'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { getAdminDepartmentId } from '@/lib/admin-helper'

interface InviteMemberParams {
    email: string
    first_name: string
    last_name: string
    role: string
    department_id: string
    custom_message?: string
}

export async function inviteTeamMember(params: InviteMemberParams) {
    try {
        if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
            console.error('Missing SUPABASE_SERVICE_ROLE_KEY')
            return { success: false, error: 'Server configuration error: Missing Service Role Key. Please add it to .env.local' }
        }

        const supabase = createAdminClient()

        // 1. Invite user via Supabase Auth
        const { data: authData, error: authError } = await supabase.auth.admin.inviteUserByEmail(
            params.email,
            {
                data: {
                    first_name: params.first_name,
                    last_name: params.last_name,
                    role: params.role,
                    department_id: params.department_id,
                    invite_message: params.custom_message,
                },
                redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/callback`
            }
        )

        if (authError) {
            console.error('Error inviting user:', authError)
            return { success: false, error: authError.message }
        }

        // 2. Update Profile if needed
        if (authData.user) {
            const { error: profileError } = await supabase
                .from('profiles')
                .update({
                    first_name: params.first_name,
                    last_name: params.last_name,
                    role: params.role,
                    department_id: params.department_id
                })
                .eq('id', authData.user.id)

            if (profileError) {
                console.error('Error updating profile:', profileError)
            }
        }

        revalidatePath('/admin')
        return { success: true, error: null }
    } catch (error) {
        console.error('Server Action Error:', error)
        return { success: false, error: 'Failed to invite member' }
    }
}



export async function getTeamMembers() {
    try {
        if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
            return { success: false, error: 'Server configuration error: Missing Service Role Key' }
        }

        const cookieStore = await cookies()
        const supabase = createClient(cookieStore)
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) return { success: false, error: 'Unauthorized' }

        const adminClient = createAdminClient()

        // Fetch caller profile, admin dept, and all departments in parallel
        const [
            { data: callerProfile, error: callerError },
            { data: adminDept },
            { data: departments, error: deptError },
        ] = await Promise.all([
            adminClient.from('profiles').select('department_id, role').eq('id', user.id).single(),
            adminClient.from('departments').select('id').eq('name', 'Administration').single(),
            adminClient.from('departments').select('id, name'),
        ])

        if (callerError || !callerProfile) return { success: false, error: 'Profile not found' }
        if (deptError) throw deptError

        const isSuperAdmin =
            callerProfile.role === 'admin' ||
            callerProfile.department_id === adminDept?.id

        let query = adminClient
            .from('profiles')
            .select('id, email, first_name, last_name, role, created_at, department_id')
            .order('created_at', { ascending: false })

        if (!isSuperAdmin) {
            query = query.eq('department_id', callerProfile.department_id)
        }

        const { data: profiles, error: profilesError } = await query
        if (profilesError) throw profilesError

        const deptMap = Object.fromEntries((departments || []).map((d: any) => [d.id, d.name]))
        const members = (profiles || []).map((m: any) => ({
            ...m,
            department_name: deptMap[m.department_id] || 'No Department',
        }))

        return { success: true, data: members }
    } catch (error) {
        console.error('Error fetching team members:', error)
        return { success: false, error: 'Failed to fetch team members' }
    }
}

// ============ DELETE TEAM MEMBER ============
export async function deleteTeamMember(userId: string): Promise<{ success: boolean; error?: string }> {
    try {
        if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
            return { success: false, error: 'Server configuration error: Missing Service Role Key' }
        }

        if (!userId) {
            return { success: false, error: 'User ID is required' }
        }

        // Get caller's info to check permissions
        const cookieStore = await cookies()
        const supabase = createClient(cookieStore)
        const { data: { user: caller }, error: authError } = await supabase.auth.getUser()

        if (authError || !caller) {
            return { success: false, error: 'Unauthorized' }
        }

        // Prevent self-deletion
        if (caller.id === userId) {
            return { success: false, error: 'You cannot delete your own account' }
        }

        const adminClient = createAdminClient()

        // Check if caller is in Admin department
        const adminDeptId = await getAdminDepartmentId()
        const { data: callerProfile } = await adminClient
            .from('profiles')
            .select('department_id, role')
            .eq('id', caller.id)
            .single()

        if (!callerProfile || callerProfile.department_id !== adminDeptId) {
            return { success: false, error: 'Only Admin department members can delete users' }
        }

        // Check if target user exists
        const { data: targetProfile } = await adminClient
            .from('profiles')
            .select('id, first_name, last_name, department_id')
            .eq('id', userId)
            .single()

        if (!targetProfile) {
            return { success: false, error: 'User not found' }
        }

        // Prevent deletion of Admin department members (except by super admin)
        if (targetProfile.department_id === adminDeptId && callerProfile.role !== 'admin') {
            return { success: false, error: 'Cannot delete Admin department members' }
        }

        // Delete the auth user (this will cascade to profile if foreign key is set up)
        const { error: deleteError } = await adminClient.auth.admin.deleteUser(userId)

        if (deleteError) {
            console.error('Error deleting user:', deleteError)
            return { success: false, error: deleteError.message }
        }

        // Also explicitly delete the profile (in case cascade doesn't happen)
        await adminClient
            .from('profiles')
            .delete()
            .eq('id', userId)

        revalidatePath('/admin')
        return { success: true }
    } catch (error) {
        console.error('Error in deleteTeamMember:', error)
        return { success: false, error: 'Failed to delete team member' }
    }
}

// ============ UPDATE TEAM MEMBER ============
export async function updateTeamMember(
    userId: string,
    updates: { first_name?: string; last_name?: string; department_id?: string; email?: string }
): Promise<{ success: boolean; error?: string }> {
    try {
        const adminClient = createAdminClient()

        // Update profiles table only (email here is the display/contact email)
        const { error } = await adminClient
            .from('profiles')
            .update(updates)
            .eq('id', userId)

        if (error) return { success: false, error: error.message }

        revalidatePath('/admin')
        return { success: true }
    } catch (error) {
        console.error('Error in updateTeamMember:', error)
        return { success: false, error: 'Failed to update team member' }
    }
}
