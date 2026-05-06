'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { sendApprovalWhatsApp, getWhatsAppNumber } from '@/lib/whatsapp'
import { revalidateTag } from 'next/cache'

export async function sendApprovalRequest(postId: string): Promise<{ success: boolean; error: string | null }> {
  try {
    const supabase = createAdminClient()

    const { data: post, error: postError } = await supabase
      .from('content_posts')
      .select('id, title, body, status, platforms, priority, client_id, created_by, clients:client_id(name)')
      .eq('id', postId)
      .single()

    if (postError || !post) return { success: false, error: 'Post not found' }
    if (!['pending_review', 'approved'].includes(post.status)) return { success: false, error: 'Post must be in Pending Review or Approved status' }

    // Invalidate any unused tokens for this post
    await supabase.from('approval_tokens').delete().eq('post_id', postId).is('used_at', null)

    // Insert a fresh token with a 30-minute reminder deadline
    const reminderDeadline = new Date(Date.now() + 30 * 60 * 1000).toISOString()
    const recipientPhone = await getWhatsAppNumber()
    const { data: tokenRow, error: tokenError } = await supabase
      .from('approval_tokens')
      .insert({ post_id: postId, reminder_deadline: reminderDeadline, recipient_phone: recipientPhone })
      .select('token')
      .single()

    if (tokenError || !tokenRow) return { success: false, error: tokenError?.message || 'Failed to create token' }

    // Move post to awaiting_approval
    await supabase.from('content_posts').update({ status: 'awaiting_approval' }).eq('id', postId)

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const approvalUrl = `${baseUrl}/approve/${tokenRow.token}`

    // Always log the URL so you can test directly from terminal
    console.log('\n🔗 APPROVAL LINK (open this to test):', approvalUrl, '\n')

    // Fetch creator name
    let createdByName = 'Team'
    if (post.created_by) {
      const { data: creator } = await supabase
        .from('profiles')
        .select('first_name, last_name')
        .eq('id', post.created_by)
        .single()
      if (creator) createdByName = [creator.first_name, creator.last_name].filter(Boolean).join(' ')
    }

    const waResult = await sendApprovalWhatsApp({
      postTitle: post.title || 'Untitled Post',
      clientName: (post.clients as any)?.name || 'Unknown Client',
      platforms: post.platforms || [],
      body: post.body || '',
      priority: post.priority || 'normal',
      createdBy: createdByName,
    })
    if (waResult.error) {
      console.error('[Approval] WhatsApp send failed:', waResult.error)
    }

    revalidateTag('content-posts')
    return { success: true, error: null }
  } catch (err) {
    console.error('[sendApprovalRequest]', err)
    return { success: false, error: 'Failed to send approval request' }
  }
}

export async function processApproval(
  token: string,
  action: 'approved' | 'rejected',
  note?: string
): Promise<{ success: boolean; error: string | null }> {
  try {
    const supabase = createAdminClient()

    const { data: tokenData, error: tokenError } = await supabase
      .from('approval_tokens')
      .select('id, post_id, expires_at, used_at')
      .eq('token', token)
      .single()

    if (tokenError || !tokenData) return { success: false, error: 'Invalid or expired link' }
    if (tokenData.used_at) return { success: false, error: 'This link has already been used' }
    if (new Date(tokenData.expires_at) < new Date()) return { success: false, error: 'This approval link has expired' }

    await supabase
      .from('approval_tokens')
      .update({ used_at: new Date().toISOString(), action_taken: action, rejection_note: note || null })
      .eq('id', tokenData.id)

    await supabase
      .from('content_posts')
      .update({
        status: action === 'approved' ? 'approved' : 'rejected',
        reviewed_at: new Date().toISOString(),
        review_notes: note || null,
      })
      .eq('id', tokenData.post_id)

    revalidateTag('content-posts')
    return { success: true, error: null }
  } catch (err) {
    console.error('[processApproval]', err)
    return { success: false, error: 'Failed to process decision' }
  }
}

export async function getApprovalPageData(token: string) {
  try {
    const supabase = createAdminClient()

    const { data: tokenData, error } = await supabase
      .from('approval_tokens')
      .select('id, expires_at, used_at, action_taken, post_id')
      .eq('token', token)
      .single()

    if (error || !tokenData) return { data: null, error: 'Invalid link' }

    const { data: post } = await supabase
      .from('content_posts')
      .select('id, title, body, platforms, status, created_at, clients:client_id(name)')
      .eq('id', tokenData.post_id)
      .single()

    return {
      data: {
        token,
        expires_at: tokenData.expires_at,
        used_at: tokenData.used_at,
        action_taken: tokenData.action_taken,
        post,
      },
      error: null,
    }
  } catch (err) {
    return { data: null, error: 'Failed to load approval data' }
  }
}
