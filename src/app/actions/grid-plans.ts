'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { revalidateTag } from 'next/cache'
import { getWhatsAppNumber } from '@/lib/whatsapp'

export type GridPlanStatus = 'draft' | 'sent_for_review' | 'approved' | 'changes_requested'

export interface GridPlanItem {
    id: string
    grid_plan_id: string
    asset_id: string | null
    asset_url: string | null
    asset_name: string | null
    platform: string
    position: number
    caption: string | null
    created_at: string
}

export interface GridPlan {
    id: string
    title: string
    status: GridPlanStatus
    client_id: string | null
    created_by: string | null
    notes: string | null
    created_at: string
    updated_at: string
    client_name?: string
    created_by_name?: string
    items?: GridPlanItem[]
}

async function getCallerId() {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)
    const { data: { user } } = await supabase.auth.getUser()
    return user?.id ?? null
}

export async function getGridPlans(): Promise<{ data: GridPlan[]; error: string | null }> {
    try {
        const admin = createAdminClient()
        const { data, error } = await admin
            .from('grid_plans')
            .select(`
                *,
                clients:client_id(name),
                profiles:created_by(first_name, last_name)
            `)
            .order('created_at', { ascending: false })

        if (error) return { data: [], error: error.message }

        const plans: GridPlan[] = (data || []).map((row: any) => ({
            ...row,
            client_name: row.clients?.name ?? null,
            created_by_name: row.profiles
                ? [row.profiles.first_name, row.profiles.last_name].filter(Boolean).join(' ')
                : null,
        }))

        return { data: plans, error: null }
    } catch {
        return { data: [], error: 'Failed to fetch grid plans' }
    }
}

export async function getGridPlanWithItems(planId: string): Promise<{ data: GridPlan | null; error: string | null }> {
    try {
        const admin = createAdminClient()
        const { data: plan, error } = await admin
            .from('grid_plans')
            .select(`*, clients:client_id(name), profiles:created_by(first_name, last_name)`)
            .eq('id', planId)
            .single()

        if (error || !plan) return { data: null, error: 'Plan not found' }

        const { data: items } = await admin
            .from('grid_plan_items')
            .select('*')
            .eq('grid_plan_id', planId)
            .order('position', { ascending: true })

        return {
            data: {
                ...plan,
                client_name: plan.clients?.name ?? null,
                created_by_name: plan.profiles
                    ? [plan.profiles.first_name, plan.profiles.last_name].filter(Boolean).join(' ')
                    : null,
                items: items ?? [],
            },
            error: null,
        }
    } catch {
        return { data: null, error: 'Failed to fetch grid plan' }
    }
}

export async function createGridPlan(
    title: string,
    clientId: string | null
): Promise<{ data: GridPlan | null; error: string | null }> {
    try {
        const admin = createAdminClient()
        const userId = await getCallerId()

        const { data, error } = await admin
            .from('grid_plans')
            .insert({ title, client_id: clientId || null, created_by: userId })
            .select()
            .single()

        if (error || !data) return { data: null, error: error?.message || 'Failed to create plan' }
        revalidateTag('grid-plans')
        return { data, error: null }
    } catch {
        return { data: null, error: 'Failed to create plan' }
    }
}

export async function updateGridPlan(
    planId: string,
    updates: { title?: string; client_id?: string | null; notes?: string; status?: GridPlanStatus }
): Promise<{ success: boolean; error: string | null }> {
    try {
        const admin = createAdminClient()
        const { error } = await admin
            .from('grid_plans')
            .update({ ...updates, updated_at: new Date().toISOString() })
            .eq('id', planId)

        if (error) return { success: false, error: error.message }
        revalidateTag('grid-plans')
        return { success: true, error: null }
    } catch {
        return { success: false, error: 'Failed to update plan' }
    }
}

export async function deleteGridPlan(planId: string): Promise<{ success: boolean; error: string | null }> {
    try {
        const admin = createAdminClient()
        const { error } = await admin.from('grid_plans').delete().eq('id', planId)
        if (error) return { success: false, error: error.message }
        revalidateTag('grid-plans')
        return { success: true, error: null }
    } catch {
        return { success: false, error: 'Failed to delete plan' }
    }
}

export async function upsertGridPlanItem(
    planId: string,
    platform: string,
    position: number,
    asset: { id: string; url: string | null; name: string } | null,
    caption?: string
): Promise<{ success: boolean; error: string | null }> {
    try {
        const admin = createAdminClient()

        if (!asset) {
            // Remove the slot
            await admin
                .from('grid_plan_items')
                .delete()
                .eq('grid_plan_id', planId)
                .eq('platform', platform)
                .eq('position', position)
            return { success: true, error: null }
        }

        // Check if slot exists
        const { data: existing } = await admin
            .from('grid_plan_items')
            .select('id')
            .eq('grid_plan_id', planId)
            .eq('platform', platform)
            .eq('position', position)
            .single()

        if (existing) {
            await admin
                .from('grid_plan_items')
                .update({ asset_id: asset.id, asset_url: asset.url, asset_name: asset.name, caption: caption ?? null })
                .eq('id', existing.id)
        } else {
            await admin
                .from('grid_plan_items')
                .insert({ grid_plan_id: planId, asset_id: asset.id, asset_url: asset.url, asset_name: asset.name, platform, position, caption: caption ?? null })
        }

        return { success: true, error: null }
    } catch {
        return { success: false, error: 'Failed to update slot' }
    }
}

