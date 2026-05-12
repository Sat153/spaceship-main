'use server'

import { createAdminClient } from "@/lib/supabase/admin"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

export interface DepartmentStats {
    id: string
    name: string
    memberCount: number
    documentCount: number
}

export async function getDepartmentStats(): Promise<{ success: boolean, data?: DepartmentStats[], error?: string }> {
    try {
        // 1. Get current user to check permissions
        const cookieStore = await cookies()
        const supabaseUser = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    getAll() { return cookieStore.getAll() },
                    setAll() { } // Read-only
                }
            }
        )

        const { data: { user }, error: userError } = await supabaseUser.auth.getUser()
        if (userError || !user) throw new Error('Unauthorized')

        // 2. Fetch the REAL Admin Department ID from DB
        const supabaseAdmin = createAdminClient()
        const { data: adminDept, error: adminDeptError } = await supabaseAdmin
            .from('departments')
            .select('id')
            .eq('name', 'Administration')
            .single()

        if (adminDeptError || !adminDept) {
            console.error('CRITICAL: Could not find Admin department', adminDeptError)
            throw new Error('System configuration error: Admin department not found')
        }

        const ADMIN_DEPT_ID = adminDept.id

        // Read department_id from profiles table (not user_metadata)
        const { data: userProfile } = await supabaseAdmin
            .from('profiles')
            .select('department_id')
            .eq('id', user.id)
            .single()

        const userDeptId = userProfile?.department_id
        const isSuperAdmin = userDeptId === ADMIN_DEPT_ID

        // 3. Fetch departments based on role
        let query = supabaseAdmin.from('departments').select('id, name').order('name')

        // If not Super Admin, restrict to own department
        if (!isSuperAdmin) {
            if (!userDeptId) throw new Error('User has no department assigned')
            query = query.eq('id', userDeptId)
        }

        const { data: depts, error: deptError } = await query
        if (deptError) throw deptError

        // 4. Fetch counts for each department
        const statsPromises = depts.map(async (dept) => {
            const [members, documents] = await Promise.all([
                supabaseAdmin
                    .from('profiles')
                    .select('id', { count: 'exact', head: true })
                    .eq('department_id', dept.id),
                supabaseAdmin
                    .from('documents')
                    .select('id', { count: 'exact', head: true })
                    .eq('department_id', dept.id)
            ])

            return {
                id: dept.id,
                name: dept.name,
                memberCount: members.count || 0,
                documentCount: documents.count || 0
            }
        })

        const results = await Promise.all(statsPromises)
        return { success: true, data: results }

    } catch (error) {
        console.error('Error fetching department stats:', error)
        return { success: false, error: 'Failed to fetch department statistics' }
    }
}

// ============ Helper: Check if user is Admin Department member ============
async function checkAdminPermission(): Promise<{ allowed: boolean; error?: string }> {
    try {
        const cookieStore = await cookies()
        const supabaseUser = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    getAll() { return cookieStore.getAll() },
                    setAll() { }
                }
            }
        )

        const { data: { user }, error: userError } = await supabaseUser.auth.getUser()
        if (userError || !user) return { allowed: false, error: 'Unauthorized' }

        const supabaseAdmin = createAdminClient()
        const { data: adminDept } = await supabaseAdmin
            .from('departments')
            .select('id')
            .eq('name', 'Administration')
            .single()

        if (!adminDept) return { allowed: false, error: 'Admin department not found' }

        const { data: userProfile } = await supabaseAdmin
            .from('profiles')
            .select('department_id')
            .eq('id', user.id)
            .single()

        const userDeptId = userProfile?.department_id
        if (userDeptId !== adminDept.id) {
            return { allowed: false, error: 'Only Admin department members can manage departments' }
        }

        return { allowed: true }
    } catch (error) {
        return { allowed: false, error: 'Permission check failed' }
    }
}

// ============ CREATE DEPARTMENT ============
export interface CreateDepartmentData {
    name: string
}

