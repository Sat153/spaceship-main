import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

function twimlResponse(message: string) {
    return new NextResponse(
        `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${message}</Message></Response>`,
        { headers: { 'Content-Type': 'text/xml' } }
    )
}

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData()
        const from = formData.get('From') as string   // whatsapp:+916377353765
        const body = (formData.get('Body') as string || '').trim()

        const phone = from?.replace('whatsapp:', '')

        if (!phone || !body) return twimlResponse('Invalid request.')

        const reply = body.toLowerCase().replace(/\s+/g, '')

        if (reply !== '1' && reply !== '2') {
            return twimlResponse(
                `ANYA SEGEN CRM\n\nReply *1* to ✅ Approve\nReply *2* to ❌ Reject / Request Changes\n\nAny other message will be ignored.`
            )
        }

        const admin = createAdminClient()

        // Find the most recent unused token for this phone
        const { data: token, error } = await admin
            .from('approval_tokens')
            .select('id, post_id, grid_plan_id, expires_at, used_at')
            .eq('recipient_phone', phone)
            .is('used_at', null)
            .order('created_at', { ascending: false })
            .limit(1)
            .single()

        if (error || !token) {
            return twimlResponse('No pending approval found for your number.')
        }

        if (new Date(token.expires_at) < new Date()) {
            return twimlResponse('This approval request has expired. Please ask the team to resend.')
        }

        const now = new Date().toISOString()

        // ── Grid Plan approval ────────────────────────────────────────────────
        if (token.grid_plan_id) {
            const gridAction = reply === '1' ? 'approved' : 'changes_requested'

            await admin.from('approval_tokens').update({
                used_at: now,
                action_taken: gridAction,
            }).eq('id', token.id)

            await admin.from('grid_plans').update({
                status: gridAction,
                updated_at: now,
            }).eq('id', token.grid_plan_id)

            if (reply === '1') {
                return twimlResponse(
                    `✅ *GRID PLAN APPROVED*\n\nThe grid plan has been approved. The team will be notified.\n\n— ANYA SEGEN CRM`
                )
            } else {
                return twimlResponse(
                    `🔄 *CHANGES REQUESTED*\n\nThe team has been notified to make changes.\n\n— ANYA SEGEN CRM`
                )
            }
        }

        // ── Content Post approval ─────────────────────────────────────────────
        if (token.post_id) {
            const postAction = reply === '1' ? 'approved' : 'rejected'

            await admin.from('approval_tokens').update({
                used_at: now,
                action_taken: postAction,
            }).eq('id', token.id)

            await admin.from('content_posts').update({
                status: postAction,
                reviewed_at: now,
            }).eq('id', token.post_id)

            const emoji = reply === '1' ? '✅' : '❌'
            const label = reply === '1' ? 'APPROVED' : 'REJECTED'

            return twimlResponse(
                `${emoji} *${label}*\n\nThe content post has been ${label.toLowerCase()} successfully.\n\n— ANYA SEGEN CRM`
            )
        }

        return twimlResponse('Something went wrong — token has no associated item.')

    } catch (err) {
        console.error('[WhatsApp Webhook]', err)
        return twimlResponse('Something went wrong. Please try again.')
    }
}
