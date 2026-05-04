'use client'

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { 
  FileText, 
  Edit3, 
  Save, 
  X, 
  Search, 
  ChevronRight, 
  Calendar, 
  Tag, 
  Type, 
  Hash, 
  Building2, 
  CheckCircle2, 
  AlertCircle, 
  Filter, 
  SortAsc, 
  SortDesc, 
  Plus, 
  Trash2 
} from "lucide-react"
import { useAuth } from "@/lib/auth"
import { 
  fetchDocuments, 
  fetchDepartments, 
  createDocument, 
  updateDocument, 
  deleteDocument,
  type Document,
  type Department,
  type CreateDocumentData,
  type UpdateDocumentData
} from "@/app/actions/admin-documents"
import * as React from "react"

interface AdminDocumentsProps {
  user: any
}

export default function AdminDocuments({ user }: AdminDocumentsProps) {
  const { user: authUser } = useAuth()
  const [documents, setDocuments] = React.useState<Document[]>([])
  const [departments, setDepartments] = React.useState<Department[]>([])
  const [loading, setLoading] = React.useState(true)
  
  const [selectedDoc, setSelectedDoc] = useState<any>(null)
  const [isEditMode, setIsEditMode] = useState(false)
  const [isCreatingDoc, setIsCreatingDoc] = useState(false)
  const [editingDoc, setEditingDoc] = useState<any>(null)
  const [newDoc, setNewDoc] = useState({
    title: '',
    content: '',
    department_id: '',
    document_type: 'sop',
    tags: '',
    is_published: false
  })
  const [searchQuery, setSearchQuery] = useState('')
  const [filters, setFilters] = useState({
    department: 'all',
    type: 'all',
    status: 'all',
    sortBy: 'created_at',
    sortOrder: 'desc' as 'asc' | 'desc'
  })
  const [showFilters, setShowFilters] = useState(false)

  const fetchDocumentsData = React.useCallback(async () => {
    try {
      const result = await fetchDocuments()
      if (result.error) {
        console.error('Error fetching documents:', result.error)
        throw new Error(result.error)
      }
      setDocuments(result.data || [])
      return result.data
    } catch (error) {
      console.error('Error in fetchDocumentsData:', error)
      throw error
    }
  }, [])

  const fetchDepartmentsData = React.useCallback(async () => {
    try {
      const result = await fetchDepartments()
      if (result.error) {
        console.error('Error fetching departments:', result.error)
        throw new Error(result.error)
      }
      setDepartments(result.data || [])
      return result.data
    } catch (error) {
      console.error('Error in fetchDepartmentsData:', error)
      throw error
    }
  }, [])

  const fetchInitialData = React.useCallback(async () => {
    try {
      console.log('AdminDocuments: Starting fetchInitialData')
      await Promise.all([
        fetchDocumentsData(),
        fetchDepartmentsData(),
      ])
      console.log('AdminDocuments: fetchInitialData completed successfully')
    } catch (error) {
      console.error('AdminDocuments: Error in fetchInitialData:', error)
      throw error
    } finally {
      setLoading(false)
    }
  }, [fetchDocumentsData, fetchDepartmentsData])

  React.useEffect(() => {
    if (!authUser) return
    fetchInitialData().catch(err => {
      console.error('AdminDocuments: Error loading data:', err)
      setLoading(false)
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authUser?.id])

  const handleCreateDocument = async () => {
    if (!newDoc.title || !newDoc.content || !newDoc.department_id) return

    try {
      const docData: CreateDocumentData = {
        title: newDoc.title,
        content: newDoc.content,
        department_id: newDoc.department_id,
        document_type: newDoc.document_type,
        tags: newDoc.tags ? newDoc.tags.split(',').map(tag => tag.trim()) : [],
        is_published: newDoc.is_published,
        created_by: user.id
      }

      const result = await createDocument(docData)
      
      if (result.error) {
        console.error('Error creating document:', result.error)
        alert('Error creating document')
        return
      }

      if (result.data) {
        await fetchDocumentsData()
        setIsCreatingDoc(false)
        setNewDoc({
          title: '',
          content: '',
          department_id: '',
          document_type: 'sop',
          tags: '',
          is_published: false
        })
        setSelectedDoc(result.data)
      }
    } catch (error) {
      console.error('Error creating document:', error)
      alert('Error creating document')
    }
  }

  const handleUpdateDocument = async () => {
    if (!selectedDoc || !editingDoc) return

    try {
      const updatedDoc = { ...selectedDoc, ...editingDoc }
      const updateData: UpdateDocumentData = {
        title: updatedDoc.title,
        content: updatedDoc.content,
        department_id: updatedDoc.department_id,
        document_type: updatedDoc.document_type,
        tags: updatedDoc.tags,
        is_published: updatedDoc.is_published
      }

      const result = await updateDocument(selectedDoc.id, updateData)

      if (result.error) {
        console.error('Error updating document:', result.error)
        alert('Error updating document')
        return
      }

      if (result.success) {
        await fetchDocumentsData()
        setEditingDoc(null)
        setIsEditMode(false)
        setSelectedDoc(updatedDoc)
      }
    } catch (error) {
      console.error('Error updating document:', error)
      alert('Error updating document')
    }
  }

  const handleDeleteDocument = async (id: string) => {
    if (!confirm('Are you sure you want to delete this document?')) return

    try {
      const result = await deleteDocument(id)
      if (result.error) {
        console.error('Error deleting document:', result.error)
        alert('Error deleting document')
        return
      }

      if (result.success) {
        await fetchDocumentsData()
        setSelectedDoc(null)
      }
    } catch (error) {
      console.error('Error deleting document:', error)
      alert('Error deleting document')
    }
  }

  // Apply filters
  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = searchQuery === '' || 
      doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.department_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (doc.tags && doc.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase())))

    const matchesDepartment = filters.department === 'all' || doc.department_id === filters.department
    const matchesType = filters.type === 'all' || doc.document_type === filters.type
    const matchesStatus = filters.status === 'all' || 
      (filters.status === 'published' && doc.is_published) ||
      (filters.status === 'draft' && !doc.is_published)

    return matchesSearch && matchesDepartment && matchesType && matchesStatus
  })

  // Apply sorting
  filteredDocuments.sort((a, b) => {
    let aValue, bValue

    switch (filters.sortBy) {
      case 'title':
        aValue = a.title.toLowerCase()
        bValue = b.title.toLowerCase()
        break
      case 'department':
        aValue = a.department_name?.toLowerCase() || ''
        bValue = b.department_name?.toLowerCase() || ''
        break
      case 'type':
        aValue = a.document_type
        bValue = b.document_type
        break
      case 'created_at':
      default:
        aValue = new Date(a.created_at).getTime()
        bValue = new Date(b.created_at).getTime()
        break
    }

    if (aValue < bValue) return filters.sortOrder === 'asc' ? -1 : 1
    if (aValue > bValue) return filters.sortOrder === 'asc' ? 1 : -1
    return 0
  })

  // Get active filter count for badge
  const activeFilterCount = Object.entries(filters).filter(([key, value]) => 
    key !== 'sortBy' && key !== 'sortOrder' && value !== 'all'
  ).length

  return (
    <div className="flex h-full">
      {/* Center Panel - Documents List */}
      <div className="flex-1 flex flex-col max-w-md border-r border-gray-700">
        {/* Header */}
        <div className="p-6 border-b border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold text-white">Knowledge Base</h2>
              <p className="text-gray-400 text-sm">
                {filteredDocuments.length} of {documents.length} documents
              </p>
            </div>
            <Button 
              onClick={() => {
                setIsCreatingDoc(true)
                setSelectedDoc(null)
                setIsEditMode(false)
              }}
              size="sm"
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          
          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search documents, content, tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-gray-800 border-gray-600 text-white placeholder:text-gray-500"
            />
          </div>

          {/* Filter Controls */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className="text-white border-gray-600 hover:bg-gray-700"
              >
                <Filter className="h-4 w-4 mr-2" />
                Filters
                {activeFilterCount > 0 && (
                  <span className="ml-2 px-1.5 py-0.5 text-xs bg-blue-600 text-white rounded-full">
                    {activeFilterCount}
                  </span>
                )}
              </Button>
              
              {/* Quick Sort */}
              <div className="flex items-center space-x-1">
                <Select 
                  value={filters.sortBy} 
                  onValueChange={(value) => setFilters(prev => ({ ...prev, sortBy: value }))}
                >
                  <SelectTrigger className="w-auto h-8 bg-gray-800 border-gray-600 text-white text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-600">
                    <SelectItem value="created_at" className="text-white">Date</SelectItem>
                    <SelectItem value="title" className="text-white">Title</SelectItem>
                    <SelectItem value="department" className="text-white">Department</SelectItem>
                    <SelectItem value="type" className="text-white">Type</SelectItem>
                  </SelectContent>
                </Select>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setFilters(prev => ({ 
                    ...prev, 
                    sortOrder: prev.sortOrder === 'asc' ? 'desc' : 'asc' 
                  }))}
                  className="h-8 w-8 p-0 text-gray-400 hover:text-white"
                >
                  {filters.sortOrder === 'asc' ? 
                    <SortAsc className="h-4 w-4" /> : 
                    <SortDesc className="h-4 w-4" />
                  }
                </Button>
              </div>
            </div>

            {/* Clear Filters */}
            {activeFilterCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setFilters(prev => ({
                  ...prev,
                  department: 'all',
                  type: 'all',
                  status: 'all'
                }))}
                className="text-gray-400 hover:text-white text-xs"
              >
                Clear filters
              </Button>
            )}
          </div>

          {/* Filter Panel */}
          {showFilters && (
            <div className="mt-4 p-4 bg-gray-800/50 rounded-lg border border-gray-700 space-y-4">
              <div className="grid grid-cols-1 gap-4">
                {/* Department Filter */}
                <div className="space-y-2">
                  <Label className="text-white text-sm font-medium">Department</Label>
                  <Select 
                    value={filters.department} 
                    onValueChange={(value) => setFilters(prev => ({ ...prev, department: value }))}
                  >
                    <SelectTrigger className="bg-gray-800 border-gray-600 text-white text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-600">
                      <SelectItem value="all" className="text-white">All Departments</SelectItem>
                      {departments.map((dept) => (
                        <SelectItem key={dept.id} value={dept.id} className="text-white">
                          {dept.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Type and Status Filters */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-white text-sm font-medium">Type</Label>
                    <Select 
                      value={filters.type} 
                      onValueChange={(value) => setFilters(prev => ({ ...prev, type: value }))}
                    >
                      <SelectTrigger className="bg-gray-800 border-gray-600 text-white text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-800 border-gray-600">
                        <SelectItem value="all" className="text-white">All Types</SelectItem>
                        <SelectItem value="sop" className="text-white">📋 SOP</SelectItem>
                        <SelectItem value="guide" className="text-white">📖 Guide</SelectItem>
                        <SelectItem value="policy" className="text-white">📜 Policy</SelectItem>
                        <SelectItem value="procedure" className="text-white">⚙️ Procedure</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-white text-sm font-medium">Status</Label>
                    <Select 
                      value={filters.status} 
                      onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}
                    >
                      <SelectTrigger className="bg-gray-800 border-gray-600 text-white text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-800 border-gray-600">
                        <SelectItem value="all" className="text-white">All Status</SelectItem>
                        <SelectItem value="published" className="text-white">🟢 Published</SelectItem>
                        <SelectItem value="draft" className="text-white">🟡 Draft</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Quick Filter Chips */}
        {(activeFilterCount > 0 || searchQuery) && (
          <div className="px-6 py-3 border-b border-gray-700 bg-gray-800/30">
            <div className="flex flex-wrap gap-2">
              {searchQuery && (
                <div className="flex items-center space-x-1 px-2 py-1 bg-blue-600/20 text-blue-400 rounded-full text-xs border border-blue-600/30">
                  <Search className="h-3 w-3" />
                  <span>&quot;{searchQuery}&quot;</span>
                  <button
                    onClick={() => setSearchQuery('')}
                    className="hover:bg-blue-600/30 rounded-full p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              )}
              
              {filters.department !== 'all' && (
                <div className="flex items-center space-x-1 px-2 py-1 bg-purple-600/20 text-purple-400 rounded-full text-xs border border-purple-600/30">
                  <Building2 className="h-3 w-3" />
                  <span>{departments.find(d => d.id === filters.department)?.name}</span>
                  <button
                    onClick={() => setFilters(prev => ({ ...prev, department: 'all' }))}
                    className="hover:bg-purple-600/30 rounded-full p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              )}
              
              {filters.type !== 'all' && (
                <div className="flex items-center space-x-1 px-2 py-1 bg-green-600/20 text-green-400 rounded-full text-xs border border-green-600/30">
                  <Type className="h-3 w-3" />
                  <span>{filters.type.toUpperCase()}</span>
                  <button
                    onClick={() => setFilters(prev => ({ ...prev, type: 'all' }))}
                    className="hover:bg-green-600/30 rounded-full p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              )}
              
              {filters.status !== 'all' && (
                <div className="flex items-center space-x-1 px-2 py-1 bg-orange-600/20 text-orange-400 rounded-full text-xs border border-orange-600/30">
                  <div className={`w-2 h-2 rounded-full ${filters.status === 'published' ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
                  <span>{filters.status === 'published' ? 'Published' : 'Draft'}</span>
                  <button
                    onClick={() => setFilters(prev => ({ ...prev, status: 'all' }))}
                    className="hover:bg-orange-600/30 rounded-full p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Documents List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-6">
              <p className="text-gray-400">Loading documents...</p>
            </div>
          ) : filteredDocuments.length === 0 ? (
            <div className="p-6 text-center">
              <FileText className="mx-auto h-12 w-12 text-gray-500 mb-3" />
              <p className="text-gray-400 mb-1">
                {documents.length === 0 ? 'No documents yet' : 'No matches found'}
              </p>
              <p className="text-gray-500 text-sm mb-4">
                {documents.length === 0 
                  ? 'Create your first document to get started' 
                  : 'Try adjusting your search terms or filters'
                }
              </p>
              {documents.length > 0 && (activeFilterCount > 0 || searchQuery) && (
                <div className="flex flex-col space-y-2">
                  {searchQuery && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSearchQuery('')}
                      className="text-white border-gray-600 hover:bg-gray-700"
                    >
                      Clear search
                    </Button>
                  )}
                  {activeFilterCount > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setFilters(prev => ({
                        ...prev,
                        department: 'all',
                        type: 'all',
                        status: 'all'
                      }))}
                      className="text-white border-gray-600 hover:bg-gray-700"
                    >
                      Clear all filters
                    </Button>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="divide-y divide-gray-700">
              {filteredDocuments.map((doc) => (
                <div
                  key={doc.id}
                  onClick={() => {
                    setSelectedDoc(doc)
                    setIsCreatingDoc(false)
                    setIsEditMode(false)
                  }}
                  className={`p-4 cursor-pointer hover:bg-gray-800 transition-colors ${
                    selectedDoc?.id === doc.id ? 'bg-gray-800 border-r-2 border-blue-500' : ''
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <h3 className="font-medium text-white truncate text-sm">
                          {doc.title}
                        </h3>
                        <span className={`px-1.5 py-0.5 text-xs rounded ${
                          doc.is_published 
                            ? 'bg-green-600/20 text-green-400 border border-green-600/30' 
                            : 'bg-yellow-600/20 text-yellow-400 border border-yellow-600/30'
                        }`}>
                          {doc.is_published ? 'Live' : 'Draft'}
                        </span>
                      </div>
                      
                      <div className="flex items-center space-x-2 text-xs text-gray-400 mb-2">
                        <span className="bg-gray-700 px-1.5 py-0.5 rounded">
                          {doc.document_type}
                        </span>
                        <span>•</span>
                        <span>{doc.department_name}</span>
                      </div>
                      
                      <p className="text-gray-300 text-xs line-clamp-2 leading-relaxed">
                        {doc.content.substring(0, 100)}...
                      </p>
                      
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center space-x-1 text-xs text-gray-500">
                          <Calendar className="h-3 w-3" />
                          <span>{new Date(doc.created_at).toLocaleDateString()}</span>
                        </div>
                        {doc.tags && doc.tags.length > 0 && (
                          <div className="flex items-center space-x-1 text-xs text-gray-500">
                            <Tag className="h-3 w-3" />
                            <span>{doc.tags.length}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-gray-500 flex-shrink-0 ml-2" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right Panel - Document Editor/Viewer (Artifact-style) */}
      <div className="flex-1 flex flex-col bg-gray-900">
        {selectedDoc || isCreatingDoc ? (
          <>
            {/* Editor Header */}
            <div className="p-4 border-b border-gray-700 bg-gray-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`w-2 h-2 rounded-full ${
                    isEditMode || isCreatingDoc ? 'bg-orange-500 animate-pulse' : 'bg-blue-500'
                  }`}></div>
                  <span className="text-white font-medium">
                    {isCreatingDoc ? 'New Document' : selectedDoc?.title}
                  </span>
                  {(isEditMode || isCreatingDoc) && (
                    <span className="px-2 py-1 text-xs rounded bg-orange-600/20 text-orange-400 border border-orange-600/30">
                      {editingDoc ? 'Unsaved Changes' : 'Editing'}
                    </span>
                  )}
                  {selectedDoc && !isEditMode && !isCreatingDoc && (
                    <span className={`px-2 py-1 text-xs rounded ${
                      selectedDoc.is_published 
                        ? 'bg-green-600/20 text-green-400' 
                        : 'bg-yellow-600/20 text-yellow-400'
                    }`}>
                      {selectedDoc.is_published ? 'Published' : 'Draft'}
                    </span>
                  )}
                </div>
                
                <div className="flex items-center space-x-2">
                  {selectedDoc && !isEditMode && !isCreatingDoc && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setIsEditMode(true)
                        setEditingDoc(null)
                      }}
                      className="text-white border-gray-600 hover:bg-gray-700"
                    >
                      <Edit3 className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                  )}
                  
                  {(isEditMode || isCreatingDoc) && (
                    <div className="flex items-center space-x-2">
                      {editingDoc && (
                        <div className="flex items-center space-x-1 text-xs text-orange-400 mr-2">
                          <AlertCircle className="h-3 w-3" />
                          <span>Unsaved</span>
                        </div>
                      )}
                      
                      <Button
                        size="sm"
                        onClick={isCreatingDoc ? handleCreateDocument : handleUpdateDocument}
                        className="bg-green-600 hover:bg-green-700 transition-colors"
                        disabled={isCreatingDoc && (!newDoc.title || !newDoc.content || !newDoc.department_id)}
                      >
                        <Save className="h-4 w-4 mr-1" />
                        {isCreatingDoc ? 'Create' : 'Save Changes'}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          if (editingDoc && window.confirm('You have unsaved changes. Are you sure you want to cancel?')) {
                            setIsEditMode(false)
                            setIsCreatingDoc(false)
                            setEditingDoc(null)
                          } else if (!editingDoc) {
                            setIsEditMode(false)
                            setIsCreatingDoc(false)
                            setEditingDoc(null)
                          }
                        }}
                        className="text-white border-gray-600 hover:bg-gray-700"
                      >
                        Cancel
                      </Button>
                    </div>
                  )}
                  
                  {selectedDoc && !isEditMode && !isCreatingDoc && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        if (window.confirm(`Are you sure you want to delete "${selectedDoc.title}"? This action cannot be undone.`)) {
                          handleDeleteDocument(selectedDoc.id)
                        }
                      }}
                      className="text-red-400 border-red-600 hover:bg-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Editor Content */}
            <div className="flex-1 overflow-hidden">
              {isCreatingDoc ? (
                <div className="h-full p-6 overflow-y-auto">
                  <div className="max-w-4xl space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-white">Title *</Label>
                        <Input
                          value={newDoc.title}
                          onChange={(e) => setNewDoc({ ...newDoc, title: e.target.value })}
                          placeholder="Enter document title"
                          className="bg-gray-800 border-gray-600 text-white"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-white">Department *</Label>
                        <Select value={newDoc.department_id} onValueChange={(value) => setNewDoc({ ...newDoc, department_id: value })}>
                          <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
                            <SelectValue placeholder="Select department" />
                          </SelectTrigger>
                          <SelectContent className="bg-gray-800 border-gray-600">
                            {departments.map((dept) => (
                              <SelectItem key={dept.id} value={dept.id} className="text-white">
                                {dept.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-white">Type</Label>
                        <Select value={newDoc.document_type} onValueChange={(value) => setNewDoc({ ...newDoc, document_type: value })}>
                          <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-gray-800 border-gray-600">
                            <SelectItem value="sop" className="text-white">SOP</SelectItem>
                            <SelectItem value="guide" className="text-white">Guide</SelectItem>
                            <SelectItem value="policy" className="text-white">Policy</SelectItem>
                            <SelectItem value="procedure" className="text-white">Procedure</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-white">Tags</Label>
                        <Input
                          value={newDoc.tags}
                          onChange={(e) => setNewDoc({ ...newDoc, tags: e.target.value })}
                          placeholder="Enter tags separated by commas"
                          className="bg-gray-800 border-gray-600 text-white"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-white">Content *</Label>
                      <Textarea
                        value={newDoc.content}
                        onChange={(e) => setNewDoc({ ...newDoc, content: e.target.value })}
                        placeholder="Write your content here... Use markdown for formatting."
                        className="bg-gray-800 border-gray-600 text-white min-h-[400px] resize-none font-mono"
                      />
                    </div>

                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="new-published"
                        checked={newDoc.is_published}
                        onChange={(e) => setNewDoc({ ...newDoc, is_published: e.target.checked })}
                        className="rounded border-gray-600 bg-gray-800"
                      />
                      <Label htmlFor="new-published" className="text-white">Publish immediately</Label>
                    </div>
                  </div>
                </div>
              ) : isEditMode && selectedDoc ? (
                <div className="h-full flex flex-col">
                  {/* Edit Mode Header */}
                  <div className="p-6 border-b border-gray-700 bg-gray-800/50">
                    <div className="flex items-center space-x-3 mb-4">
                      <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                        <Edit3 className="h-4 w-4 text-white" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-white">Edit Document</h3>
                        <p className="text-sm text-gray-400">Make changes to &quot;{selectedDoc.title}&quot;</p>
                      </div>
                    </div>
                    
                    {/* Quick Status Indicators */}
                    <div className="flex items-center space-x-4 text-sm">
                      <div className="flex items-center space-x-2">
                        <div className={`w-2 h-2 rounded-full ${
                          (editingDoc?.is_published ?? selectedDoc.is_published) 
                            ? 'bg-green-500' 
                            : 'bg-yellow-500'
                        }`}></div>
                        <span className="text-gray-400">
                          Status: {(editingDoc?.is_published ?? selectedDoc.is_published) ? 'Published' : 'Draft'}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Building2 className="h-3 w-3 text-gray-500" />
                        <span className="text-gray-400">
                          {departments.find(d => d.id === (editingDoc?.department_id || selectedDoc.department_id))?.name}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Edit Form */}
                  <div className="flex-1 p-6 overflow-y-auto">
                    <div className="max-w-4xl space-y-8">
                      {/* Basic Information */}
                      <div className="space-y-6">
                        <div className="flex items-center space-x-2 mb-4">
                          <Type className="h-5 w-5 text-blue-400" />
                          <h4 className="text-white font-medium">Basic Information</h4>
                        </div>
                        
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          <div className="space-y-3">
                            <Label className="text-white font-medium flex items-center space-x-2">
                              <span>Document Title</span>
                              <span className="text-red-400">*</span>
                            </Label>
                            <Input
                              value={editingDoc?.title || selectedDoc.title}
                              onChange={(e) => setEditingDoc({ 
                                ...selectedDoc, 
                                ...editingDoc, 
                                title: e.target.value 
                              })}
                              placeholder="Enter a descriptive title"
                              className="bg-gray-800 border-gray-600 text-white focus:border-blue-500 focus:ring-blue-500/20"
                            />
                            <p className="text-xs text-gray-500">Choose a clear, descriptive title for easy searching</p>
                          </div>
                          
                          <div className="space-y-3">
                            <Label className="text-white font-medium flex items-center space-x-2">
                              <span>Department</span>
                              <span className="text-red-400">*</span>
                            </Label>
                            <Select 
                              value={editingDoc?.department_id || selectedDoc.department_id} 
                              onValueChange={(value) => setEditingDoc({ 
                                ...selectedDoc, 
                                ...editingDoc, 
                                department_id: value 
                              })}
                            >
                              <SelectTrigger className="bg-gray-800 border-gray-600 text-white focus:border-blue-500">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-gray-800 border-gray-600">
                                {departments.map((dept) => (
                                  <SelectItem key={dept.id} value={dept.id} className="text-white focus:bg-gray-700">
                                    {dept.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <p className="text-xs text-gray-500">Select the department this document belongs to</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          <div className="space-y-3">
                            <Label className="text-white font-medium">Document Type</Label>
                            <Select 
                              value={editingDoc?.document_type || selectedDoc.document_type} 
                              onValueChange={(value) => setEditingDoc({ 
                                ...selectedDoc, 
                                ...editingDoc, 
                                document_type: value 
                              })}
                            >
                              <SelectTrigger className="bg-gray-800 border-gray-600 text-white focus:border-blue-500">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-gray-800 border-gray-600">
                                <SelectItem value="sop" className="text-white focus:bg-gray-700">
                                  📋 Standard Operating Procedure
                                </SelectItem>
                                <SelectItem value="guide" className="text-white focus:bg-gray-700">
                                  📖 Guide
                                </SelectItem>
                                <SelectItem value="policy" className="text-white focus:bg-gray-700">
                                  📜 Policy
                                </SelectItem>
                                <SelectItem value="procedure" className="text-white focus:bg-gray-700">
                                  ⚙️ Procedure
                                </SelectItem>
                              </SelectContent>
                            </Select>
                            <p className="text-xs text-gray-500">Categorize your document for better organization</p>
                          </div>

                          <div className="space-y-3">
                            <Label className="text-white font-medium flex items-center space-x-2">
                              <Hash className="h-4 w-4" />
                              <span>Tags</span>
                            </Label>
                            <Input
                              value={editingDoc?.tags ? (Array.isArray(editingDoc.tags) ? editingDoc.tags.join(', ') : editingDoc.tags) : (Array.isArray(selectedDoc.tags) ? selectedDoc.tags.join(', ') : '')}
                              onChange={(e) => setEditingDoc({ 
                                ...selectedDoc, 
                                ...editingDoc, 
                                tags: e.target.value.split(',').map(tag => tag.trim()).filter(Boolean)
                              })}
                              placeholder="training, onboarding, safety"
                              className="bg-gray-800 border-gray-600 text-white focus:border-blue-500 focus:ring-blue-500/20"
                            />
                            <p className="text-xs text-gray-500">Add comma-separated tags for better searchability</p>
                          </div>
                        </div>
                      </div>

                      {/* Content Section */}
                      <div className="space-y-6">
                        <div className="flex items-center space-x-2">
                          <FileText className="h-5 w-5 text-blue-400" />
                          <h4 className="text-white font-medium">Document Content</h4>
                        </div>
                        
                        <div className="space-y-3">
                          <Label className="text-white font-medium flex items-center space-x-2">
                            <span>Content</span>
                            <span className="text-red-400">*</span>
                          </Label>
                          <div className="relative">
                            <Textarea
                              value={editingDoc?.content || selectedDoc.content}
                              onChange={(e) => setEditingDoc({ 
                                ...selectedDoc, 
                                ...editingDoc, 
                                content: e.target.value 
                              })}
                              placeholder="Write your document content here... 

You can use markdown formatting:
- **Bold text**
- *Italic text*  
- # Headers
- - Bullet points
- 1. Numbered lists"
                              className="bg-gray-800 border-gray-600 text-white min-h-[500px] resize-none font-mono text-sm leading-relaxed focus:border-blue-500 focus:ring-blue-500/20"
                            />
                            <div className="absolute bottom-3 right-3 text-xs text-gray-500 bg-gray-900/80 px-2 py-1 rounded">
                              {(editingDoc?.content || selectedDoc.content)?.length || 0} characters
                            </div>
                          </div>
                          <p className="text-xs text-gray-500">
                            Use markdown formatting for rich text. Preview will be shown to users.
                          </p>
                        </div>
                      </div>

                      {/* Publishing Options */}
                      <div className="space-y-6">
                        <div className="flex items-center space-x-2">
                          <CheckCircle2 className="h-5 w-5 text-blue-400" />
                          <h4 className="text-white font-medium">Publishing Options</h4>
                        </div>
                        
                        <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                          <div className="flex items-start space-x-3">
                            <input
                              type="checkbox"
                              id="edit-published"
                              checked={editingDoc?.is_published ?? selectedDoc.is_published}
                              onChange={(e) => setEditingDoc({ 
                                ...selectedDoc, 
                                ...editingDoc, 
                                is_published: e.target.checked 
                              })}
                              className="mt-1 rounded border-gray-600 bg-gray-800 text-blue-600 focus:ring-blue-500 focus:ring-offset-gray-900"
                            />
                            <div className="flex-1">
                              <Label htmlFor="edit-published" className="text-white font-medium cursor-pointer">
                                Publish Document
                              </Label>
                              <p className="text-sm text-gray-400 mt-1">
                                {(editingDoc?.is_published ?? selectedDoc.is_published) 
                                  ? "This document is visible to all users in the selected department" 
                                  : "Save as draft - only administrators can see unpublished documents"
                                }
                              </p>
                              {(editingDoc?.is_published ?? selectedDoc.is_published) && (
                                <div className="flex items-center space-x-2 mt-2 text-xs text-green-400">
                                  <CheckCircle2 className="h-3 w-3" />
                                  <span>Users can access this document immediately after saving</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : selectedDoc ? (
                <div className="h-full p-6 overflow-y-auto">
                  <div className="max-w-4xl">
                    <div className="mb-6 pb-4 border-b border-gray-700">
                      <div className="flex items-start justify-between mb-3">
                        <h1 className="text-2xl font-bold text-white">{selectedDoc.title}</h1>
                      </div>
                      <div className="flex items-center space-x-4 text-sm text-gray-400">
                        <span className="bg-gray-800 px-2 py-1 rounded">
                          {selectedDoc.document_type}
                        </span>
                        <span>{selectedDoc.department_name}</span>
                        <span>•</span>
                        <span>{new Date(selectedDoc.created_at).toLocaleDateString()}</span>
                      </div>
                      {selectedDoc.tags && selectedDoc.tags.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-3">
                          {selectedDoc.tags.map((tag: string, index: number) => (
                            <span key={index} className="px-2 py-1 text-xs bg-blue-600/20 text-blue-400 rounded">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="prose prose-invert max-w-none">
                      <div className="text-gray-300 whitespace-pre-wrap leading-relaxed">
                        {selectedDoc.content}
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <FileText className="mx-auto h-16 w-16 text-gray-600 mb-4" />
              <h3 className="text-xl font-medium text-white mb-2">Select a document</h3>
              <p className="text-gray-400 mb-4">Choose a document from the list to view or edit</p>
              <Button
                onClick={() => {
                  setIsCreatingDoc(true)
                  setSelectedDoc(null)
                }}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create New Document
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}