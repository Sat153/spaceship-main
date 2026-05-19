'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { cookies } from 'next/headers'
import { notifyAdmins } from './notifications'

// ============ TYPES ============

export interface ContentPost {
    id: string
    client_id: string
    created_by: string
    title: string | null
    body: string
    media_urls: string[] | null
    platforms: string[]
    scheduled_for: string | null
    is_scheduled: boolean
    status: 'draft' | 'pending_review' | 'awaiting_approval' | 'approved' | 'rejected' | 'published'
    reviewed_by: string | null
    reviewed_at: string | null
    review_notes: string | null
    ai_generated: boolean
    prompt_used: string | null
    priority: 'low' | 'normal' | 'high' | 'urgent'
    created_at: string
    updated_at: string
    // Joined data
    client_name?: string
    created_by_name?: string
    reviewed_by_name?: string
}

export interface CreateContentPostData {
    client_id: string
    title?: string
    body: string
    platforms: string[]
    scheduled_for?: string
    is_scheduled?: boolean
    ai_generated?: boolean
    prompt_used?: string
    priority?: 'low' | 'normal' | 'high' | 'urgent'
}

export interface UpdateContentPostData {
    title?: string
    body?: string
    platforms?: string[]
    scheduled_for?: string | null
    is_scheduled?: boolean
    status?: ContentPost['status']
    review_notes?: string
    priority?: ContentPost['priority']
}

// ============ HELPER ============

async function getSupabaseClient() {
    const cookieStore = await cookies()
    return createClient(cookieStore)
}

// ============ CRUD OPERATIONS ============

// Get all content posts (with optional filters)
export async function getContentPosts(filters?: {
    client_id?: string
    status?: ContentPost['status']
    created_by?: string
}): Promise<{
    data: ContentPost[] | null
    error: string | null
}> {
    try {
        const supabase = await getSupabaseClient()

        const { data: { user }, error: userError } = await supabase.auth.getUser()
        if (userError || !user) {
            return { data: null, error: 'Unauthorized' }
        }

        let query = supabase
            .from('content_posts')
            .select(`
                *,
                clients:client_id (name)
            `)
            .order('created_at', { ascending: false })

        if (filters?.client_id) {
            query = query.eq('client_id', filters.client_id)
        }
        if (filters?.status) {
            query = query.eq('status', filters.status)
        }
        if (filters?.created_by) {
            query = query.eq('created_by', filters.created_by)
        }

        const { data, error } = await query.limit(100)

        if (error) {
            console.error('Error fetching content posts:', error)
            return { data: null, error: error.message }
        }

        // Fetch creator names separately from profiles table
        const creatorIds = Array.from(new Set((data || []).map((p: any) => p.created_by).filter(Boolean)))
        const reviewerIds = Array.from(new Set((data || []).map((p: any) => p.reviewed_by).filter(Boolean)))
        const allUserIds = Array.from(new Set([...creatorIds, ...reviewerIds]))

        let userNames: Record<string, string> = {}
        if (allUserIds.length > 0) {
            const { data: profiles } = await supabase
                .from('profiles')
                .select('id, first_name, last_name')
                .in('id', allUserIds)

            if (profiles) {
                profiles.forEach((p: any) => {
                    userNames[p.id] = `${p.first_name} ${p.last_name}`
                })
            }
        }

        // Map to include joined names
        const posts: ContentPost[] = (data || []).map((post: any) => ({
            ...post,
            client_name: post.clients?.name,
            created_by_name: userNames[post.created_by] || null,
            reviewed_by_name: post.reviewed_by ? userNames[post.reviewed_by] || null : null,
        }))

        return { data: posts, error: null }
    } catch (error) {
        console.error('Error in getContentPosts:', error)
        return { data: null, error: 'Failed to fetch content posts' }
    }
}

// Create a new content post
export async function createContentPost(data: CreateContentPostData): Promise<{
    data: ContentPost | null
    error: string | null
}> {
    try {
        const supabase = await getSupabaseClient()

        const { data: { user }, error: userError } = await supabase.auth.getUser()
        if (userError || !user) {
            return { data: null, error: 'Unauthorized' }
        }

        const { data: post, error } = await supabase
            .from('content_posts')
            .insert({
                client_id: data.client_id,
                created_by: user.id,
                title: data.title || null,
                body: data.body,
                platforms: data.platforms || [],
                scheduled_for: data.scheduled_for || null,
                is_scheduled: data.is_scheduled || false,
                status: 'draft',
                ai_generated: data.ai_generated || false,
                prompt_used: data.prompt_used || null,
                priority: data.priority || 'normal',
            })
            .select(`
                *,
                clients:client_id (name)
            `)
            .single()

        if (error) {
            console.error('Error creating content post:', error)
            return { data: null, error: error.message }
        }

        // Return with client_name properly set
        const postWithClientName = {
            ...post,
            client_name: (post as any).clients?.name || null
        }

        return { data: postWithClientName, error: null }
    } catch (error) {
        console.error('Error in createContentPost:', error)
        return { data: null, error: 'Failed to create content post' }
    }
}

