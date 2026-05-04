'use server'

import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

// ============ TYPES ============

export interface ClientDemographics {
    id: string
    client_id: string

    // Location & State Context
    constituency_name: string | null
    state: string | null
    region: string | null

    // Population
    total_population: number | null
    urban_percentage: number | null
    rural_percentage: number | null

    // Gender
    male_percentage: number | null
    female_percentage: number | null

    // Age Groups
    age_18_25: number | null
    age_26_35: number | null
    age_36_50: number | null
    age_51_65: number | null
    age_65_plus: number | null

    // Voter Data
    total_voters: number | null
    voter_turnout_percentage: number | null

    // Economic & Education
    literacy_rate: number | null
    primary_languages: string[] | null

    // Context for AI
    top_issues: string[] | null
    local_industries: string[] | null

    // Cultural
    major_festivals: string[] | null
    cultural_notes: string | null

    // Metadata
    data_source: string | null
    last_updated_at: string
    created_at: string
}

export interface UpsertDemographicsData {
    constituency_name?: string
    state?: string
    region?: string
    total_population?: number
    urban_percentage?: number
    rural_percentage?: number
    male_percentage?: number
    female_percentage?: number
    age_18_25?: number
    age_26_35?: number
    age_36_50?: number
    age_51_65?: number
    age_65_plus?: number
    total_voters?: number
    voter_turnout_percentage?: number
    literacy_rate?: number
    primary_languages?: string[]
    top_issues?: string[]
    local_industries?: string[]
    major_festivals?: string[]
    cultural_notes?: string
    data_source?: string
}

export interface ManifestoPriority {
    theme: string
    weight: number
}

// ============ HELPER ============

async function getSupabaseClient() {
    const cookieStore = await cookies()
    return createClient(cookieStore)
}

// ============ CRUD OPERATIONS ============

// Get demographics for a client
export async function getClientDemographics(clientId: string): Promise<{
    data: ClientDemographics | null
    error: string | null
}> {
    console.log('🔍 ACTION: getClientDemographics')
    try {
        const supabase = await getSupabaseClient()

        const { data: { user }, error: userError } = await supabase.auth.getUser()
        if (userError || !user) {
            return { data: null, error: 'Unauthorized' }
        }

        const { data, error } = await supabase
            .from('client_demographics')
            .select('*')
            .eq('client_id', clientId)
            .single()

        if (error && error.code !== 'PGRST116') { // PGRST116 = not found
            console.error('Error fetching demographics:', error)
            return { data: null, error: error.message }
        }

        return { data: data || null, error: null }
    } catch (error) {
        console.error('Error in getClientDemographics:', error)
        return { data: null, error: 'Failed to fetch demographics' }
    }
}

// Create or update demographics for a client
export async function upsertClientDemographics(
    clientId: string,
    data: UpsertDemographicsData
): Promise<{
    data: ClientDemographics | null
    error: string | null
}> {
    try {
        const supabase = await getSupabaseClient()

        const { data: { user }, error: userError } = await supabase.auth.getUser()
        if (userError || !user) {
            return { data: null, error: 'Unauthorized' }
        }

        const { data: result, error } = await supabase
            .from('client_demographics')
            .upsert({
                client_id: clientId,
                ...data,
                last_updated_at: new Date().toISOString()
            }, { onConflict: 'client_id' })
            .select()
            .single()

        if (error) {
            console.error('Error upserting demographics:', error)
            return { data: null, error: error.message }
        }

        return { data: result, error: null }
    } catch (error) {
        console.error('Error in upsertClientDemographics:', error)
        return { data: null, error: 'Failed to save demographics' }
    }
}

// Delete demographics for a client
export async function deleteClientDemographics(clientId: string): Promise<{
    success: boolean
    error: string | null
}> {
    try {
        const supabase = await getSupabaseClient()

        const { data: { user }, error: userError } = await supabase.auth.getUser()
        if (userError || !user) {
            return { success: false, error: 'Unauthorized' }
        }

        const { error } = await supabase
            .from('client_demographics')
            .delete()
            .eq('client_id', clientId)

        if (error) {
            console.error('Error deleting demographics:', error)
            return { success: false, error: error.message }
        }

        return { success: true, error: null }
    } catch (error) {
        console.error('Error in deleteClientDemographics:', error)
        return { success: false, error: 'Failed to delete demographics' }
    }
}

// ============ MANIFESTO PRIORITIES ============

// Get manifesto priorities for a client
export async function getManifestoPriorities(clientId: string): Promise<{
    data: ManifestoPriority[] | null
    error: string | null
}> {
    console.log('🔍 ACTION: getManifestoPriorities')
    try {
        const supabase = await getSupabaseClient()

        const { data: { user }, error: userError } = await supabase.auth.getUser()
        if (userError || !user) {
            return { data: null, error: 'Unauthorized' }
        }

        const { data, error } = await supabase
            .from('clients')
            .select('manifesto_priorities')
            .eq('id', clientId)
            .single()

        if (error) {
            console.error('Error fetching manifesto priorities:', error)
            return { data: null, error: error.message }
        }

        return { data: data?.manifesto_priorities || [], error: null }
    } catch (error) {
        console.error('Error in getManifestoPriorities:', error)
        return { data: null, error: 'Failed to fetch manifesto priorities' }
    }
}

// Update manifesto priorities for a client
export async function updateManifestoPriorities(
    clientId: string,
    priorities: ManifestoPriority[]
): Promise<{
    success: boolean
    error: string | null
}> {
    try {
        const supabase = await getSupabaseClient()

        const { data: { user }, error: userError } = await supabase.auth.getUser()
        if (userError || !user) {
            return { success: false, error: 'Unauthorized' }
        }

        // Validate total weight is 100 (if there are priorities)
        if (priorities.length > 0) {
            const totalWeight = priorities.reduce((sum, p) => sum + p.weight, 0)
            if (totalWeight !== 100) {
                return { success: false, error: `Total weight must be 100 (currently ${totalWeight})` }
            }
        }

        const { error } = await supabase
            .from('clients')
            .update({
                manifesto_priorities: priorities,
                updated_at: new Date().toISOString()
            })
            .eq('id', clientId)

        if (error) {
            console.error('Error updating manifesto priorities:', error)
            return { success: false, error: error.message }
        }

        return { success: true, error: null }
    } catch (error) {
        console.error('Error in updateManifestoPriorities:', error)
        return { success: false, error: 'Failed to update manifesto priorities' }
    }
}
