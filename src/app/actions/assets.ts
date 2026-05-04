'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { getAdminDepartmentId } from '@/lib/admin-helper'

export interface Asset {
    id: string
    name: string
    type: 'file' | 'folder' | 'doc'
    parent_id: string | null
    department_id: string
    url: string | null
    size: number
    mime_type: string | null
    content?: string | null
    created_at: string
    updated_at: string
    created_by: string
    departments?: { name: string } | null
    client_id?: string | null
    event_name?: string | null
    event_date?: string | null
}

// Helper to check permission (mostly relies on RLS, but strictly enforcing Dept ID on write is good)
async function getCallerInfo() {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return null

    // Helper to get profile for department info
    const admin = createAdminClient()
    const { data: profile } = await admin
        .from('profiles')
        .select('department_id, role')
        .eq('id', user.id)
        .single()

    return { user, profile }
}

export async function getAssets(departmentId?: string, parentId: string | null = null, clientId?: string) {
    console.log('🔍 ACTION: getAssets')
    try {
        const admin = createAdminClient()

        let query = admin
            .from('assets')
            .select('*')
            .order('type', { ascending: false }) // Folders first
            .order('name', { ascending: true })

        if (parentId) {
            query = query.eq('parent_id', parentId)
        } else {
            query = query.is('parent_id', null)
        }

        if (clientId) {
            // If filtering by client, show ONLY that client's assets
            query = query.eq('client_id', clientId)
        }
        // Client assets are visible in main library too

        // If a specific department is requested (e.g. by Super Admin filtering), add it.
        // If not requested, RLS handles it for normal users.
        if (departmentId && departmentId !== 'all') {
            query = query.eq('department_id', departmentId)
        }

        const { data, error } = await query

        if (error) throw error

        return { success: true, data: data as Asset[] }
    } catch (error) {
        console.error('Error fetching assets:', error)
        return { success: false, error: 'Failed to fetch assets' }
    }
}

// Helper to get or create a folder by name within a parent
async function getOrCreateFolder(
    supabase: any,
    name: string,
    parentId: string | null,
    departmentId: string,
    userId: string
) {
    // 1. Check if folder exists
    let query = supabase
        .from('assets')
        .select('id')
        .eq('name', name)
        .eq('type', 'folder')
        .eq('department_id', departmentId)

    if (parentId) {
        query = query.eq('parent_id', parentId)
    } else {
        query = query.is('parent_id', null)
    }

    const { data: existing } = await query.single()

    if (existing) return existing.id

    // 2. Create if not exists
    const { data: newFolder, error } = await supabase
        .from('assets')
        .insert({
            name,
            type: 'folder',
            parent_id: parentId,
            department_id: departmentId,
            created_by: userId
        })
        .select('id')
        .single()

    if (error) throw error
    return newFolder.id
}

// New helper to find the folder for a specific client
export async function getClientRootFolder(clientId: string) {
    console.log('🔍 ACTION: getClientRootFolder')
    try {
        const info = await getCallerInfo()
        if (!info || !info.profile) return { success: false, error: 'Unauthorized' }
        const { user, profile } = info

        const admin = createAdminClient()
        // 1. Get Client Name and Department
        const { data: client, error: clientError } = await admin
            .from('clients')
            .select('name, department_id')
            .eq('id', clientId)
            .single()

        if (clientError || !client) return { success: false, error: 'Client not found' }

        const supabase = createClient(await cookies()) // RLS client

        // 2. Look for "Clients" folder
        const { data: clientsFolder } = await supabase
            .from('assets')
            .select('id')
            .eq('name', 'Clients')
            .eq('type', 'folder')
            .eq('department_id', client.department_id)
            .is('parent_id', null)
            .single()

        if (!clientsFolder) return { success: true, data: null } // Not created yet

        // 3. Look for "{ClientName}" folder inside it
        const { data: clientFolder } = await supabase
            .from('assets')
            .select('id')
            .eq('name', client.name)
            .eq('type', 'folder')
            .eq('department_id', client.department_id)
            .eq('parent_id', clientsFolder.id)
            .single()

        return { success: true, data: clientFolder ? clientFolder.id : null }

    } catch (error) {
        console.error('Error getting client root folder:', error)
        return { success: false, error: 'Failed' }
    }
}