export async function updateItemCaption(
    itemId: string,
    caption: string
): Promise<{ success: boolean; error: string | null }> {
    try {
        const admin = createAdminClient()
        const { error } = await admin.from('grid_plan_items').update({ caption }).eq('id', itemId)
        if (error) return { success: false, error: error.message }
        return { success: true, error: null }
    } catch {
        return { success: false, error: 'Failed to update caption' }
    }
}

export async function sendGridPlanForReview(planId: string): Promise<{ success: boolean; error: string | null }> {
    try {
        const admin = createAdminClient()

        const { data: plan } = await admin
            .from('grid_plans')
            .select(`*, clients:client_id(name), profiles:created_by(first_name, last_name)`)
            .eq('id', planId)
            .single()

        if (!plan) return { success: false, error: 'Plan not found' }

        const { data: items } = await admin
            .from('grid_plan_items')
            .select('*')
            .eq('grid_plan_id', planId)
            .order('platform')
            .order('position', { ascending: true })

        if (!items?.length) return { success: false, error: 'Add at least one asset before sending for review' }

        // Invalidate any unused tokens for this plan
        await admin.from('approval_tokens').delete().eq('grid_plan_id', planId).is('used_at', null)

        const reminderDeadline = new Date(Date.now() + 30 * 60 * 1000).toISOString()
        const recipientPhone = await getWhatsAppNumber()

        const { data: tokenRow, error: tokenError } = await admin
            .from('approval_tokens')
            .insert({ grid_plan_id: planId, reminder_deadline: reminderDeadline, recipient_phone: recipientPhone })
            .select('token')
            .single()

        if (tokenError || !tokenRow) return { success: false, error: tokenError?.message || 'Failed to create token' }

        await admin.from('grid_plans').update({ status: 'sent_for_review', updated_at: new Date().toISOString() }).eq('id', planId)

        // Build WhatsApp message
        const createdByName = plan.profiles
            ? [plan.profiles.first_name, plan.profiles.last_name].filter(Boolean).join(' ')
            : 'Team'
        const clientName = plan.clients?.name ?? 'Unknown Client'

        const byPlatform: Record<string, GridPlanItem[]> = {}
        for (const item of items) {
            if (!byPlatform[item.platform]) byPlatform[item.platform] = []
            byPlatform[item.platform].push(item)
        }

        const PLATFORM_EMOJI: Record<string, string> = {
            instagram: '📸 Instagram',
            facebook: '📘 Facebook',
            twitter: '𝕏 Twitter',
            linkedin: '💼 LinkedIn',
        }

        const NUM_EMOJI = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣']

        const lines = [
            `🗂️ *ANYA SEGEN — Grid Plan Review*`,
            `─────────────────────────`,
            ``,
            `📋 *Plan:* ${plan.title}`,
            `👤 *Client:* ${clientName}`,
            `✍️ *Prepared by:* ${createdByName}`,
            ``,
        ]

        for (const [platform, platformItems] of Object.entries(byPlatform)) {
            lines.push(`${PLATFORM_EMOJI[platform] ?? platform} *(${platformItems.length} post${platformItems.length > 1 ? 's' : ''})*`)
            platformItems.forEach((item, i) => {
                lines.push(`  ${NUM_EMOJI[i] ?? `${i + 1}.`} ${item.asset_name ?? 'Asset'}`)
                if (item.caption) lines.push(`     _${item.caption.substring(0, 80)}${item.caption.length > 80 ? '...' : ''}_`)
            })
            lines.push(``)
        }

        lines.push(
            `─────────────────────────`,
            `Reply *1* to ✅ Approve All`,
            `Reply *2* to ❌ Request Changes`,
        )

        const from = process.env.TWILIO_WHATSAPP_NUMBER
        if (recipientPhone && from) {
            const twilio = (await import('twilio')).default
            const client = twilio(process.env.TWILIO_ACCOUNT_SID!, process.env.TWILIO_AUTH_TOKEN!)
            try {
                await client.messages.create({
                    from: `whatsapp:${from}`,
                    to: `whatsapp:${recipientPhone}`,
                    body: lines.join('\n'),
                })
                console.log('[GridPlan] WhatsApp sent to:', recipientPhone)
            } catch (err: any) {
                console.error('[GridPlan] WhatsApp failed:', err?.message)
            }
        }

        revalidateTag('grid-plans')
        return { success: true, error: null }
    } catch (err) {
        console.error('[sendGridPlanForReview]', err)
        return { success: false, error: 'Failed to send for review' }
    }
}

export async function getAllMediaAssets(): Promise<{ data: any[]; error: string | null }> {
    try {
        const admin = createAdminClient()
        const { data, error } = await admin
            .from('assets')
            .select('id, name, url, mime_type, client_id, event_name')
            .eq('type', 'file')
            .not('url', 'is', null)
            .order('created_at', { ascending: false })
            .limit(200)

        if (error) return { data: [], error: error.message }
        return { data: data ?? [], error: null }
    } catch {
        return { data: [], error: 'Failed to fetch assets' }
    }
}
