'use client'

import { useEffect, useState, Suspense, useCallback } from "react"
import dynamic from "next/dynamic"
import { Users, FileText, Settings, PenTool, Clock, AlertCircle, TrendingUp, Activity, Zap, CheckSquare, BarChart2, Menu, Bell, CheckCheck } from "lucide-react"
import { getNotifications, markAllRead, type Notification } from "@/app/actions/notifications"
import { getAdminStats } from "@/app/actions/admin-stats"
import AdminRoute from "@/components/AdminRoute"
import Sidebar from "@/components/Sidebar"
import { useAuth } from "@/lib/auth"
import { useRouter, useSearchParams } from "next/navigation"

const AdminDocuments   = dynamic(() => import("@/components/admin/documents/AdminDocuments"), { ssr: false })
const AdminClients     = dynamic(() => import("@/components/admin/clients/AdminClients"), { ssr: false })
const AdminCalendar    = dynamic(() => import("@/components/admin/AdminCalendar"), { ssr: false })
const AdminKanban      = dynamic(() => import("@/components/admin/AdminKanban"), { ssr: false })
const AdminTeamMembers = dynamic(() => import("@/components/admin/team/AdminTeamMembers"), { ssr: false })
const AdminAssets      = dynamic(() => import("@/components/admin/assets/AdminAssets"), { ssr: false })
const ContentHub       = dynamic(() => import("@/components/admin/content/ContentHub"), { ssr: false })
const MessagingBank    = dynamic(() => import("@/components/admin/content/MessagingBank"), { ssr: false })
const AdminSettings    = dynamic(() => import("@/components/admin/settings/AdminSettings"), { ssr: false })
const AdminWeeklyReports = dynamic(() => import("@/components/admin/AdminWeeklyReports"), { ssr: false })
const AgentsPanel      = dynamic(() => import("@/components/admin/agents/AgentsPanel"), { ssr: false })
const ChatPanel        = dynamic(() => import("@/components/user/ChatPanel"), { ssr: false })

interface DashboardStats {
  total_members: number
  total_documents: number
  total_departments: number
  content_this_month: number
  tasks_completed: number
  tasks_total: number
  content_pipeline: { draft: number; internal_review: number; pending_review: number; approved: number; scheduled: number; rejected: number }
}

const statCards = [
  {
    key: 'total_members',
    label: 'Total Members',
    sub: 'Active team members',
    icon: Users,
    gradient: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)',
    glow: 'rgba(139,92,246,0.35)',
    bg: 'rgba(139,92,246,0.08)',
    border: 'rgba(139,92,246,0.2)',
  },
  {
    key: 'total_documents',
    label: 'Documents',
    sub: 'Knowledge base articles',
    icon: FileText,
    gradient: 'linear-gradient(135deg, #ec4899 0%, #db2777 100%)',
    glow: 'rgba(236,72,153,0.35)',
    bg: 'rgba(236,72,153,0.08)',
    border: 'rgba(236,72,153,0.2)',
  },
  {
    key: 'total_departments',
    label: 'Departments',
    sub: 'Active departments',
    icon: Settings,
    gradient: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
    glow: 'rgba(6,182,212,0.35)',
    bg: 'rgba(6,182,212,0.08)',
    border: 'rgba(6,182,212,0.2)',
  },
]

function GlassCard({ children, className = '', style = {} }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={`rounded-2xl ${className}`}
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.07)',
        backdropFilter: 'blur(12px)',
        ...style,
      }}
    >
      {children}
    </div>
  )
}