export async function createFolder(name: string, parentId: string | null, clientId?: string, eventName?: string, eventDate?: string) {
    try {
        const info = await getCallerInfo()
        if (!info || !info.profile) return { success: false, error: 'Unauthorized' }

        const { user, profile } = info
        const admin = createAdminClient()

        // Determine effective department:
        let targetDepartmentId = profile.department_id

        if (clientId) {
            const { data: client, error: clientError } = await admin
                .from('clients')
                .select('department_id')
                .eq('id', clientId)
                .single()

            if (!clientError && client) {
                targetDepartmentId = client.department_id
            }
        }

        const baseInsert: Record<string, any> = {
            name,
            type: 'folder',
            parent_id: parentId,
            department_id: targetDepartmentId,
            created_by: user.id,
            client_id: clientId || null,
        }

        // Try with event fields first; fall back to base insert if columns don't exist yet
        let data: any = null
        let error: any = null

        if (eventName || eventDate) {
            const withEvents = { ...baseInsert }
            if (eventName) withEvents.event_name = eventName
            if (eventDate) withEvents.event_date = eventDate

            const res = await admin.from('assets').insert(withEvents).select().single()
            data = res.data
            error = res.error

            // If columns don't exist yet, retry without event fields
            if (error && (error.code === '42703' || error.message?.includes('column'))) {
                const fallback = await admin.from('assets').insert(baseInsert).select().single()
                data = fallback.data
                error = fallback.error
            }
        } else {
            const res = await admin.from('assets').insert(baseInsert).select().single()
            data = res.data
            error = res.error
        }

        if (error) throw error

        revalidatePath('/admin/assets')
        return { success: true, data }
    } catch (error) {
        console.error('Error creating folder:', error)
        return { success: false, error: 'Failed to create folder' }
    }
}

export async function uploadFile(
    formData: FormData,
    parentId: string | null,
    clientId?: string
) {
    try {
        const file = formData.get('file') as File
        if (!file) return { success: false, error: 'No file provided' }

        const info = await getCallerInfo()
        if (!info || !info.profile) return { success: false, error: 'Unauthorized' }
        const { user, profile } = info

        const adminSupabase = createAdminClient()

        // Determine effective department:
        let targetDepartmentId = profile.department_id
        let targetParentId = parentId

        // If attaching to a client, fetch client's department AND set up folder structure
        if (clientId) {
            const { data: client, error: clientError } = await adminSupabase
                .from('clients')
                .select('id, name, department_id')
                .eq('id', clientId)
                .single()

            if (!clientError && client) {
                targetDepartmentId = client.department_id

                try {
                    const clientsFolderId = await getOrCreateFolder(
                        adminSupabase,
                        'Clients',
                        null,
                        targetDepartmentId,
                        user.id
                    )
                    const clientFolderId = await getOrCreateFolder(
                        adminSupabase,
                        client.name,
                        clientsFolderId,
                        targetDepartmentId,
                        user.id
                    )
                    targetParentId = clientFolderId
                } catch (folderError) {
                    console.error('Error auto-creating client folders:', folderError)
                    return { success: false, error: 'Failed to organize client folder' }
                }
            }
        }

        // 1. Upload to Supabase Storage
        const fileExt = file.name.split('.').pop()
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
        const filePath = `${targetDepartmentId}/${fileName}`

        const { error: uploadError } = await adminSupabase
            .storage
            .from('team-assets')
            .upload(filePath, file, {
                contentType: file.type,
                upsert: false
            })

        if (uploadError) throw uploadError

        const { data: { publicUrl } } = adminSupabase
            .storage
            .from('team-assets')
            .getPublicUrl(filePath)

        // 2. Insert into Database
        const { data, error: dbError } = await adminSupabase
            .from('assets')
            .insert({
                name: file.name,
                type: 'file',
                parent_id: targetParentId,
                department_id: targetDepartmentId,
                url: publicUrl,
                size: file.size,
                mime_type: file.type,
                created_by: user.id,
                client_id: clientId || null
            })
            .select()
            .single()

        if (dbError) {
            // Cleanup storage if DB fails
            await adminSupabase.storage.from('team-assets').remove([filePath])
            throw dbError
        }

        revalidatePath('/admin/assets')
        return { success: true, data }
    } catch (error) {
        console.error('Error uploading file:', error)
        return { success: false, error: 'Failed to upload file' }
    }
}

