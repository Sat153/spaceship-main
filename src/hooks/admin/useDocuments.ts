'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'

interface Document {
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

interface CreateDocumentData {
  title: string
  content: string
  department_id: string
  document_type: string
  tags: string[]
  is_published: boolean
  created_by: string
}

interface UpdateDocumentData {
  title: string
  content: string
  department_id: string
  document_type: string
  tags: string[]
  is_published: boolean
}

export function useDocuments() {
  const { user } = useAuth()
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)

  const fetchDocuments = useCallback(async () => {
    try {
      setLoading(true)
      console.log('useDocuments: Starting fetchDocuments');
      
      // Fetch documents
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
          created_at
        `)
        .order('created_at', { ascending: false })

      if (documentsError) {
        console.error('Error fetching documents:', documentsError)
        throw documentsError
      }

      // Fetch departments to add department names
      const { data: departmentsData, error: departmentsError } = await supabase
        .from('departments')
        .select('id, name')

      if (departmentsError) {
        console.error('Error fetching departments:', departmentsError)
        // Continue with documents without department names
        setDocuments(documentsData || [])
        return
      }

      // Map department names to documents
      const documentsWithDept = documentsData?.map(doc => ({
        ...doc,
        department_name: departmentsData?.find(dept => dept.id === doc.department_id)?.name || 'Unknown'
      })) || []

      setDocuments(documentsWithDept)
      console.log('useDocuments: fetchDocuments completed successfully');
    } catch (error) {
      console.error('useDocuments: Error in fetchDocuments:', error)
      throw error; // Re-throw to trigger retry mechanism
    } finally {
      setLoading(false)
    }
  }, [])

  const createDocument = async (docData: CreateDocumentData): Promise<Document | null> => {
    try {
      const { data, error } = await supabase
        .from('documents')
        .insert([docData])
        .select()

      if (error) {
        console.error('Error creating document:', error)
        throw error
      }

      if (data && data[0]) {
        // Refresh documents list
        await fetchDocuments()
        return data[0]
      }

      return null
    } catch (error) {
      console.error('Error in createDocument:', error)
      throw error
    }
  }

  const updateDocument = async (id: string, updateData: UpdateDocumentData): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('documents')
        .update(updateData)
        .eq('id', id)

      if (error) {
        console.error('Error updating document:', error)
        throw error
      }

      // Refresh documents list
      await fetchDocuments()
      return true
    } catch (error) {
      console.error('Error in updateDocument:', error)
      throw error
    }
  }

  const deleteDocument = async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('documents')
        .delete()
        .eq('id', id)

      if (error) {
        console.error('Error deleting document:', error)
        throw error
      }

      // Refresh documents list
      await fetchDocuments()
      return true
    } catch (error) {
      console.error('Error in deleteDocument:', error)
      throw error
    }
  }

  useEffect(() => {
    if (!user) return
    fetchDocuments().catch(err => {
      console.error('useDocuments: Error loading documents:', err)
      setLoading(false)
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  return {
    documents,
    loading,
    createDocument,
    updateDocument,
    deleteDocument,
    refetch: fetchDocuments
  }
}