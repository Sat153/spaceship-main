'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

export interface DeptMember {
  id: string
  first_name: string
  last_name: string
  email: string
  role: string
}

export interface Department {
  id: string
  name: string
  description?: string
  members: DeptMember[]
}

export async function getAllDepartments(): Promise<{ data: Department[]; error?: string }> {
  try {
    const supabase = createClient(await cookies())
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return { data: [], error: 'Unauthorized' }

    const admin = createAdminClient()

    const { data: depts, error } = await admin
      .from('departments')
      .select('id, name, description')
      .order('name')

    if (error) return { data: [], error: error.message }

    const { data: profiles } = await admin
      .from('profiles')
      .select('id, first_name, last_name, email, role, department_id')
      .order('first_name')

    const result: Department[] = (depts || []).map((d: any) => ({
      id: d.id,
      name: d.name,
      description: d.description,
      members: (profiles || [])
        .filter((p: any) => p.department_id === d.id)
        .map((p: any) => ({
          id: p.id,
          first_name: p.first_name || '',
          last_name: p.last_name || '',
          email: p.email,
          role: p.role,
        })),
    }))

    return { data: result }
  } catch (e: any) {
    return { data: [], error: e.message }
  }
}