function AdminDashboardContent() {
  const { user, profile } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [activeTab, setActiveTab] = useState(() => searchParams.get('tab') || 'overview')
  const [visitedTabs, setVisitedTabs] = useState<Set<string>>(new Set([searchParams.get('tab') || 'overview']))
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)

  const [adminNotifications, setAdminNotifications] = useState<Notification[]>([])
  const [adminUnreadCount, setAdminUnreadCount] = useState(0)
  const [adminNotifLoading, setAdminNotifLoading] = useState(false)

  const fetchAdminNotifications = useCallback(async () => {
    setAdminNotifLoading(true)
    const result = await getNotifications()
    setAdminNotifications(result.data)
    setAdminUnreadCount(result.unreadCount)
    setAdminNotifLoading(false)
  }, [])

  useEffect(() => { fetchAdminNotifications() }, [fetchAdminNotifications])

  const handleTabChange = (tab: string) => {
    setVisitedTabs(prev => { const next = new Set(prev); next.add(tab); return next })
    setActiveTab(tab)
    if (tab === 'notifications') {
      markAllRead().then(() => { setAdminUnreadCount(0); fetchAdminNotifications() })
    }
  }
  const defaultPipeline = { draft: 0, internal_review: 0, pending_review: 0, approved: 0, scheduled: 0, rejected: 0 }
  const [stats, setStats] = useState<DashboardStats>({
    total_members: 0, total_documents: 0, total_departments: 0,
    content_this_month: 0, tasks_completed: 0, tasks_total: 0,
    content_pipeline: defaultPipeline,
  })
  const [loading, setLoading] = useState(true)
  const [contentAlerts, setContentAlerts] = useState<{ pending: number; scheduled: any[] }>({ pending: 0, scheduled: [] })
  const [recentActivity, setRecentActivity] = useState<{ dot: string; text: string; time: string }[]>([])

  const fetchStats = async () => {
    try {
      const result = await getAdminStats()
      setStats({
        total_members: result.total_members,
        total_documents: result.total_documents,
        total_departments: result.total_departments,
        content_this_month: result.content_this_month,
        tasks_completed: result.tasks_completed,
        tasks_total: result.tasks_total,
        content_pipeline: result.content_pipeline,
      })
      setRecentActivity(result.recent_activity)
      setContentAlerts(result.content_alerts)
    } catch (err) {
      console.error('Error fetching stats:', err)
    }
  }

  useEffect(() => {
    setLoading(false)
    fetchStats().catch(console.error)
  }, [])

  useEffect(() => {
    const tab = searchParams.get('tab')
    if (tab) setActiveTab(tab)
  }, [searchParams])

  const renderOverview = () => {
    const pipe = stats.content_pipeline
    const pipeTotal = Object.values(pipe).reduce((a, b) => a + b, 0)
    const pipeSegments = [
      { key: 'draft', label: 'Draft', color: '#6b7280', val: pipe.draft },
      { key: 'internal_review', label: 'Internal Review', color: '#60a5fa', val: pipe.internal_review },
      { key: 'pending_review', label: 'Pending Akhilesh', color: '#f59e0b', val: pipe.pending_review },
      { key: 'approved', label: 'Approved', color: '#34d399', val: pipe.approved },
      { key: 'scheduled', label: 'Scheduled', color: '#a78bfa', val: pipe.scheduled },
      { key: 'rejected', label: 'Rejected', color: '#f87171', val: pipe.rejected },
    ]

    return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#34d399', boxShadow: '0 0 8px #34d399' }} />
            <span className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.4)' }}>Live Dashboard</span>
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">
            Welcome back, <span style={{
              background: 'linear-gradient(135deg, #a78bfa, #ec4899)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>{[profile?.first_name, profile?.last_name].filter(Boolean).join(' ')}</span>
          </h1>
          <p className="mt-1 text-sm" style={{ color: 'rgba(255,255,255,0.35)' }}>
            Here&apos;s what&apos;s happening across your platform today.
          </p>
        </div>

        <div className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium" style={{
          background: 'rgba(139,92,246,0.1)',
          border: '1px solid rgba(139,92,246,0.25)',
          color: '#c4b5fd',
        }}>
          <Zap className="w-3.5 h-3.5" />
          Admin Access
        </div>
      </div>

      {/* Row 1: core stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {statCards.map((card) => {
          const Icon = card.icon
          const value = stats[card.key as keyof DashboardStats] as number
          return (
            <GlassCard key={card.key} style={{ background: card.bg, border: `1px solid ${card.border}` }}>
              <div className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: card.gradient, boxShadow: `0 4px 14px ${card.glow}` }}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex items-center gap-1 text-xs" style={{ color: '#34d399' }}>
                    <TrendingUp className="w-3 h-3" />
                    <span>Live</span>
                  </div>
                </div>
                <div className="text-3xl font-bold text-white mb-1">
                  {loading ? <div className="w-10 h-7 rounded animate-pulse" style={{ background: 'rgba(255,255,255,0.1)' }} /> : value}
                </div>
                <p className="text-sm font-medium text-white mb-0.5">{card.label}</p>
                <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>{card.sub}</p>
              </div>
            </GlassCard>
          )
        })}
      </div>

      {/* Row 2: activity stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {/* Content this month */}
        <GlassCard style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.18)' }}>
          <div className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#10b981,#059669)', boxShadow: '0 4px 14px rgba(16,185,129,0.3)' }}>
                <BarChart2 className="w-5 h-5 text-white" />
              </div>
              <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(16,185,129,0.12)', color: '#6ee7b7', border: '1px solid rgba(16,185,129,0.2)' }}>This Month</span>
            </div>
            <div className="text-3xl font-bold text-white mb-1">
              {loading ? <div className="w-10 h-7 rounded animate-pulse" style={{ background: 'rgba(255,255,255,0.1)' }} /> : stats.content_this_month}
            </div>
            <p className="text-sm font-medium text-white mb-0.5">Content Posts</p>
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>Created this month</p>
          </div>
        </GlassCard>

        {/* Tasks */}
        <GlassCard style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.18)' }}>
          <div className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#f59e0b,#d97706)', boxShadow: '0 4px 14px rgba(245,158,11,0.3)' }}>
                <CheckSquare className="w-5 h-5 text-white" />
              </div>
              <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(245,158,11,0.12)', color: '#fcd34d', border: '1px solid rgba(245,158,11,0.2)' }}>Kanban</span>
            </div>
            <div className="text-3xl font-bold text-white mb-1">
              {loading ? <div className="w-10 h-7 rounded animate-pulse" style={{ background: 'rgba(255,255,255,0.1)' }} /> : (
                <span>{stats.tasks_completed}<span className="text-lg text-white/40 font-normal"> / {stats.tasks_total}</span></span>
              )}
            </div>
            <p className="text-sm font-medium text-white mb-0.5">Tasks Completed</p>
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
              {stats.tasks_total > 0 ? `${Math.round((stats.tasks_completed / stats.tasks_total) * 100)}% completion rate` : 'No tasks yet'}
            </p>
          </div>
        </GlassCard>

      </div>

      {/* Content Pipeline bar */}
      <GlassCard>
        <div className="p-5">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#6366f1,#4f46e5)' }}>
              <PenTool className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Content Pipeline</h3>
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>{pipeTotal} total posts this month</p>
            </div>
          </div>

          {/* Stacked bar */}
          {pipeTotal > 0 ? (
            <div className="rounded-full overflow-hidden flex h-3 mb-4" style={{ background: 'rgba(255,255,255,0.05)' }}>
              {pipeSegments.filter(s => s.val > 0).map(s => (
                <div key={s.key} title={`${s.label}: ${s.val}`}
                  style={{ width: `${(s.val / pipeTotal) * 100}%`, background: s.color, transition: 'width 0.4s' }} />
              ))}
            </div>
          ) : (
            <div className="rounded-full h-3 mb-4" style={{ background: 'rgba(255,255,255,0.05)' }} />
          )}

          {/* Legend */}
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            {pipeSegments.map(s => (
              <div key={s.key} className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: s.color }} />
                <span className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>{s.label}</span>
                <span className="text-xs font-semibold text-white">{s.val}</span>
              </div>
            ))}
          </div>
        </div>
      </GlassCard>

      {/* Content alerts */}
      {(contentAlerts.pending > 0 || contentAlerts.scheduled.length > 0) && (
        <GlassCard>
          <div className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
                <AlertCircle className="w-4 h-4 text-white" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">Action Required</h3>
                <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>Items needing your attention</p>
              </div>
            </div>
            <div className="space-y-2">
              {contentAlerts.pending > 0 && (
                <button
                  onClick={() => setActiveTab('content')}
                  className="w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all hover:scale-[1.01]"
                  style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)' }}
                >
                  <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-white">
                      {contentAlerts.pending} post{contentAlerts.pending > 1 ? 's' : ''} pending internal review
                    </p>
                    <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>Click to review</p>
                  </div>
                  <div className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: '#f59e0b', color: '#000' }}>
                    {contentAlerts.pending}
                  </div>
                </button>
              )}
              {contentAlerts.scheduled.map((post: any) => (
                <button
                  key={post.id}
                  onClick={() => setActiveTab('content')}
                  className="w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all hover:scale-[1.01]"
                  style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)' }}
                >
                  <Clock className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-white">{post.title || 'Scheduled Post'}</p>
                    <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
                      Scheduled for {new Date(post.scheduled_for).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </GlassCard>
      )}

      {/* Recent Activity — real data */}
      <GlassCard>
        <div className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)' }}>
                <Activity className="w-4 h-4 text-white" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">Recent Activity</h3>
                <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>Latest updates from content, tasks & photos</p>
              </div>
            </div>
            <span className="text-xs px-2.5 py-1 rounded-full" style={{
              background: 'rgba(139,92,246,0.1)', color: '#c4b5fd', border: '1px solid rgba(139,92,246,0.2)',
            }}>Live</span>
          </div>
          <div className="space-y-1">
            {recentActivity.length === 0 && !loading && (
              <p className="text-sm text-center py-4" style={{ color: 'rgba(255,255,255,0.3)' }}>No recent activity yet</p>
            )}
            {recentActivity.map((item, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-xl transition-colors hover:bg-white/[0.03]">
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: item.dot, boxShadow: `0 0 6px ${item.dot}` }} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate">{item.text}</p>
                </div>
                <span className="text-xs flex-shrink-0" style={{ color: 'rgba(255,255,255,0.3)' }}>{item.time}</span>
              </div>
            ))}
          </div>
        </div>
      </GlassCard>
    </div>
    )
  }

  const notifTypeLabel: Record<string, string> = {
    info: 'Info', approval_request: 'Approval Request', approved: 'Approved', changes_requested: 'Changes Requested',
  }
  const notifTypeColor: Record<string, string> = {
    info: 'bg-blue-600/20 text-blue-400',
    approval_request: 'bg-amber-600/20 text-amber-400',
    approved: 'bg-green-600/20 text-green-400',
    changes_requested: 'bg-red-600/20 text-red-400',
  }

  const renderAdminNotifications = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Notifications</h2>
        {adminNotifications.length > 0 && (
          <button
            className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors px-3 py-1.5 rounded-lg border border-gray-700 hover:bg-gray-800"
            onClick={() => markAllRead().then(() => { setAdminUnreadCount(0); fetchAdminNotifications() })}
          >
            <CheckCheck className="h-3.5 w-3.5" />
            Mark all read
          </button>
        )}
      </div>
      {adminNotifLoading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => (
            <GlassCard key={i}>
              <div className="p-4 animate-pulse">
                <div className="h-4 bg-white/10 rounded w-1/2 mb-2" />
                <div className="h-3 bg-white/10 rounded w-3/4" />
              </div>
            </GlassCard>
          ))}
        </div>
      ) : adminNotifications.length === 0 ? (
        <GlassCard>
          <div className="text-center py-12">
            <Bell className="mx-auto h-16 w-16 text-gray-600 mb-4" />
            <p className="text-gray-400">No notifications yet</p>
          </div>
        </GlassCard>
      ) : (
        <div className="space-y-3">
          {adminNotifications.map(n => (
            <GlassCard key={n.id} style={n.is_read ? {} : { borderLeft: '2px solid #3b82f6' }}>
              <div className="p-4">
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
              </div>
            </GlassCard>
          ))}
        </div>
      )}
    </div>
  )

  const fullBleedTabs = ['documents', 'clients', 'content', 'messaging', 'calendar', 'kanban', 'messages', 'assets']

  return (
    <AdminRoute>
      <div className="flex h-screen overflow-hidden" style={{ background: '#07070d' }}>
        {/* Background gradients */}
        <div className="fixed inset-0 pointer-events-none z-0">
          <div style={{
            position: 'absolute', top: 0, left: '20%', width: '40%', height: '40%',
            background: 'radial-gradient(ellipse, rgba(139,92,246,0.06) 0%, transparent 70%)',
          }} />
          <div style={{
            position: 'absolute', bottom: 0, right: '10%', width: '35%', height: '35%',
            background: 'radial-gradient(ellipse, rgba(236,72,153,0.05) 0%, transparent 70%)',
          }} />
        </div>

        <Sidebar
          activeTab={activeTab}
          onTabChange={handleTabChange}
          userRole="admin"
          isMobileOpen={mobileSidebarOpen}
          onMobileClose={() => setMobileSidebarOpen(false)}
          notifUnreadCount={adminUnreadCount}
        />

        {/* Main content */}
        <div className="flex-1 overflow-auto relative z-10">
          {/* Mobile top bar */}
          <div className="flex items-center gap-3 px-4 py-3 md:hidden border-b" style={{ borderColor: 'rgba(255,255,255,0.06)', background: '#07070d' }}>
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="w-8 h-8 flex items-center justify-center rounded-lg"
              style={{ background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.3)' }}
            >
              <Menu className="w-4 h-4 text-purple-400" />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #8b5cf6, #ec4899)' }}>
                <span className="text-white text-[10px] font-bold">AS</span>
              </div>
              <span className="text-white font-semibold text-sm">ANYA SEGEN</span>
            </div>
          </div>

          {/* Full-bleed tabs — lazy mount on first visit, then keep alive */}
          <div className={`h-full ${fullBleedTabs.includes(activeTab) ? '' : 'hidden'}`}>
            {visitedTabs.has('messages') && <div className={activeTab === 'messages' ? 'h-full' : 'hidden'}><ChatPanel /></div>}
            {visitedTabs.has('assets') && <div className={activeTab === 'assets' ? 'h-full' : 'hidden'}><AdminAssets /></div>}
            {visitedTabs.has('clients') && <div className={activeTab === 'clients' ? 'h-full' : 'hidden'}><AdminClients user={user} /></div>}
            {visitedTabs.has('content') && <div className={activeTab === 'content' ? 'h-full' : 'hidden'}><ContentHub /></div>}
            {visitedTabs.has('messaging') && <div className={activeTab === 'messaging' ? 'h-full' : 'hidden'}><MessagingBank /></div>}
            {visitedTabs.has('documents') && <div className={activeTab === 'documents' ? 'h-full' : 'hidden'}><AdminDocuments user={user} /></div>}
            {visitedTabs.has('calendar') && <div className={activeTab === 'calendar' ? 'h-full' : 'hidden'}><AdminCalendar /></div>}
            {visitedTabs.has('kanban') && <div className={activeTab === 'kanban' ? 'h-full' : 'hidden'}><AdminKanban /></div>}
          </div>

          {/* Padded tabs — lazy mount on first visit, then keep alive */}
          <div className={`p-4 md:p-8 ${!fullBleedTabs.includes(activeTab) ? '' : 'hidden'}`}>
            <div className={activeTab === 'overview' ? '' : 'hidden'}>{renderOverview()}</div>
            {visitedTabs.has('agents') && <div className={activeTab === 'agents' ? '' : 'hidden'}><AgentsPanel /></div>}
            {visitedTabs.has('members') && <div className={activeTab === 'members' ? '' : 'hidden'}><AdminTeamMembers /></div>}
            {visitedTabs.has('weekly-reports') && <div className={activeTab === 'weekly-reports' ? '' : 'hidden'}><AdminWeeklyReports /></div>}
            {visitedTabs.has('settings') && <div className={activeTab === 'settings' ? '' : 'hidden'}><AdminSettings /></div>}
            {visitedTabs.has('notifications') && <div className={activeTab === 'notifications' ? '' : 'hidden'}>{renderAdminNotifications()}</div>}
          </div>
        </div>
      </div>
    </AdminRoute>
  )
}

export default function AdminDashboard() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#07070d' }}>
        <div className="text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl mx-auto flex items-center justify-center" style={{
            background: 'linear-gradient(135deg, #8b5cf6, #ec4899)',
            boxShadow: '0 0 30px rgba(139,92,246,0.4)',
          }}>
            <span className="text-white text-sm font-bold">AS</span>
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-center gap-1.5">
              {[0, 1, 2].map(i => (
                <div key={i} className="w-1.5 h-1.5 rounded-full animate-bounce" style={{
                  background: 'linear-gradient(135deg, #8b5cf6, #ec4899)',
                  animationDelay: `${i * 0.15}s`,
                }} />
              ))}
            </div>
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>Loading dashboard...</p>
          </div>
        </div>
      </div>
    }>
      <AdminDashboardContent />
    </Suspense>
  )
}
