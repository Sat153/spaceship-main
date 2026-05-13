'use server'

import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { notifyAdmins, notifyClientUsers, notifyPRTeam } from './notifications'

async function getSupabase() {
    const cookieStore = await cookies()
    return createClient(cookieStore)
}

// Returns stage_order for a given stage_id
export async function getStageOrder(stageId: string): Promise<number | null> {
    try {
        const supabase = await getSupabase()
        const { data } = await supabase
            .from('workflow_stages')
            .select('stage_order')
            .eq('id', stageId)
            .single()
        return data?.stage_order ?? null
    } catch {
        return null
    }
}

export interface Approval {
    id: string
    client_id: string
    stage_id: string
    submitted_by: string
    reviewed_by: string | null
    status: 'pending' | 'approved' | 'changes_requested'
    notes: string | null
    created_at: string
    updated_at: string
}

// Get the latest approval for a client + stage
export async function getLatestApproval(clientId: string, stageId: string): Promise<{
    data: Approval | null
    error: string | null
}> {
    try {
        const supabase = await getSupabase()
        const { data, error } = await supabase
            .from('approvals')
            .select('*')
            .eq('client_id', clientId)
            .eq('stage_id', stageId)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle()

        if (error) return { data: null, error: error.message }
        return { data, error: null }
    } catch (err: any) {
        return { data: null, error: err?.message }
    }
}

// Admin submits content for client approval — creates/resets approval record
export async function submitForApproval(clientId: string, stageId: string): Promise<{
    data: Approval | null
    error: string | null
}> {
    try {
        const supabase = await getSupabase()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return { data: null, error: 'Unauthorized' }

        // Upsert: if pending already exists for this client+stage, reset it; otherwise create new
        const { data: existing } = await supabase
            .from('approvals')
            .select('id')
            .eq('client_id', clientId)
            .eq('stage_id', stageId)
            .eq('status', 'pending')
            .maybeSingle()

        if (existing) {
            // Already pending — just return it
            const { data } = await supabase.from('approvals').select('*').eq('id', existing.id).single()
            return { data, error: null }
        }

        const { data, error } = await supabase
            .from('approvals')
            .insert({
                client_id: clientId,
                stage_id: stageId,
                submitted_by: user.id,
                status: 'pending',
            })
            .select()
            .single()

        if (error) return { data: null, error: error.message }

        // Advance client workflow to stage 4
        const { data: stage4 } = await supabase
            .from('workflow_stages')
            .select('id')
            .eq('stage_order', 4)
            .single()

        if (stage4) {
            await supabase
                .from('client_workflows')
                .update({ current_stage_id: stage4.id, updated_at: new Date().toISOString() })
                .eq('client_id', clientId)
        }

        // Notify client users that content is ready for approval
        notifyClientUsers(clientId, 'Content ready for approval', 'New content has been submitted for your review.', 'approval_request').catch(() => {})

        return { data, error: null }
    } catch (err: any) {
        return { data: null, error: err?.message }
    }
}

// Client approves content
export async function approveContent(approvalId: string, notes?: string): Promise<{
    error: string | null
}> {
    try {
        const supabase = await getSupabase()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return { error: 'Unauthorized' }

        const { data: approval, error: fetchErr } = await supabase
            .from('approvals')
            .select('client_id')
            .eq('id', approvalId)
            .single()

        if (fetchErr || !approval) return { error: 'Approval not found' }

        await supabase
            .from('approvals')
            .update({ status: 'approved', reviewed_by: user.id, notes: notes || null, updated_at: new Date().toISOString() })
            .eq('id', approvalId)

        // Advance client workflow to stage 5
        const { data: stage5 } = await supabase
            .from('workflow_stages')
            .select('id')
            .eq('stage_order', 5)
            .single()

        if (stage5) {
            await supabase
                .from('client_workflows')
                .update({ current_stage_id: stage5.id, updated_at: new Date().toISOString() })
                .eq('client_id', approval.client_id)
        }

        // Notify admins that client approved content
        notifyAdmins('Content approved', 'Client has approved the content. Ready for posting.', 'approved').catch(() => {})

        return { error: null }
    } catch (err: any) {
        return { error: err?.message }
    }
}

// Client requests changes
export async function requestChanges(approvalId: string, notes: string): Promise<{
    error: string | null
}> {
    try {
        const supabase = await getSupabase()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return { error: 'Unauthorized' }

        const { data: approval, error: fetchErr } = await supabase
            .from('approvals')
            .select('client_id')
            .eq('id', approvalId)
            .single()

        if (fetchErr || !approval) return { error: 'Approval not found' }

        await supabase
            .from('approvals')
            .update({ status: 'changes_requested', reviewed_by: user.id, notes, updated_at: new Date().toISOString() })
            .eq('id', approvalId)

        // Move client workflow back to stage 3
        const { data: stage3 } = await supabase
            .from('workflow_stages')
            .select('id')
            .eq('stage_order', 3)
            .single()

        if (stage3) {
            await supabase
                .from('client_workflows')
                .update({ current_stage_id: stage3.id, updated_at: new Date().toISOString() })
                .eq('client_id', approval.client_id)
        }

        // Notify admins that client requested changes
        notifyAdmins('Changes requested', `Client has requested changes${notes ? `: ${notes}` : '.'}`, 'changes_requested').catch(() => {})

        return { error: null }
    } catch (err: any) {
        return { error: err?.message }
    }
}
