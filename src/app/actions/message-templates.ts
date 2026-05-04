'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'

export interface MessageTemplate {
    id: string
    title: string
    body_hindi: string | null
    body_english: string
    category: 'kisan' | 'women' | 'development' | 'general' | 'crisis' | 'event'
    tags: string[]
    created_by: string | null
    created_at: string
    updated_at: string
}

export interface CreateTemplateData {
    title: string
    body_hindi?: string
    body_english: string
    category: MessageTemplate['category']
    tags?: string[]
}

async function getUser() {
    const supabase = createClient(await cookies())
    const { data: { user } } = await supabase.auth.getUser()
    return user
}

export async function getMessageTemplates(category?: string): Promise<{ data: MessageTemplate[] | null; error: string | null }> {
    try {
        const admin = createAdminClient()
        let query = admin.from('message_templates').select('*').order('created_at', { ascending: false })
        if (category && category !== 'all') query = query.eq('category', category)
        const { data, error } = await query
        if (error) return { data: null, error: error.message }
        return { data: data as MessageTemplate[], error: null }
    } catch {
        return { data: null, error: 'Failed to fetch templates' }
    }
}

export async function createMessageTemplate(payload: CreateTemplateData): Promise<{ data: MessageTemplate | null; error: string | null }> {
    try {
        const user = await getUser()
        if (!user) return { data: null, error: 'Unauthorized' }
        const admin = createAdminClient()
        const { data, error } = await admin.from('message_templates').insert({
            ...payload,
            tags: payload.tags || [],
            created_by: user.id,
        }).select().single()
        if (error) return { data: null, error: error.message }
        revalidatePath('/admin')
        return { data: data as MessageTemplate, error: null }
    } catch {
        return { data: null, error: 'Failed to create template' }
    }
}

export async function updateMessageTemplate(id: string, payload: Partial<CreateTemplateData>): Promise<{ success: boolean; error: string | null }> {
    try {
        const user = await getUser()
        if (!user) return { success: false, error: 'Unauthorized' }
        const admin = createAdminClient()
        const { error } = await admin.from('message_templates').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', id)
        if (error) return { success: false, error: error.message }
        revalidatePath('/admin')
        return { success: true, error: null }
    } catch {
        return { success: false, error: 'Failed to update template' }
    }
}

export async function deleteMessageTemplate(id: string): Promise<{ success: boolean; error: string | null }> {
    try {
        const user = await getUser()
        if (!user) return { success: false, error: 'Unauthorized' }
        const admin = createAdminClient()
        const { error } = await admin.from('message_templates').delete().eq('id', id)
        if (error) return { success: false, error: error.message }
        revalidatePath('/admin')
        return { success: true, error: null }
    } catch {
        return { success: false, error: 'Failed to delete template' }
    }
}