export async function createDepartment(data: CreateDepartmentData): Promise<{ success: boolean; id?: string; error?: string }> {
    try {
        const permCheck = await checkAdminPermission()
        if (!permCheck.allowed) return { success: false, error: permCheck.error }

        if (!data.name || data.name.trim().length === 0) {
            return { success: false, error: 'Department name is required' }
        }

        const supabaseAdmin = createAdminClient()

        // Check if department already exists
        const { data: existing } = await supabaseAdmin
            .from('departments')
            .select('id')
            .ilike('name', data.name.trim())
            .single()

        if (existing) {
            return { success: false, error: 'A department with this name already exists' }
        }

        const { data: newDept, error } = await supabaseAdmin
            .from('departments')
            .insert({
                name: data.name.trim()
            })
            .select('id')
            .single()

        if (error) {
            console.error('Error creating department:', error)
            return { success: false, error: error.message }
        }

        return { success: true, id: newDept?.id }
    } catch (error) {
        console.error('Error in createDepartment:', error)
        return { success: false, error: 'Failed to create department' }
    }
}

// ============ UPDATE DEPARTMENT ============
export interface UpdateDepartmentData {
    name?: string
}

export async function updateDepartment(id: string, data: UpdateDepartmentData): Promise<{ success: boolean; error?: string }> {
    try {
        const permCheck = await checkAdminPermission()
        if (!permCheck.allowed) return { success: false, error: permCheck.error }

        if (!id) return { success: false, error: 'Department ID is required' }

        const supabaseAdmin = createAdminClient()

        // Check if trying to rename to an existing name
        if (data.name) {
            const { data: existing } = await supabaseAdmin
                .from('departments')
                .select('id')
                .ilike('name', data.name.trim())
                .neq('id', id)
                .single()

            if (existing) {
                return { success: false, error: 'A department with this name already exists' }
            }
        }

        const updateData: any = {}
        if (data.name) updateData.name = data.name.trim()

        const { error } = await supabaseAdmin
            .from('departments')
            .update(updateData)
            .eq('id', id)

        if (error) {
            console.error('Error updating department:', error)
            return { success: false, error: error.message }
        }

        return { success: true }
    } catch (error) {
        console.error('Error in updateDepartment:', error)
        return { success: false, error: 'Failed to update department' }
    }
}

// ============ DELETE DEPARTMENT ============
export async function deleteDepartment(id: string): Promise<{ success: boolean; error?: string }> {
    try {
        const permCheck = await checkAdminPermission()
        if (!permCheck.allowed) return { success: false, error: permCheck.error }

        if (!id) return { success: false, error: 'Department ID is required' }

        const supabaseAdmin = createAdminClient()

        // Check if this is the Admin department (cannot delete)
        const { data: dept } = await supabaseAdmin
            .from('departments')
            .select('name')
            .eq('id', id)
            .single()

        if (dept?.name === 'Admin') {
            return { success: false, error: 'Cannot delete the Admin department' }
        }

        // Check if department has members
        const { count: memberCount } = await supabaseAdmin
            .from('profiles')
            .select('id', { count: 'exact', head: true })
            .eq('department_id', id)

        if (memberCount && memberCount > 0) {
            return { success: false, error: `Cannot delete department with ${memberCount} member(s). Reassign them first.` }
        }

        // Check if department has clients
        const { count: clientCount } = await supabaseAdmin
            .from('clients')
            .select('id', { count: 'exact', head: true })
            .eq('department_id', id)

        if (clientCount && clientCount > 0) {
            return { success: false, error: `Cannot delete department with ${clientCount} client(s). Reassign them first.` }
        }

        const { error } = await supabaseAdmin
            .from('departments')
            .delete()
            .eq('id', id)

        if (error) {
            console.error('Error deleting department:', error)
            return { success: false, error: error.message }
        }

        return { success: true }
    } catch (error) {
        console.error('Error in deleteDepartment:', error)
        return { success: false, error: 'Failed to delete department' }
    }
}
