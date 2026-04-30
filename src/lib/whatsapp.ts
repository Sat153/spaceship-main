import twilio from 'twilio'

function getClient() {
    const sid = process.env.TWILIO_ACCOUNT_SID
    const token = process.env.TWILIO_AUTH_TOKEN
    if (!sid || !token) return null
    return twilio(sid, token)
}

export async function sendApprovalWhatsApp({
    postTitle,
    clientName,
    platforms,
    approvalUrl,
}: {
    postTitle: string
    clientName: string
    platforms: string[]
    approvalUrl: string
}): Promise<{ error: string | null }> {
    const phone = process.env.AKHILESH_WHATSAPP
    const from = process.env.TWILIO_WHATSAPP_NUMBER

    if (!phone || !from) {
        console.warn('[WhatsApp] AKHILESH_WHATSAPP or TWILIO_WHATSAPP_NUMBER not set — skipping')
        return { error: null }
    }

    const client = getClient()
    if (!client) {
        console.warn('[WhatsApp] Twilio credentials not set — skipping')
        return { error: null }
    }

    const platformList = platforms.length > 0 ? platforms.join(', ') : 'Social Media'
    const body = [
        `*Content Approval Required*`,
        ``,
        `*Post:* ${postTitle}`,
        `*Client:* ${clientName}`,
        `*Platforms:* ${platformList}`,
        ``,
        `Please review and approve:`,
        approvalUrl,
    ].join('\n')

    try {
        await client.messages.create({
            from: `whatsapp:${from}`,
            to: `whatsapp:${phone}`,
            body,
        })
        console.log('[WhatsApp] Message sent to:', phone)
        return { error: null }
    } catch (err: any) {
        console.error('[WhatsApp] Send failed:', err?.message)
        return { error: err?.message || 'WhatsApp send failed' }
    }
}
