'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { sendPhotoApprovalEmail } from '@/lib/email'
import { revalidatePath } from 'next/cache'

export async function sendPhotoApprovalRequest(photoId: string): Promise<{ success: boolean; error: string | null }> {
    try {
        const admin = createAdminClient()

        const { data: photo, error: photoError } = await admin
            .from('raw_photos')
            .select('id, photo_id, image_url, status, assignee:profiles(first_name, last_name), department:departments(name)')
            .eq('id', photoId)
            .single()

        if (photoError || !photo) return { success: false, error: 'Photo not found' }
        if (photo.status !== 'completed') return { success: false, error: 'Photo must be completed before sending for approval' }

        // Invalidate any unused tokens for this photo
        await admin.from('photo_approval_tokens').delete().eq('photo_id', photoId).is('used_at', null)

        // Create new token
        const { data: tokenRow, error: tokenError } = await admin
            .from('photo_approval_tokens')
            .insert({ photo_id: photoId })
            .select('token')
            .single()

        if (tokenError || !tokenRow) return { success: false, error: tokenError?.message || 'Failed to create token' }

        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
        const approvalUrl = `${baseUrl}/approve/photo/${tokenRow.token}`

        console.log('\n🔗 PHOTO APPROVAL LINK:', approvalUrl, '\n')

        const akhileshEmail = process.env.AKHILESH_EMAIL
        if (akhileshEmail) {
            const assignee = photo.assignee as any
            const department = photo.department as any
            await sendPhotoApprovalEmail({
                toEmail: akhileshEmail,
                photoId: photo.photo_id,
                imageUrl: photo.image_url,
                assigneeName: assignee ? `${assignee.first_name || ''} ${assignee.last_name || ''}`.trim() : 'Team',
                departmentName: department?.name || null,
                approvalUrl,
            })
        }

        revalidatePath('/admin')
        return { success: true, error: null }
    } catch (err) {
        console.error('[sendPhotoApprovalRequest]', err)
        return { success: false, error: 'Failed to send approval request' }
    }
}

export async function processPhotoApproval(
    token: string,
    action: 'approved' | 'rejected',
    note?: string
): Promise<{ success: boolean; error: string | null }> {
    try {
        const admin = createAdminClient()

        const { data: tokenData, error: tokenError } = await admin
            .from('photo_approval_tokens')
            .select('id, photo_id, expires_at, used_at')
            .eq('token', token)
            .single()

        if (tokenError || !tokenData) return { success: false, error: 'Invalid or expired link' }
        if (tokenData.used_at) return { success: false, error: 'This link has already been used' }
        if (new Date(tokenData.expires_at) < new Date()) return { success: false, error: 'This approval link has expired' }

        await admin
            .from('photo_approval_tokens')
            .update({ used_at: new Date().toISOString(), action_taken: action, rejection_note: note || null })
            .eq('id', tokenData.id)

        // Update photo status based on decision
        await admin
            .from('raw_photos')
            .update({ status: action === 'approved' ? 'completed' : 'rejected' })
            .eq('id', tokenData.photo_id)

        return { success: true, error: null }
    } catch (err) {
        console.error('[processPhotoApproval]', err)
        return { success: false, error: 'Failed to process decision' }
    }
}

export async function getPhotoApprovalPageData(token: string) {
    try {
        const admin = createAdminClient()

        const { data: tokenData, error } = await admin
            .from('photo_approval_tokens')
            .select('id, expires_at, used_at, action_taken, rejection_note, photo_id')
            .eq('token', token)
            .single()

        if (error || !tokenData) return { data: null, error: 'Invalid link' }

        const { data: photo } = await admin
            .from('raw_photos')
            .select('id, photo_id, image_url, status, assignee:profiles(first_name, last_name), department:departments(name)')
            .eq('id', tokenData.photo_id)
            .single()

        return {
            data: {
                token,
                expires_at: tokenData.expires_at,
                used_at: tokenData.used_at,
                action_taken: tokenData.action_taken,
                rejection_note: tokenData.rejection_note,
                photo,
            },
            error: null,
        }
    } catch (err) {
        return { data: null, error: 'Failed to load approval data' }
    }
}
