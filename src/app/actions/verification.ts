'use server'

import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export type VerificationStatus = 'verified' | 'in_review' | 'has_errors'

export interface VerifiablePost {
  id: string
  title: string | null
  body: string
  status: string
  platforms: string[]
  created_at: string
  verification_status: VerificationStatus | null
  verification_notes: string | null
  client_name: string | null
  created_by_name: string | null
}

export interface VerificationStats {
  total: number
  verified: number
  in_review: number
  has_errors: number
  unchecked: number
}

export async function getPostsForVerification(): Promise<{
  data: VerifiablePost[]
  stats: VerificationStats
  error: string | null
}> {
  const empty = { data: [], stats: { total: 0, verified: 0, in_review: 0, has_errors: 0, unchecked: 0 }, error: null }
  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    const { data, error } = await supabase
      .from('content_posts')
      .select('id, title, body, status, platforms, created_at, verification_status, verification_notes')
      .not('status', 'eq', 'draft')
      .order('created_at', { ascending: false })

    if (error) return { ...empty, error: error.message }

    const posts: VerifiablePost[] = (data ?? []).map((p: any) => ({
      id: p.id,
      title: p.title ?? null,
      body: p.body ?? '',
      status: p.status ?? '',
      platforms: Array.isArray(p.platforms) ? p.platforms : [],
      created_at: p.created_at ?? '',
      verification_status: (p.verification_status as VerificationStatus) ?? null,
      verification_notes: p.verification_notes ?? null,
      client_name: null,
      created_by_name: null,
    }))

    const stats: VerificationStats = {
      total:     posts.length,
      verified:  posts.filter(p => p.verification_status === 'verified').length,
      in_review: posts.filter(p => p.verification_status === 'in_review').length,
      has_errors:posts.filter(p => p.verification_status === 'has_errors').length,
      unchecked: posts.filter(p => !p.verification_status).length,
    }

    return { data: posts, stats, error: null }
  } catch (e: any) {
    return { ...empty, error: e.message }
  }
}

export async function updateVerificationStatus(
  postId: string,
  status: VerificationStatus,
  notes?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createAdminClient()
    const { error } = await supabase
      .from('content_posts')
      .update({
        verification_status: status,
        verification_notes: notes ?? null,
      })
      .eq('id', postId)
    if (error) return { success: false, error: error.message }
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}
