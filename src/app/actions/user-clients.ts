'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { cookies } from 'next/headers'

// ============ TYPES ============

export interface SharedClient {
    id: string
    share_id: string
    name: string
    email: string
    phone: string | null
    company: string | null
    status: string
    created_at: string
    shared_at: string
    shared_by_name: string
}

export interface ClientDetails {
    id: string
    name: string
    email: string
    phone: string | null
    company: string | null
    status: string
    notes: string | null
    ai_summary: string | null
    created_at: string
    department_name: string
}

export interface ClientAsset {
    id: string
    name: string
    url: string | null
    mime_type: string | null
    size: number
    created_at: string
    created_by_name: string
}

// ============ HELPER ============

async function getSupabaseClient() {
    const cookieStore = await cookies()
    return createClient(cookieStore)
}

// ============ SHARED CLIENTS ============

export async function getSharedClients(): Promise<{
    success: boolean;
    data?: SharedClient[];
    error?: string
}> {
    try {
        const supabase = await getSupabaseClient()

        // Get current user
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return { success: false, error: 'Unauthorized' }
        }

        // Use admin client so RLS on clients table doesn't block the join
        const admin = createAdminClient()
        const { data: shares, error: sharesError } = await admin
            .from('client_shares')
            .select(`
                id,
                created_at,
                clients:client_id (
                    id, name, primary_email, primary_phone, display_name, status, created_at
                ),
                sharer:shared_by_user_id (
                    id, first_name, last_name
                )
            `)
            .eq('shared_with_user_id', user.id)

        if (sharesError) {
            console.error('Error fetching shares:', sharesError)
            return { success: false, error: sharesError.message }
        }

        if (!shares || shares.length === 0) {
            return { success: true, data: [] }
        }

        // Map data from joined query
        const sharedClients: SharedClient[] = shares
            .filter(share => share.clients) // Filter out shares without valid client
            .map(share => {
                const client = share.clients as any
                const sharer = share.sharer as any

                return {
                    id: client?.id || '',
                    share_id: share.id,
                    name: client?.name || 'Unknown',
                    email: client?.primary_email || '',
                    phone: client?.primary_phone || null,
                    company: client?.display_name || null,
                    status: client?.status || 'unknown',
                    created_at: client?.created_at || '',
                    shared_at: share.created_at,
                    shared_by_name: sharer ? `${sharer.first_name} ${sharer.last_name}` : 'Unknown'
                }
            })

        return { success: true, data: sharedClients }
    } catch (error) {
        console.error('Error in getSharedClients:', error)
        return { success: false, error: 'Failed to fetch shared clients' }
    }

}

// ============ CLIENT DETAILS (View Only) ============

export async function getClientDetails(clientId: string): Promise<{
    success: boolean;
    data?: ClientDetails;
    error?: string
}> {
    try {
        const supabase = await getSupabaseClient()

        // Get current user
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return { success: false, error: 'Unauthorized' }
        }

        // Verify user has access to this client (is in client_shares)
        const admin = createAdminClient()
        const { data: share, error: shareError } = await admin
            .from('client_shares')
            .select('id')
            .eq('client_id', clientId)
            .eq('shared_with_user_id', user.id)
            .single()

        if (shareError || !share) {
            return { success: false, error: 'You do not have access to this client' }
        }

        const { data: client, error: clientError } = await admin
            .from('clients')
            .select(`
                id, name, primary_email, primary_phone, display_name, status,
                internal_notes, ai_summary, created_at, department_id
            `)
            .eq('id', clientId)
            .single()

        if (clientError || !client) {
            return { success: false, error: 'Client not found' }
        }

        // Get department name
        const { data: dept } = await admin
            .from('departments')
            .select('name')
            .eq('id', client.department_id)
            .single()

        return {
            success: true,
            data: {
                id: client.id,
                name: client.name,
                email: client.primary_email,
                phone: client.primary_phone,
                company: client.display_name,
                status: client.status,
                notes: client.internal_notes,
                ai_summary: client.ai_summary,
                created_at: client.created_at,
                department_name: dept?.name || 'Unknown'
            }
        }
    } catch (error) {
        console.error('Error in getClientDetails:', error)
        return { success: false, error: 'Failed to fetch client details' }
    }
}

// ============ CLIENT FILES/ASSETS ============