export async function getClientIdByName(name: string): Promise<{ id: string | null }> {
    try {
        const admin = createAdminClient()
        const { data } = await admin
            .from('clients')
            .select('id')
            .eq('name', name)
            .single()
        return { id: data?.id ?? null }
    } catch {
        return { id: null }
    }
}

export async function createDoc(name: string, content: string, parentId: string | null, clientId?: string) {
    try {
        const info = await getCallerInfo()
        if (!info || !info.profile) return { success: false, error: 'Unauthorized' }
        const { user, profile } = info
        const admin = createAdminClient()

        let targetDepartmentId = profile.department_id

        if (clientId) {
            const { data: client } = await admin.from('clients').select('department_id').eq('id', clientId).single()
            if (client) targetDepartmentId = client.department_id
        }

        // If parent folder exists, inherit its department
        if (!targetDepartmentId && parentId) {
            const { data: parentFolder } = await admin.from('assets').select('department_id').eq('id', parentId).single()
            if (parentFolder) targetDepartmentId = parentFolder.department_id
        }

        // Admin fallback: use first department
        if (!targetDepartmentId) {
            const { data: firstDept } = await admin.from('departments').select('id').order('name').limit(1).single()
            if (firstDept) targetDepartmentId = firstDept.id
        }

        const { data, error } = await admin.from('assets').insert({
            name,
            type: 'doc',
            content,
            parent_id: parentId,
            department_id: targetDepartmentId,
            created_by: user.id,
            client_id: clientId || null,
        }).select().single()

        if (error) {
            console.error('createDoc DB error:', error)
            return { success: false, error: error.message }
        }
        revalidatePath('/admin')
        return { success: true, data }
    } catch (error: any) {
        console.error('Error creating doc:', error)
        return { success: false, error: error?.message || 'Failed to create document' }
    }
}

export async function updateDoc(id: string, name: string, content: string) {
    try {
        const admin = createAdminClient()
        const { error } = await admin.from('assets').update({ name, content, updated_at: new Date().toISOString() }).eq('id', id)
        if (error) throw error
        revalidatePath('/admin')
        return { success: true }
    } catch (error) {
        console.error('Error updating doc:', error)
        return { success: false, error: 'Failed to update document' }
    }
}

export async function deleteAsset(id: string) {
    try {
        const admin = createAdminClient()

        const { data: asset, error: fetchError } = await admin
            .from('assets')
            .select('*')
            .eq('id', id)
            .single()

        if (fetchError || !asset) return { success: false, error: 'Asset not found' }

        const { error: deleteError } = await admin
            .from('assets')
            .delete()
            .eq('id', id)

        if (deleteError) throw deleteError

        if (asset.type === 'file' && asset.url) {
            const pathPart = asset.url.split('/team-assets/')[1]
            if (pathPart) {
                await admin.storage.from('team-assets').remove([pathPart])
            }
        }

        revalidatePath('/admin/assets')
        return { success: true }
    } catch (error) {
        console.error('Error deleting asset:', error)
        return { success: false, error: 'Failed to delete asset' }
    }
}
