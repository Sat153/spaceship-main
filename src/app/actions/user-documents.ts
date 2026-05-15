'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

export interface UserDocument {
  id: string
  title: string
  content: string
  document_type: string
  tags: string[]
  created_at: string
  department_name: string
}

export async function getMyDocuments(): Promise<{ data: UserDocument[]; departmentName: string }> {
  try {
    const supabase = createClient(await cookies())
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { data: [], departmentName: '' }

    const admin = createAdminClient()
    const { data: profile } = await admin.from('profiles').select('department_id').eq('id', user.id).single()
    if (!profile?.department_id) return { data: [], departmentName: '' }

    const [deptResult, docsResult] = await Promise.all([
      admin.from('departments').select('name').eq('id', profile.department_id).single(),
      admin.from('documents').select('id, title, content, document_type, tags, created_at')
        .eq('department_id', profile.department_id)
        .eq('is_published', true)
        .order('created_at', { ascending: false }),
    ])

    const departmentName = deptResult.data?.name || ''
    const data = (docsResult.data || []).map(doc => ({ ...doc, department_name: departmentName }))

    return { data, departmentName }
  } catch {
    return { data: [], departmentName: '' }
  }
}
