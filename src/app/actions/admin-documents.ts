'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { cookies } from 'next/headers'
import { revalidateTag } from 'next/cache'

export interface Document {
  id: string
  title: string
  content: string
  department_id: string
  document_type: string
  tags: string[]
  is_published: boolean
  created_at: string
  department_name?: string
}

export interface Department {
  id: string
  name: string
  description?: string
  color?: string
  created_at: string
  updated_at: string
}

export interface CreateDocumentData {
  title: string
  content: string
  department_id: string
  document_type: string
  tags: string[]
  is_published: boolean
  created_by: string
}

export interface UpdateDocumentData {
  title: string
  content: string
  department_id: string
  document_type: string
  tags: string[]
  is_published: boolean
}

async function getSupabaseClient() {
  const cookieStore = await cookies()
  return createClient(cookieStore)
}

export async function fetchDocuments(): Promise<{ data: Document[] | null; error: string | null }> {
  console.log('🔍 ACTION: fetchDocuments')
  try {
    console.log('Server Action: Fetching documents...')
    const supabase = createAdminClient()

    // Single query with Supabase relational join - much more efficient
    const { data: documentsData, error: documentsError } = await supabase
      .from('documents')
      .select(`
        id,
        title,
        content,
        department_id,
        document_type,
        tags,
        is_published,
        created_at,
        departments:department_id(name)
      `)
      .order('created_at', { ascending: false })

    if (documentsError) {
      console.error('Error fetching documents:', documentsError)
      return { data: null, error: documentsError.message }
    }

    // Transform the joined data to flat structure
    const documentsWithDept = documentsData?.map(doc => ({
      id: doc.id,
      title: doc.title,
      content: doc.content,
      department_id: doc.department_id,
      document_type: doc.document_type,
      tags: doc.tags,
      is_published: doc.is_published,
      created_at: doc.created_at,
      department_name: (doc.departments as any)?.name || 'Unknown'
    })) || []

    console.log('Server Action: Documents fetched successfully:', documentsWithDept?.length || 0)
    return { data: documentsWithDept, error: null }
  } catch (error) {
    console.error('Server Action: Error in fetchDocuments:', error)
    return { data: null, error: 'Failed to fetch documents' }
  }
}

export async function fetchDepartments(): Promise<{ data: Department[] | null; error: string | null }> {
  try {
    console.log('Server Action: Fetching departments...')
    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from('departments')
      .select('*')
      .order('name')

    if (error) {
      console.error('Error fetching departments:', error)
      return { data: null, error: error.message }
    }

    console.log('Server Action: Departments fetched successfully:', data?.length || 0)
    return { data: data || [], error: null }
  } catch (error) {
    console.error('Server Action: Error in fetchDepartments:', error)
    return { data: null, error: 'Failed to fetch departments' }
  }
}

export async function createDocument(docData: CreateDocumentData): Promise<{ data: Document | null; error: string | null }> {
  try {
    console.log('Server Action: Creating document...', docData)
    const supabase = await getSupabaseClient()

    const { data, error } = await supabase
      .from('documents')
      .insert([docData])
      .select()

    if (error) {
      console.error('Error creating document:', error)
      return { data: null, error: error.message }
    }

    if (data && data[0]) {
      console.log('Server Action: Document created successfully')
      revalidateTag('admin-documents')
      return { data: data[0], error: null }
    }

    return { data: null, error: 'Failed to create document' }
  } catch (error) {
    console.error('Server Action: Error in createDocument:', error)
    return { data: null, error: 'Failed to create document' }
  }
}

export async function updateDocument(id: string, updateData: UpdateDocumentData): Promise<{ success: boolean; error: string | null }> {
  try {
    console.log('Server Action: Updating document...', { id, updateData })
    const supabase = await getSupabaseClient()

    const { error } = await supabase
      .from('documents')
      .update(updateData)
      .eq('id', id)

    if (error) {
      console.error('Error updating document:', error)
      return { success: false, error: error.message }
    }

    console.log('Server Action: Document updated successfully')
    revalidateTag('admin-documents')
    return { success: true, error: null }
  } catch (error) {
    console.error('Server Action: Error in updateDocument:', error)
    return { success: false, error: 'Failed to update document' }
  }
}

export async function deleteDocument(id: string): Promise<{ success: boolean; error: string | null }> {
  try {
    console.log('Server Action: Deleting document...', { id })
    const supabase = await getSupabaseClient()

    const { error } = await supabase
      .from('documents')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting document:', error)
      return { success: false, error: error.message }
    }

    console.log('Server Action: Document deleted successfully')
    revalidateTag('admin-documents')
    return { success: true, error: null }
  } catch (error) {
    console.error('Server Action: Error in deleteDocument:', error)
    return { success: false, error: 'Failed to delete document' }
  }
}