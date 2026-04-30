import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
    const botToken = process.env.TELEGRAM_BOT_TOKEN
    const secret = process.env.TELEGRAM_WEBHOOK_SECRET
    const appUrl = process.env.NEXT_PUBLIC_APP_URL

    if (!botToken || botToken === 'your_bot_token_here') {
        return NextResponse.json({ error: 'TELEGRAM_BOT_TOKEN not set' }, { status: 400 })
    }
    if (!appUrl) {
        return NextResponse.json({ error: 'NEXT_PUBLIC_APP_URL not set' }, { status: 400 })
    }

    const webhookUrl = `${appUrl}/api/telegram/webhook${secret ? `?secret=${secret}` : ''}`

    const res = await fetch(
        `https://api.telegram.org/bot${botToken}/setWebhook`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                url: webhookUrl,
                allowed_updates: ['message', 'channel_post'],
            }),
        }
    )

    const data = await res.json()

    if (data.ok) {
        return NextResponse.json({
            success: true,
            message: 'Webhook registered successfully',
            webhookUrl,
        })
    } else {
        return NextResponse.json({ success: false, error: data.description }, { status: 500 })
    }
}
