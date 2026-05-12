import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Dynamically fetches the ID of the 'Admin' department.
 * This replaces hardcoded IDs to ensure the app works even if the DB is reset.
 */
export async function getAdminDepartmentId(): Promise<string | null> {
    try {
        const supabase = createAdminClient()

        const { data, error } = await supabase
            .from('departments')
            .select('id')
            .eq('name', 'Administration')
            .single()

        if (error || !data) {
            console.error('Error fetching Admin Department ID:', error)
            return null
        }

        return data.id
    } catch (error) {
        console.error('Unexpected error fetching Admin Department ID:', error)
        return null
    }
}
