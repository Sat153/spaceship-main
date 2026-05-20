'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { cookies } from 'next/headers'

const PROMPTS: Record<string, (clientName: string) => string> = {
    sfx: (c) => `You are a sound designer for video production. Generate 7 specific, creative sound effect suggestions for a "${c}" brand video. Return ONLY a numbered list (1. ... 2. ...). Each item max 12 words. Examples: "Cinematic whoosh for title reveal", "Subtle notification ping for CTA".`,
    music: (c) => `You are a music supervisor for video production. Generate 7 background music suggestions for a "${c}" brand video. Include mood, tempo, genre. Return ONLY a numbered list. Each item max 12 words. Examples: "Upbeat acoustic pop — energetic, 120BPM, motivational".`,
    templates: (c) => `You are a motion graphics designer. Generate 7 video template style suggestions for a "${c}" brand. Include visual style and use case. Return ONLY a numbered list. Each item max 12 words. Examples: "Clean minimal lower thirds — white text on dark bar".`,
    color_grades: (c) => `You are a colorist for video production. Generate 7 color grading suggestions for a "${c}" brand video. Include mood and look. Return ONLY a numbered list. Each item max 12 words. Examples: "Warm golden hour — lifted shadows, orange teal split".`,
    other: (c) => `You are a creative director for video production. Generate 7 miscellaneous creative ideas for a "${c}" brand video. Include transitions, effects, or concepts. Return ONLY a numbered list. Each item max 12 words.`,
}

export async function generateCreativeSuggestions(
    category: string,
    clientName: string
): Promise<{ data: string[]; error: string | null }> {
    try {
        const cookieStore = await cookies()
        const supabase = createClient(cookieStore)
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return { data: [], error: 'Unauthorized' }

        const promptFn = PROMPTS[category] || PROMPTS['other']
        const prompt = promptFn(clientName)

        const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || '')
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' })
        const result = await model.generateContent(prompt)
        const text = result.response.text().trim()

        // Parse numbered list into array
        const suggestions = text
            .split('\n')
            .map(l => l.replace(/^\d+\.\s*/, '').trim())
            .filter(l => l.length > 0)
            .slice(0, 7)

        return { data: suggestions, error: null }
    } catch (error: any) {
        return { data: [], error: error.message || 'Failed to generate suggestions' }
    }
}

export async function saveCreativeSuggestion(
    roomId: string,
    category: string,
    suggestion: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const cookieStore2 = await cookies()
        const supabase = createClient(cookieStore2)
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return { success: false, error: 'Unauthorized' }

        const admin = createAdminClient()
        await admin.from('creative_ai_history').insert({
            room_id: roomId,
            category,
            suggestion,
            used_by: user.id,
        })

        return { success: true }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}

export interface CreativeHistoryItem {
    id: string
    category: string
    suggestion: string
    used_at: string
    used_by_name?: string
}

export async function getCreativeHistory(
    roomId: string,
    category?: string
): Promise<{ data: CreativeHistoryItem[]; error: string | null }> {
    try {
        const admin = createAdminClient()

        let query = admin
            .from('creative_ai_history')
            .select('id, category, suggestion, used_at, used_by')
            .eq('room_id', roomId)
            .order('used_at', { ascending: false })
            .limit(30)

        if (category && category !== 'all') {
            query = query.eq('category', category)
        }

        const { data, error } = await query
        if (error) return { data: [], error: error.message }

        // Resolve user names
        const userIds = Array.from(new Set((data || []).map((h: any) => h.used_by).filter(Boolean)))
        let nameMap: Record<string, string> = {}
        if (userIds.length > 0) {
            const { data: profiles } = await admin
                .from('profiles')
                .select('id, first_name, last_name')
                .in('id', userIds)
            profiles?.forEach(p => { nameMap[p.id] = `${p.first_name || ''} ${p.last_name || ''}`.trim() })
        }

        return {
            data: (data || []).map(h => ({
                id: h.id,
                category: h.category,
                suggestion: h.suggestion,
                used_at: h.used_at,
                used_by_name: nameMap[h.used_by] || 'Unknown',
            })),
            error: null,
        }
    } catch (error: any) {
        return { data: [], error: error.message }
    }
}