export async function getClientFiles(clientId: string): Promise<{
    success: boolean;
    data?: ClientAsset[];
    error?: string
}> {
    try {
        const supabase = await getSupabaseClient()

        // Get current user
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return { success: false, error: 'Unauthorized' }
        }

        // Verify user has access to this client
        const admin = createAdminClient()
        const { data: share } = await admin
            .from('client_shares')
            .select('id')
            .eq('client_id', clientId)
            .eq('shared_with_user_id', user.id)
            .single()

        if (!share) {
            return { success: false, error: 'You do not have access to this client\'s files' }
        }

        // Get assets for this client
        const { data: assets, error: assetsError } = await admin
            .from('assets')
            .select('id, name, url, mime_type, size, created_at, created_by')
            .eq('client_id', clientId)
            .eq('type', 'file')
            .order('created_at', { ascending: false })

        if (assetsError) {
            console.error('Error fetching assets:', assetsError)
            return { success: false, error: assetsError.message }
        }

        if (!assets || assets.length === 0) {
            return { success: true, data: [] }
        }

        // Get creator names
        const creatorIds = Array.from(new Set(assets.map(a => a.created_by).filter(Boolean)))
        const { data: creators } = await admin
            .from('profiles')
            .select('id, first_name, last_name')
            .in('id', creatorIds)

        const enrichedAssets: ClientAsset[] = assets.map(asset => {
            const creator = creators?.find(c => c.id === asset.created_by)
            return {
                id: asset.id,
                name: asset.name,
                url: asset.url,
                mime_type: asset.mime_type,
                size: asset.size,
                created_at: asset.created_at,
                created_by_name: creator ? `${creator.first_name} ${creator.last_name}` : 'Unknown'
            }
        })

        return { success: true, data: enrichedAssets }
    } catch (error) {
        console.error('Error in getClientFiles:', error)
        return { success: false, error: 'Failed to fetch client files' }
    }
}

// ============ GET CLIENT TEAM MEMBERS (for chat) ============

export async function getClientTeamMembers(clientId: string): Promise<{
    success: boolean;
    data?: Array<{ id: string; name: string; email: string }>;
    error?: string
}> {
    try {
        const supabase = await getSupabaseClient()

        // Get current user
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return { success: false, error: 'Unauthorized' }
        }

        // Get all users who have access to this client (excluding current user)
        const { data: shares, error: sharesError } = await supabase
            .from('client_shares')
            .select('shared_with_user_id')
            .eq('client_id', clientId)
            .neq('shared_with_user_id', user.id)

        if (sharesError) {
            return { success: false, error: sharesError.message }
        }

        if (!shares || shares.length === 0) {
            return { success: true, data: [] }
        }

        const userIds = shares.map(s => s.shared_with_user_id)

        const { data: profiles, error: profilesError } = await supabase
            .from('profiles')
            .select('id, first_name, last_name, email')
            .in('id', userIds)

        if (profilesError) {
            return { success: false, error: profilesError.message }
        }

        const teamMembers = profiles?.map(p => ({
            id: p.id,
            name: `${p.first_name} ${p.last_name}`,
            email: p.email
        })) || []

        return { success: true, data: teamMembers }
    } catch (error) {
        console.error('Error in getClientTeamMembers:', error)
        return { success: false, error: 'Failed to fetch team members' }
    }
}

// ============ GET CLIENT INTELLIGENCE (for employee view) ============

export interface ClientIntelligenceItem {
    id: string
    source_type: 'news' | 'twitter' | 'youtube' | 'manual'
    source_name: string | null
    source_url: string | null
    title: string
    content: string | null
    published_at: string | null
}

export async function getClientIntelligenceForUser(clientId: string): Promise<{
    success: boolean
    news?: ClientIntelligenceItem[]
    twitter?: ClientIntelligenceItem[]
    error?: string
}> {
    try {
        const supabase = await getSupabaseClient()

        // Get current user
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return { success: false, error: 'Unauthorized' }
        }

        // Verify user has access to this client
        const { data: share } = await supabase
            .from('client_shares')
            .select('id')
            .eq('client_id', clientId)
            .eq('shared_with_user_id', user.id)
            .single()

        if (!share) {
            return { success: false, error: 'You do not have access to this client' }
        }

        // Fetch verified intelligence
        const { data: intelligence, error: intelError } = await supabase
            .from('client_intelligence')
            .select('id, source_type, source_name, source_url, title, content, published_at')
            .eq('client_id', clientId)
            .eq('is_verified', true)
            .order('published_at', { ascending: false, nullsFirst: false })
            .limit(20)

        if (intelError) {
            console.error('Error fetching intelligence:', intelError)
            return { success: false, error: intelError.message }
        }

        // Separate by type
        const news = intelligence?.filter(i => i.source_type === 'news' || i.source_type === 'youtube') || []
        const twitter = intelligence?.filter(i => i.source_type === 'twitter') || []

        return { success: true, news, twitter }
    } catch (error) {
        console.error('Error in getClientIntelligenceForUser:', error)
        return { success: false, error: 'Failed to fetch intelligence' }
    }
}

