'use client'

import { useEffect, useState, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { FileText, Search, Bell, Eye, Clock, BookOpen, ArrowLeft, Users, MessageCircle } from "lucide-react"
import SharedClients from "@/components/user/SharedClients"
import ChatPanel from "@/components/user/ChatPanel"
import UserRoute from "@/components/UserRoute"
import Sidebar from "@/components/Sidebar"
import { useAuth } from "@/lib/auth"
import { supabase } from "@/lib/supabase"

interface Document {
  id: string
  title: string
  content: string
  document_type: string
  tags: string[]
  created_at: string
  department_name: string
}

export default function UserDashboard() {
  const { profile } = useAuth()
  const [activeTab, setActiveTab] = useState('knowledge-base')
  const [documents, setDocuments] = useState<Document[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null)
  const [departmentName, setDepartmentName] = useState<string>('')

  const fetchDocuments = useCallback(async () => {
    if (!profile?.department_id) {
      console.log('No department_id found for user profile:', profile)
      setLoading(false)
      return
    }

    try {
      // First get department name
      const { data: deptData } = await supabase
        .from('departments')
        .select('name')
        .eq('id', profile.department_id)
        .single()

      const deptName = deptData?.name || 'Unknown'
      setDepartmentName(deptName)

      // Then get documents
      const { data, error } = await supabase
        .from('documents')
        .select(`
          id,
          title,
          content,
          document_type,
          tags,
          created_at
        `)
        .eq('department_id', profile.department_id)
        .eq('is_published', true)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching documents:', error)
      } else {
        const docsWithDept = data?.map(doc => ({
          ...doc,
          department_name: deptName
        })) || []
        setDocuments(docsWithDept)
      }
    } catch (err) {
      console.error('Error in fetchDocuments:', err)
    } finally {
      setLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id])

  useEffect(() => {
    if (profile?.department_id) {
      fetchDocuments()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.department_id])

  const filteredDocuments = documents.filter(doc =>
    doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    doc.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
    doc.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  const renderKnowledgeBase = () => {
    if (selectedDocument) {
      return (
        <div className="space-y-6">
          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              onClick={() => setSelectedDocument(null)}
              className="text-white border-gray-600 hover:bg-gray-700"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Documents
            </Button>
            <div>
              <h2 className="text-2xl font-bold text-white">{selectedDocument.title}</h2>
              <p className="text-gray-400">
                {selectedDocument.document_type} • {selectedDocument.department_name} • {new Date(selectedDocument.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>

          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-8">
              <div className="prose prose-invert max-w-none">
                <div className="text-white whitespace-pre-wrap leading-relaxed">
                  {selectedDocument.content}
                </div>
              </div>

              {selectedDocument.tags && selectedDocument.tags.length > 0 && (
                <div className="mt-8 pt-6 border-t border-gray-700">
                  <h4 className="text-white font-medium mb-3">Tags</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedDocument.tags.map((tag, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 text-sm bg-blue-600/20 text-blue-400 rounded-full"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )
    }

    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">Knowledge Base</h2>
          <p className="text-gray-400">
            Access SOPs and documentation for your department: {departmentName}
          </p>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search documents, SOPs, and procedures..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-gray-800 border-gray-700 text-white placeholder:text-gray-500"
          />
        </div>

        {/* Documents Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <Card key={i} className="bg-gray-800 border-gray-700 animate-pulse">
                <CardHeader>
                  <div className="h-4 bg-gray-700 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-700 rounded w-1/2"></div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="h-3 bg-gray-700 rounded"></div>
                    <div className="h-3 bg-gray-700 rounded w-2/3"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredDocuments.length === 0 ? (
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="text-center py-12">
              <BookOpen className="mx-auto h-16 w-16 text-gray-500 mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">
                {searchQuery ? 'No documents found' : 'No documents available'}
              </h3>
              <p className="text-gray-400">
                {searchQuery
                  ? 'Try adjusting your search terms'
                  : 'Documents for your department will appear here when available'
                }
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredDocuments.map((doc) => (
              <Card key={doc.id} className="bg-gray-800 border-gray-700 hover:border-blue-500 transition-colors">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-white text-lg">{doc.title}</CardTitle>
                      <CardDescription className="text-gray-400 capitalize">
                        {doc.document_type} • {doc.department_name}
                      </CardDescription>
                    </div>
                    <FileText className="h-5 w-5 text-blue-400 flex-shrink-0" />
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-300 text-sm mb-4 line-clamp-3">
                    {doc.content?.substring(0, 120)}...
                  </p>

                  {/* Tags */}
                  {doc.tags && doc.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-4">
                      {doc.tags.slice(0, 3).map((tag, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 text-xs bg-blue-600/20 text-blue-400 rounded"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <div className="flex items-center text-xs text-gray-500">
                      <Clock className="h-3 w-3 mr-1" />
                      {new Date(doc.created_at).toLocaleDateString()}
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedDocument(doc)}
                        className="text-white border-gray-600 hover:bg-gray-700"
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        View
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    )
  }

  const renderSearch = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white">Search</h2>
      <p className="text-gray-400">Advanced search across all available documents</p>
      {/* Advanced search interface */}
    </div>
  )

  const renderNotifications = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white">Notifications</h2>
      <Card className="bg-gray-800 border-gray-700">
        <CardContent className="text-center py-12">
          <Bell className="mx-auto h-16 w-16 text-gray-500 mb-4" />
          <p className="text-gray-400">No new notifications</p>
        </CardContent>
      </Card>
    </div>
  )

  const renderProfile = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white">My Profile</h2>
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">Profile Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm text-gray-400">Name</label>
            <p className="text-white">{profile?.first_name} {profile?.last_name}</p>
          </div>
          <div>
            <label className="text-sm text-gray-400">Email</label>
            <p className="text-white">{profile?.email}</p>
          </div>
          <div>
            <label className="text-sm text-gray-400">Department</label>
            <p className="text-white">{departmentName || 'Loading...'}</p>
          </div>
          <div>
            <label className="text-sm text-gray-400">Role</label>
            <p className="text-white capitalize">{profile?.role}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )

  const renderContent = () => {
    switch (activeTab) {
      case 'clients':
        return <SharedClients />
      case 'messages':
        return <ChatPanel />
      case 'knowledge-base':
        return renderKnowledgeBase()
      case 'search':
        return renderSearch()
      case 'notifications':
        return renderNotifications()
      case 'profile':
        return renderProfile()
      default:
        return renderKnowledgeBase()
    }
  }

  return (
    <UserRoute>
      <div className="flex h-screen bg-black">
        <Sidebar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          userRole={profile?.role as "admin" | "user"}
        />

        {/* Main Content */}
        <div className="flex-1 overflow-auto">
          <div className="p-8">
            {renderContent()}
          </div>
        </div>
      </div>
    </UserRoute>
  )
}