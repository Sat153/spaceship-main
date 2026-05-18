'use client'

import { useEffect, useState, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { FileText, Search, Bell, Eye, Clock, BookOpen, ArrowLeft, Users, MessageCircle, Menu, CheckCheck } from "lucide-react"
import SharedClients from "@/components/user/SharedClients"
import ChatPanel from "@/components/user/ChatPanel"
import UserTasks from "@/components/user/UserTasks"
import UserCalendar from "@/components/user/UserCalendar"
import UserAssets from "@/components/user/UserAssets"
import ContentHub from "@/components/admin/content/ContentHub"
import MessagingBank from "@/components/admin/content/MessagingBank"
import WeeklyReport from "@/components/user/WeeklyReport"
import AdminKanban from "@/components/admin/AdminKanban"
import UserDepartments from "@/components/user/UserDepartments"
import AkhileshApproval from "@/components/user/AkhileshApproval"
import UserRoute from "@/components/UserRoute"
import Sidebar from "@/components/Sidebar"
import { useAuth } from "@/lib/auth"
import { getNotifications, markAllRead, type Notification } from "@/app/actions/notifications"
import { getMyDocuments } from "@/app/actions/user-documents"

interface Document {
  id: string
  title: string
  content: string
  document_type: string
  tags: string[]
  created_at: string
  department_name: string
}

const VIKAS_RAKESH_EMAILS = ['vikas@anyasegen.com', 'rakesh@anyasegen.com']
const AKHILESH_EMAIL = 'satyamkr2806@gmail.com'

const VIKAS_RAKESH_VALID_TABS = new Set(['clients', 'messages', 'assets', 'weekly-report', 'notifications', 'profile'])
const AKHILESH_VALID_TABS = new Set(['messages', 'approval', 'notifications', 'profile'])

function getInitialTab(): string {
  return 'clients'
}

export default function UserDashboard() {
  const { profile, loading: authLoading } = useAuth()
  const [activeTab, setActiveTab] = useState(getInitialTab)
  const [visitedTabs, setVisitedTabs] = useState<Set<string>>(() => new Set([getInitialTab()]))

  const isVikasRakesh = !!(profile?.email && VIKAS_RAKESH_EMAILS.includes(profile.email.toLowerCase()))
  const isAkhilesh = !!(profile?.email && profile.email.toLowerCase() === AKHILESH_EMAIL)

  // Redirect Vikas/Rakesh off tabs they don't own
  useEffect(() => {
    if (isVikasRakesh && !VIKAS_RAKESH_VALID_TABS.has(activeTab)) {
      setActiveTab('clients')
      setVisitedTabs(new Set(['clients']))
    }
  }, [isVikasRakesh, activeTab])

  // Redirect Akhilesh to 'approval' as home tab, block invalid tabs
  useEffect(() => {
    if (!isAkhilesh) return
    if (!AKHILESH_VALID_TABS.has(activeTab)) {
      setActiveTab('approval')
      setVisitedTabs(new Set(['approval']))
    }
  }, [isAkhilesh, activeTab])

  // Once Akhilesh's profile loads, switch from default 'clients' to 'approval'
  useEffect(() => {
    if (isAkhilesh && activeTab === 'clients') {
      setActiveTab('approval')
      setVisitedTabs(new Set(['approval']))
    }
  }, [isAkhilesh])
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)

  const handleTabChange = (tab: string) => {
    setVisitedTabs(prev => { const next = new Set(prev); next.add(tab); return next })
    setActiveTab(tab)
    if (tab === 'notifications') {
      markAllRead().then(() => { setUnreadCount(0); fetchNotifications() })
    }
  }
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [notifLoading, setNotifLoading] = useState(false)

  const fetchNotifications = useCallback(async () => {
    setNotifLoading(true)
    const result = await getNotifications()
    setNotifications(result.data)
    setUnreadCount(result.unreadCount)
    setNotifLoading(false)
  }, [])

  useEffect(() => { fetchNotifications() }, [fetchNotifications])

  const [documents, setDocuments] = useState<Document[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null)
  const [departmentName, setDepartmentName] = useState<string>('')

  const fetchDocuments = useCallback(async () => {
    try {
      const timeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('timeout')), 8000)
      )
      const { data, departmentName: deptName } = await Promise.race([getMyDocuments(), timeout])
      setDepartmentName(deptName)
      setDocuments(data)
    } catch (err) {
      console.error('Error in fetchDocuments:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchDocuments()
  }, [])

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

  const notifTypeLabel: Record<string, string> = {
    info: 'Info',
    approval_request: 'Approval Request',
    approved: 'Approved',
    changes_requested: 'Changes Requested',
  }
  const notifTypeColor: Record<string, string> = {
    info: 'bg-blue-600/20 text-blue-400',
    approval_request: 'bg-amber-600/20 text-amber-400',
    approved: 'bg-green-600/20 text-green-400',
    changes_requested: 'bg-red-600/20 text-red-400',
  }

  const renderNotifications = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Notifications</h2>
        {notifications.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            className="text-gray-400 border-gray-700 hover:bg-gray-800"
            onClick={() => markAllRead().then(() => { setUnreadCount(0); fetchNotifications() })}
          >
            <CheckCheck className="h-3.5 w-3.5 mr-1.5" />
            Mark all read
          </Button>
        )}
      </div>

      {notifLoading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => (
            <Card key={i} className="bg-gray-800 border-gray-700 animate-pulse">
              <CardContent className="p-4">
                <div className="h-4 bg-gray-700 rounded w-1/2 mb-2" />
                <div className="h-3 bg-gray-700 rounded w-3/4" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="text-center py-12">
            <Bell className="mx-auto h-16 w-16 text-gray-500 mb-4" />
            <p className="text-gray-400">No notifications yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {notifications.map(n => (
            <Card key={n.id} className={`border-gray-700 transition-colors ${n.is_read ? 'bg-gray-800/60' : 'bg-gray-800 border-l-2 border-l-blue-500'}`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${notifTypeColor[n.type] ?? notifTypeColor.info}`}>
                        {notifTypeLabel[n.type] ?? n.type}
                      </span>
                      {!n.is_read && <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />}
                    </div>
                    <p className={`text-sm font-medium ${n.is_read ? 'text-gray-300' : 'text-white'}`}>{n.title}</p>
                    {n.message && <p className="text-xs text-gray-500 mt-0.5">{n.message}</p>}
                  </div>
                  <span className="text-xs text-gray-600 flex-shrink-0">
                    {new Date(n.created_at).toLocaleDateString()}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
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
            <p className="text-white">{departmentName || '—'}</p>
          </div>
          <div>
            <label className="text-sm text-gray-400">Role</label>
            <p className="text-white capitalize">{profile?.role}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )

  if (authLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-black">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <UserRoute>
      <div className="flex h-screen overflow-hidden bg-black">
        <Sidebar
          activeTab={activeTab}
          onTabChange={handleTabChange}
          userRole={profile?.role as "admin" | "user"}
          isMobileOpen={mobileSidebarOpen}
          onMobileClose={() => setMobileSidebarOpen(false)}
          departmentName={departmentName}
          notifUnreadCount={unreadCount}
        />

        {/* Main Content */}
        <div className="flex-1 overflow-auto">
          {/* Mobile top bar */}
          <div className="flex items-center gap-3 px-4 py-3 md:hidden border-b border-gray-800 bg-black">
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-800 border border-gray-700"
            >
              <Menu className="w-4 h-4 text-gray-400" />
            </button>
            <span className="text-white font-semibold text-sm">ANYA SEGEN</span>
          </div>
          <div className="p-4 md:p-8">
            {/* Lazy mount: render only after first visit, then keep alive to avoid refetch */}
            {visitedTabs.has('clients') && <div className={activeTab === 'clients' ? '' : 'hidden'}><SharedClients /></div>}
            {visitedTabs.has('tasks') && <div className={activeTab === 'tasks' ? '' : 'hidden'}><UserTasks /></div>}
            {visitedTabs.has('calendar') && <div className={activeTab === 'calendar' ? '' : 'hidden'}><UserCalendar /></div>}
            {visitedTabs.has('messages') && <div className={activeTab === 'messages' ? '' : 'hidden'}><ChatPanel /></div>}
            {visitedTabs.has('assets') && <div className={activeTab === 'assets' ? '' : 'hidden'}><UserAssets /></div>}
            {visitedTabs.has('content') && <div className={activeTab === 'content' ? 'h-full' : 'hidden'}><ContentHub /></div>}
            {visitedTabs.has('messaging') && <div className={activeTab === 'messaging' ? 'h-full' : 'hidden'}><MessagingBank readOnly /></div>}
            {visitedTabs.has('weekly-report') && <div className={activeTab === 'weekly-report' ? '' : 'hidden'}><WeeklyReport /></div>}
            {visitedTabs.has('kanban') && <div className={activeTab === 'kanban' ? '' : 'hidden'}><AdminKanban /></div>}
            {visitedTabs.has('departments') && <div className={activeTab === 'departments' ? '' : 'hidden'}><UserDepartments /></div>}
            {visitedTabs.has('approval') && <div className={activeTab === 'approval' ? '' : 'hidden'}><AkhileshApproval /></div>}
            <div className={['knowledge-base','search','notifications','profile'].includes(activeTab) ? '' : 'hidden'}>
              {activeTab === 'knowledge-base' && !isVikasRakesh && !isAkhilesh && renderKnowledgeBase()}
              {activeTab === 'search' && renderSearch()}
              {activeTab === 'notifications' && renderNotifications()}
              {activeTab === 'profile' && renderProfile()}
            </div>
          </div>
        </div>
      </div>
    </UserRoute>
  )
}