// Update content post
export async function updateContentPost(id: string, data: UpdateContentPostData): Promise<{
    success: boolean
    error: string | null
}> {
    try {
        const supabase = await getSupabaseClient()

        const { data: { user }, error: userError } = await supabase.auth.getUser()
        if (userError || !user) {
            return { success: false, error: 'Unauthorized' }
        }

        const updateData: any = {
            ...data,
            updated_at: new Date().toISOString()
        }

        // If status is changing to approved/rejected, set reviewer info
        if (data.status === 'approved' || data.status === 'rejected') {
            updateData.reviewed_by = user.id
            updateData.reviewed_at = new Date().toISOString()
        }

        const { error } = await supabase
            .from('content_posts')
            .update(updateData)
            .eq('id', id)

        if (error) {
            console.error('Error updating content post:', error)
            return { success: false, error: error.message }
        }

        return { success: true, error: null }
    } catch (error) {
        console.error('Error in updateContentPost:', error)
        return { success: false, error: 'Failed to update content post' }
    }
}

// Submit for review
export async function submitForReview(id: string): Promise<{
    success: boolean
    error: string | null
}> {
    try {
        const supabase = await getSupabaseClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return { success: false, error: 'Unauthorized' }

        const result = await updateContentPost(id, { status: 'pending_review' })
        if (!result.success) return result

        const admin = createAdminClient()
        const { data: post } = await admin
            .from('content_posts')
            .select('title, body, client_id, platforms')
            .eq('id', id)
            .single()

        if (post?.client_id) {
            const platforms = post.platforms?.join(', ') || ''
            const preview = post.body?.slice(0, 150) + (post.body?.length > 150 ? '…' : '')
            const msg = `📋 *Content Submitted for Review*\n\n📌 ${post.title || 'Untitled Post'}${platforms ? `\n📱 ${platforms}` : ''}\n\n${preview}\n\n— Pending internal review`
            await postToWorkflowRoom(user.id, post.client_id, 3, msg)
            notifyAdmins(
                '📋 New content submitted for review',
                `"${post.title || 'Untitled Post'}" is ready for internal review.`,
                'info'
            ).catch(() => {})
        }

        return result
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}

// Post a system message to a workflow stage chat room (non-critical)
async function postToWorkflowRoom(
    userId: string,
    clientId: string,
    stageOrder: number,
    message: string
) {
    try {
        const admin = createAdminClient()
        const { data: stage } = await admin
            .from('workflow_stages')
            .select('id')
            .eq('stage_order', stageOrder)
            .single()
        if (!stage) return

        const { data: room } = await admin
            .from('chat_rooms')
            .select('id')
            .eq('client_id', clientId)
            .eq('stage_id', stage.id)
            .single()
        if (!room) return

        await admin.from('chat_messages').insert({
            room_id: room.id,
            sender_id: userId,
            message,
        })
    } catch {
        // non-critical — don't block the operation
    }
}

// Approve content post
// stageOrder: 3 = Internal Review (AnySegen admin), 4 = Final Approval (Akhilesh Ji)
export async function approveContentPost(id: string, notes?: string, stageOrder = 3): Promise<{
    success: boolean
    error: string | null
}> {
    try {
        const supabase = await getSupabaseClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return { success: false, error: 'Unauthorized' }

        const result = await updateContentPost(id, { status: 'approved', review_notes: notes })
        if (!result.success) return result

        const admin = createAdminClient()
        const { data: post } = await admin
            .from('content_posts')
            .select('title, body, client_id, platforms')
            .eq('id', id)
            .single()

        if (post?.client_id) {
            const platforms = post.platforms?.join(', ') || ''
            const preview = post.body?.slice(0, 200) + (post.body?.length > 200 ? '…' : '')
            const suffix = stageOrder === 3 ? '\n\n— Ready for Akhilesh Ji\'s final approval' : '\n\n— Approved by Akhilesh Ji ✓'
            const msg = `✅ *Content Approved*\n\n📌 ${post.title || 'Untitled Post'}${platforms ? `\n📱 ${platforms}` : ''}\n\n${preview}${suffix}`
            await postToWorkflowRoom(user.id, post.client_id, stageOrder, msg)
            if (stageOrder === 4) {
                notifyAdmins(
                    '✅ Akhilesh Ji approved content',
                    `"${post.title || 'Untitled Post'}" has been approved and is ready for posting.`,
                    'approved'
                ).catch(() => {})
            }
        }

        return result
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}

// Reject content post
// stageOrder: 3 = Internal Review (AnySegen admin), 4 = Final Approval (Akhilesh Ji)
export async function rejectContentPost(id: string, notes: string, stageOrder = 3): Promise<{
    success: boolean
    error: string | null
}> {
    try {
        const supabase = await getSupabaseClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return { success: false, error: 'Unauthorized' }

        const result = await updateContentPost(id, { status: 'rejected', review_notes: notes })
        if (!result.success) return result

        const admin = createAdminClient()
        const { data: post } = await admin
            .from('content_posts')
            .select('title, body, client_id, platforms')
            .eq('id', id)
            .single()

        if (post?.client_id) {
            const sender = stageOrder === 4 ? 'Akhilesh Ji' : 'Internal Reviewer'
            const msg = `🔄 *Changes Requested*\n\n📌 ${post.title || 'Untitled Post'}\n\n📝 ${notes}\n\n— ${sender}`
            await postToWorkflowRoom(user.id, post.client_id, stageOrder, msg)
            if (stageOrder === 4) {
                notifyAdmins(
                    '🔄 Akhilesh Ji requested changes',
                    `"${post.title || 'Untitled Post'}" needs revision: ${notes}`,
                    'changes_requested'
                ).catch(() => {})
            }
        }

        return result
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}

// Delete content post
export async function deleteContentPost(id: string): Promise<{
    success: boolean
    error: string | null
}> {
    try {
        const supabase = await getSupabaseClient()

        const { data: { user }, error: userError } = await supabase.auth.getUser()
        if (userError || !user) {
            return { success: false, error: 'Unauthorized' }
        }

        const { error } = await supabase
            .from('content_posts')
            .delete()
            .eq('id', id)

        if (error) {
            console.error('Error deleting content post:', error)
            return { success: false, error: error.message }
        }

        return { success: true, error: null }
    } catch (error) {
        console.error('Error in deleteContentPost:', error)
        return { success: false, error: 'Failed to delete content post' }
    }
}

// Get pending posts for approval (for managers/admins)
export async function getPendingApprovals(): Promise<{
    data: ContentPost[] | null
    error: string | null
}> {
    try {
        const admin = createAdminClient()
        const { data, error } = await admin
            .from('content_posts')
            .select('*, clients:client_id (name)')
            .in('status', ['pending_review', 'awaiting_approval'])
            .order('created_at', { ascending: false })

        if (error) return { data: null, error: error.message }

        const posts = (data || []).map((p: any) => ({
            ...p,
            client_name: p.clients?.name ?? null,
            clients: undefined,
        })) as ContentPost[]

        return { data: posts, error: null }
    } catch (e: any) {
        return { data: null, error: e.message }
    }
}

// Get scheduled posts for today (for notifications)
export async function getScheduledPostsForToday(): Promise<{
    data: ContentPost[] | null
    error: string | null
}> {
    try {
        const supabase = await getSupabaseClient()

        const { data: { user }, error: userError } = await supabase.auth.getUser()
        if (userError || !user) {
            return { data: null, error: 'Unauthorized' }
        }

        const today = new Date()
        const startOfDay = new Date(today.setHours(0, 0, 0, 0)).toISOString()
        const endOfDay = new Date(today.setHours(23, 59, 59, 999)).toISOString()

        const { data, error } = await supabase
            .from('content_posts')
            .select(`
                *,
                clients:client_id (name)
            `)
            .eq('is_scheduled', true)
            .eq('status', 'approved')
            .gte('scheduled_for', startOfDay)
            .lte('scheduled_for', endOfDay)
            .order('scheduled_for', { ascending: true })

        if (error) {
            console.error('Error fetching scheduled posts:', error)
            return { data: null, error: error.message }
        }

        const posts: ContentPost[] = (data || []).map((post: any) => ({
            ...post,
            client_name: post.clients?.name,
        }))

        return { data: posts, error: null }
    } catch (error) {
        console.error('Error in getScheduledPostsForToday:', error)
        return { data: null, error: 'Failed to fetch scheduled posts' }
    }
}

// Get clients list for content creator dropdown
export async function getClientsForContent(): Promise<{
    data: { id: string; name: string }[] | null
    error: string | null
}> {
    try {
        const supabase = await getSupabaseClient()
        const admin = createAdminClient()

        const { data: { user }, error: userError } = await supabase.auth.getUser()
        if (userError || !user) {
            return { data: null, error: 'Unauthorized' }
        }

        // Check if user is admin
        const { data: profile } = await admin
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()

        if (profile?.role === 'admin') {
            // Admins see all clients
            const { data, error } = await admin
                .from('clients')
                .select('id, name')
                .order('name')
            if (error) return { data: null, error: error.message }
            return { data: data || [], error: null }
        }

        // Non-admins (Akhilesh Ji, PR dept users) see only clients shared with them
        const { data: shares } = await admin
            .from('client_shares')
            .select('client_id')
            .eq('shared_with_user_id', user.id)

        if (!shares || shares.length === 0) return { data: [], error: null }

        const clientIds = shares.map(s => s.client_id)
        const { data, error } = await admin
            .from('clients')
            .select('id, name')
            .in('id', clientIds)
            .order('name')

        if (error) return { data: null, error: error.message }
        return { data: data || [], error: null }
    } catch (error) {
        console.error('Error in getClientsForContent:', error)
        return { data: null, error: 'Failed to fetch clients' }
    }
}
