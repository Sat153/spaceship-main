'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { revalidateTag } from 'next/cache'

export interface Project {
  id: string
  name: string
  description?: string
  client_id?: string
  status: 'active' | 'completed' | 'on_hold'
  created_by?: string
  created_at: string
  clients?: { name: string } | null
}

export async function fetchProjects(): Promise<{ data: Project[] | null; error: string | null }> {
  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('projects')
      .select('*, clients(name)')
      .order('created_at', { ascending: false })

    if (error) return { data: null, error: error.message }
    return { data: data || [], error: null }
  } catch {
    return { data: null, error: 'Failed to fetch projects' }
  }
}

export async function createProject(payload: {
  name: string
  description?: string
  client_id?: string
  created_by: string
}): Promise<{ data: Project | null; error: string | null }> {
  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('projects')
      .insert([{ ...payload, status: 'active' }])
      .select('*, clients(name)')
      .single()

    if (error) return { data: null, error: error.message }
    revalidateTag('admin-projects')
    return { data, error: null }
  } catch {
    return { data: null, error: 'Failed to create project' }
  }
}

export async function updateProjectStatus(
  id: string,
  status: 'active' | 'completed' | 'on_hold'
): Promise<{ error: string | null }> {
  try {
    const supabase = createAdminClient()
    const { error } = await supabase.from('projects').update({ status }).eq('id', id)
    if (error) return { error: error.message }
    revalidateTag('admin-projects')
    return { error: null }
  } catch {
    return { error: 'Failed to update project' }
  }
}

export async function deleteProject(id: string): Promise<{ error: string | null }> {
  try {
    const supabase = createAdminClient()
    const { error } = await supabase.from('projects').delete().eq('id', id)
    if (error) return { error: error.message }
    revalidateTag('admin-projects')
    return { error: null }
  } catch {
    return { error: 'Failed to delete project' }
  }
}
