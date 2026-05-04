'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'

async function getUser() {
    const supabase = createClient(await cookies())
    const { data: { user } } = await supabase.auth.getUser()
    return user
}

// ─── PROFILE ────────────────────────────────────────────────────────────────

export async function getMyProfile() {
    try {
        const user = await getUser()
        if (!user) return { data: null, error: 'Unauthorized' }
        const admin = createAdminClient()
        const { data, error } = await admin
            .from('profiles')
            .select('id, first_name, last_name, email, role, department_id')
            .eq('id', user.id)
            .single()
        if (error) return { data: null, error: error.message }
        return { data, error: null }
    } catch {
        return { data: null, error: 'Failed to load profile' }
    }
}

export async function updateMyProfile(updates: {
    first_name: string
    last_name: string
    email: string
}): Promise<{ success: boolean; error: string | null }> {
    try {
        const user = await getUser()
        if (!user) return { success: false, error: 'Unauthorized' }
        const admin = createAdminClient()
        const { error } = await admin
            .from('profiles')
            .update(updates)
            .eq('id', user.id)
        if (error) return { success: false, error: error.message }
        revalidatePath('/admin')
        return { success: true, error: null }
    } catch {
        return { success: false, error: 'Failed to update profile' }
    }
}

// ─── SYSTEM SETTINGS ────────────────────────────────────────────────────────

export async function getSystemSettings(): Promise<{ data: Record<string, string>; error: string | null }> {
    try {
        const admin = createAdminClient()
        const { data, error } = await admin.from('system_settings').select('key, value')
        if (error) return { data: {}, error: error.message }
        const map: Record<string, string> = {}
        ;(data || []).forEach((row: any) => { map[row.key] = row.value })
        return { data: map, error: null }
    } catch {
        return { data: {}, error: 'Failed to load settings' }
    }
}

export async function upsertSystemSetting(key: string, value: string): Promise<{ success: boolean; error: string | null }> {
    try {
        const user = await getUser()
        if (!user) return { success: false, error: 'Unauthorized' }
        const admin = createAdminClient()
        const { error } = await admin
            .from('system_settings')
            .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' })
        if (error) return { success: false, error: error.message }
        revalidatePath('/admin')
        return { success: true, error: null }
    } catch {
        return { success: false, error: 'Failed to save setting' }
    }
}

// ─── DEPARTMENTS ────────────────────────────────────────────────────────────

export async function getDepartmentsWithCount(): Promise<{ data: any[] | null; error: string | null }> {
    try {
        const admin = createAdminClient()
        const [{ data: depts, error: deptsErr }, { data: profiles }] = await Promise.all([
            admin.from('departments').select('*').order('name'),
            admin.from('profiles').select('department_id'),
        ])
        if (deptsErr) return { data: null, error: deptsErr.message }
        const counts: Record<string, number> = {}
        ;(profiles || []).forEach((p: any) => {
            if (p.department_id) counts[p.department_id] = (counts[p.department_id] || 0) + 1
        })
        const result = (depts || []).map((d: any) => ({ ...d, member_count: counts[d.id] || 0 }))
        return { data: result, error: null }
    } catch {
        return { data: null, error: 'Failed to load departments' }
    }
}

export async function createDepartment(name: string, description?: string): Promise<{ success: boolean; error: string | null }> {
    try {
        if (!name.trim()) return { success: false, error: 'Name is required' }
        const admin = createAdminClient()
        const { error } = await admin.from('departments').insert({ name: name.trim(), description: description?.trim() || null })
        if (error) return { success: false, error: error.message }
        revalidatePath('/admin')
        return { success: true, error: null }
    } catch {
        return { success: false, error: 'Failed to create department' }
    }
}

export async function updateDepartment(id: string, name: string, description?: string): Promise<{ success: boolean; error: string | null }> {
    try {
        if (!name.trim()) return { success: false, error: 'Name is required' }
        const admin = createAdminClient()
        const { error } = await admin
            .from('departments')
            .update({ name: name.trim(), description: description?.trim() || null, updated_at: new Date().toISOString() })
            .eq('id', id)
        if (error) return { success: false, error: error.message }
        revalidatePath('/admin')
        return { success: true, error: null }
    } catch {
        return { success: false, error: 'Failed to update department' }
    }
}

export async function deleteDepartment(id: string): Promise<{ success: boolean; error: string | null }> {
    try {
        const admin = createAdminClient()
        // Check if any members are assigned
        const { data: members } = await admin.from('profiles').select('id').eq('department_id', id).limit(1)
        if (members && members.length > 0) {
            return { success: false, error: 'Cannot delete: members are still assigned to this department. Reassign them first.' }
        }
        const { error } = await admin.from('departments').delete().eq('id', id)
        if (error) return { success: false, error: error.message }
        revalidatePath('/admin')
        return { success: true, error: null }
    } catch {
        return { success: false, error: 'Failed to delete department' }
    }
}
