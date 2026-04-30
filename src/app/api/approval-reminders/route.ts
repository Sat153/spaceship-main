import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendApprovalReminderEmail } from '@/lib/email'

// Called by Vercel Cron every 5 minutes
export async function GET(req: NextRequest) {
    const secret = req.headers.get('x-cron-secret') || req.nextUrl.searchParams.get('secret')
    if (secret !== process.env.CRON_SECRET) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const admin = createAdminClient()
    const now = new Date()

    // Fetch all pending tokens that have a reminder deadline set and haven't been actioned
    const { data: tokens, error } = await admin
        .from('approval_tokens')
        .select('id, token, post_id, reminder_deadline, reminder_10min_sent_at, reminder_5min_sent_at')
        .is('used_at', null)
        .not('reminder_deadline', 'is', null)
        .gt('reminder_deadline', now.toISOString()) // deadline hasn't passed yet

    if (error) {
        console.error('[Reminders] Failed to fetch tokens:', error)
        return NextResponse.json({ error: 'DB error' }, { status: 500 })
    }

    if (!tokens || tokens.length === 0) {
        return NextResponse.json({ sent: 0, message: 'No pending approvals' })
    }

    const akhileshEmail = process.env.AKHILESH_EMAIL
    if (!akhileshEmail) {
        return NextResponse.json({ error: 'AKHILESH_EMAIL not set' }, { status: 500 })
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    let sent = 0

    for (const token of tokens) {
        const deadline = new Date(token.reminder_deadline)
        const msLeft = deadline.getTime() - now.getTime()
        const minutesLeft = Math.floor(msLeft / 60000)

        // Fetch post details for email
        const { data: post } = await admin
            .from('content_posts')
            .select('title, clients:client_id(name)')
            .eq('id', token.post_id)
            .single()

        if (!post) continue

        const postTitle = post.title || 'Untitled Post'
        const clientName = (post.clients as any)?.name || 'Unknown Client'
        const approvalUrl = `${baseUrl}/approve/${token.token}`

        // 10-minute reminder: between 10 and 15 minutes left, not yet sent
        if (minutesLeft <= 10 && minutesLeft > 5 && !token.reminder_10min_sent_at) {
            await sendApprovalReminderEmail({ toEmail: akhileshEmail, postTitle, clientName, approvalUrl, minutesLeft })
            await admin.from('approval_tokens').update({ reminder_10min_sent_at: now.toISOString() }).eq('id', token.id)
            console.log(`[Reminders] 10-min reminder sent for token ${token.id}`)
            sent++
        }

        // 5-minute reminder: 5 minutes or less left, not yet sent
        if (minutesLeft <= 5 && !token.reminder_5min_sent_at) {
            await sendApprovalReminderEmail({ toEmail: akhileshEmail, postTitle, clientName, approvalUrl, minutesLeft })
            await admin.from('approval_tokens').update({ reminder_5min_sent_at: now.toISOString() }).eq('id', token.id)
            console.log(`[Reminders] 5-min reminder sent for token ${token.id}`)
            sent++
        }
    }

    return NextResponse.json({ sent, checked: tokens.length })
}
