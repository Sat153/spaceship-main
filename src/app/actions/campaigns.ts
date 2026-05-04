'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export interface Campaign {
    id: string
    client_id: string
    name: string
    type: string
    description: string | null
    status: string
    folder_id: string | null
    created_by: string | null
    created_at: string
    updated_at: string
}

async function getCallerInfo() {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null
    const admin = createAdminClient()
    const { data: profile } = await admin.from('profiles').select('department_id, role').eq('id', user.id).single()
    return { user, profile }
}

async function getOrCreateFolder(admin: any, name: string, parentId: string | null, departmentId: string, userId: string, clientId?: string) {
    let query = admin.from('assets').select('id').eq('name', name).eq('type', 'folder').eq('department_id', departmentId)
    if (parentId) query = query.eq('parent_id', parentId)
    else query = query.is('parent_id', null)
    const { data: existing } = await query.maybeSingle()
    if (existing) return existing.id

    const { data: newFolder, error } = await admin.from('assets').insert({
        name, type: 'folder', parent_id: parentId,
        department_id: departmentId, created_by: userId,
        client_id: clientId || null,
    }).select('id').single()
    if (error) throw error
    return newFolder.id
}

export async function getCampaigns(clientId: string): Promise<{ data: Campaign[] | null; error: string | null }> {
    console.log('🔍 ACTION: getCampaigns')
    try {
        const admin = createAdminClient()
        const { data, error } = await admin.from('campaigns').select('*').eq('client_id', clientId).order('created_at', { ascending: false })
        if (error) return { data: null, error: error.message }
        return { data: data as Campaign[], error: null }
    } catch {
        return { data: null, error: 'Failed to fetch campaigns' }
    }
}

export async function createCampaign(
    clientId: string,
    name: string,
    type: string,
    description?: string
): Promise<{ data: Campaign | null; error: string | null }> {
    try {
        const info = await getCallerInfo()
        if (!info) return { data: null, error: 'Unauthorized' }
        const { user } = info

        const admin = createAdminClient()

        // Get client info
        const { data: client, error: clientErr } = await admin.from('clients').select('name, department_id').eq('id', clientId).single()
        if (clientErr || !client) return { data: null, error: 'Client not found' }

        // Build folder hierarchy: Clients → {ClientName} → {CampaignName}
        const clientsFolderId = await getOrCreateFolder(admin, 'Clients', null, client.department_id, user.id)
        const clientFolderId = await getOrCreateFolder(admin, client.name, clientsFolderId, client.department_id, user.id, clientId)
        const campaignFolderId = await getOrCreateFolder(admin, name, clientFolderId, client.department_id, user.id, clientId)

        // Create 3 sub-folders
        await getOrCreateFolder(admin, 'Images', campaignFolderId, client.department_id, user.id, clientId)
        await getOrCreateFolder(admin, 'Videos', campaignFolderId, client.department_id, user.id, clientId)
        await getOrCreateFolder(admin, 'Content', campaignFolderId, client.department_id, user.id, clientId)

        // Create campaign record
        const { data: campaign, error: campaignErr } = await admin.from('campaigns').insert({
            client_id: clientId,
            name,
            type,
            description: description || null,
            status: 'active',
            folder_id: campaignFolderId,
            created_by: user.id,
        }).select().single()

        if (campaignErr) return { data: null, error: campaignErr.message }

        revalidatePath('/admin')
        return { data: campaign as Campaign, error: null }
    } catch (err: any) {
        console.error('[createCampaign]', err)
        return { data: null, error: err.message || 'Failed to create campaign' }
    }
}

export async function updateCampaignStatus(
    campaignId: string,
    status: string
): Promise<{ success: boolean; error: string | null }> {
    try {
        const admin = createAdminClient()
        const { error } = await admin.from('campaigns').update({ status, updated_at: new Date().toISOString() }).eq('id', campaignId)
        if (error) return { success: false, error: error.message }
        revalidatePath('/admin')
        return { success: true, error: null }
    } catch {
        return { success: false, error: 'Failed to update campaign' }
    }
}

export async function deleteCampaign(campaignId: string): Promise<{ success: boolean; error: string | null }> {
    try {
        const admin = createAdminClient()
        const { error } = await admin.from('campaigns').delete().eq('id', campaignId)
        if (error) return { success: false, error: error.message }
        revalidatePath('/admin')
        return { success: true, error: null }
    } catch {
        return { success: false, error: 'Failed to delete campaign' }
    }
}

export async function getCampaignFolders(campaignFolderId: string): Promise<{
    images: string | null; videos: string | null; content: string | null
}> {
    try {
        const admin = createAdminClient()
        const { data } = await admin.from('assets').select('id, name').eq('parent_id', campaignFolderId).eq('type', 'folder')
        const find = (n: string) => data?.find((f: any) => f.name === n)?.id ?? null
        return { images: find('Images'), videos: find('Videos'), content: find('Content') }
    } catch {
        return { images: null, videos: null, content: null }
    }
}
