import twilio from 'twilio'
import { createAdminClient } from '@/lib/supabase/admin'

function getClient() {
    const sid = process.env.TWILIO_ACCOUNT_SID
    const token = process.env.TWILIO_AUTH_TOKEN
    if (!sid || !token) return null
    return twilio(sid, token)
}

export async function getWhatsAppNumber(): Promise<string | null> {
    try {
        const admin = createAdminClient()
        const { data } = await admin
            .from('system_settings')
            .select('value')
            .eq('key', 'akhilesh_whatsapp')
            .single()
        if (data?.value) return data.value
    } catch {}
    return process.env.AKHILESH_WHATSAPP || null
}

async function send(phone: string, from: string, body: string, mediaUrl?: string) {
    const client = getClient()
    if (!client) {
        console.warn('[WhatsApp] Twilio credentials not set — skipping')
        return { error: null }
    }
    try {
        const params: any = {
            from: `whatsapp:${from}`,
            to: `whatsapp:${phone}`,
            body,
        }
        if (mediaUrl) params.mediaUrl = [mediaUrl]
        await client.messages.create(params)
        console.log('[WhatsApp] Message sent to:', phone)
        return { error: null }
    } catch (err: any) {
        console.error('[WhatsApp] Send failed:', err?.message)
        return { error: err?.message || 'WhatsApp send failed' }
    }
}

// ─── Content Post Approval ───────────────────────────────────────────────────

export async function sendApprovalWhatsApp({
    postTitle,
    clientName,
    platforms,
    body: postBody,
    priority,
    createdBy,
    mediaUrl,
}: {
    postTitle: string
    clientName: string
    platforms: string[]
    body?: string
    priority?: string
    createdBy?: string
    mediaUrl?: string
}): Promise<{ success: boolean; phone: string | null; error: string | null }> {
    const phone = await getWhatsAppNumber()
    const from = process.env.TWILIO_WHATSAPP_NUMBER

    if (!phone || !from) {
        console.warn('[WhatsApp] Phone or sender number not set — skipping')
        return { success: false, phone: null, error: null }
    }

    const platformList = platforms.length > 0 ? platforms.join(', ') : 'Social Media'
    const priorityBadge = priority === 'urgent' ? '🚨 *URGENT*' : priority === 'high' ? '⚠️ *HIGH PRIORITY*' : ''
    const preview = postBody ? (postBody.length > 200 ? postBody.substring(0, 200) + '...' : postBody) : ''
    const mediaLabel = mediaUrl ? (mediaUrl.match(/\.(mp4|mov|avi)$/i) ? '🎥 *Video attached above*' : '📸 *Image attached above*') : ''

    const lines = [`🔔 *ANYA SEGEN — Approval Required*`, `─────────────────────────`]
    if (priorityBadge) lines.push(priorityBadge)
    lines.push(
        ``,
        `📌 *Post:* ${postTitle}`,
        `👤 *Client:* ${clientName}`,
        `📱 *Platforms:* ${platformList}`,
        `✍️ *Created by:* ${createdBy || 'Team'}`,
    )
    if (mediaLabel) lines.push(``, mediaLabel)
    if (preview) lines.push(``, `📝 *Caption:*`, preview)
    lines.push(
        ``,
        `─────────────────────────`,
        `Reply *1* to ✅ Approve`,
        `Reply *2* to ❌ Reject`,
    )

    const { error } = await send(phone, from, lines.join('\n'), mediaUrl)
    return { success: !error, phone, error }
}

// ─── Asset (Photo / Video) Approval ─────────────────────────────────────────

export async function sendAssetApprovalWhatsApp({
    assetName,
    assetType,
    clientName,
    uploadedBy,
    mediaUrl,
}: {
    assetName: string
    assetType: 'photo' | 'video'
    clientName?: string
    uploadedBy?: string
    mediaUrl: string
}): Promise<{ success: boolean; phone: string | null; error: string | null }> {
    const phone = await getWhatsAppNumber()
    const from = process.env.TWILIO_WHATSAPP_NUMBER

    if (!phone || !from) {
        console.warn('[WhatsApp] Phone or sender number not set — skipping')
        return { success: false, phone: null, error: null }
    }

    const typeLabel = assetType === 'video' ? '🎥 Video' : '📸 Photo'

    const lines = [
        `🔔 *ANYA SEGEN — ${typeLabel} Approval*`,
        `─────────────────────────`,
        ``,
        `📁 *File:* ${assetName}`,
    ]
    if (clientName) lines.push(`👤 *Client:* ${clientName}`)
    if (uploadedBy) lines.push(`✍️ *Uploaded by:* ${uploadedBy}`)
    lines.push(
        ``,
        `─────────────────────────`,
        `Reply *1* to ✅ Approve`,
        `Reply *2* to ❌ Reject`,
    )

    const { error } = await send(phone, from, lines.join('\n'), mediaUrl)
    return { success: !error, phone, error }
}
