'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  Crown, Share2, Building2, ShieldCheck,
  Plus, Trash2, AlertTriangle, Clock, CheckCircle2,
  ChevronDown, ChevronUp, Calendar, Loader2, X,
  Bot, Image, Film, Clapperboard, ExternalLink, Globe, User,
} from 'lucide-react'
import {
  getAgents, getAgentTasks, createAgentTask, updateTaskStatus, deleteAgentTask,
  type WorkflowAgent, type AgentTask,
} from '@/app/actions/agent-workflow'
import {
  getPostsForVerification, updateVerificationStatus, getPostStatsBySource,
  type VerifiablePost, type VerificationStats, type VerificationStatus, type SourceStats,
} from '@/app/actions/verification'

// ─── Status config ─────────────────────────────────────────────────────────
const STATUS = {
  urgent: {
    label: 'Urgent',
    color: '#ef4444',
    bg: 'rgba(239,68,68,0.12)',
    border: 'rgba(239,68,68,0.35)',
    leftBorder: '#ef4444',
    Icon: AlertTriangle,
  },
  pending: {
    label: 'Pending',
    color: '#f97316',
    bg: 'rgba(249,115,22,0.12)',
    border: 'rgba(249,115,22,0.35)',
    leftBorder: '#f97316',
    Icon: Clock,
  },
  approved: {
    label: 'Approved',
    color: '#22c55e',
    bg: 'rgba(34,197,94,0.12)',
    border: 'rgba(34,197,94,0.35)',
    leftBorder: '#22c55e',
    Icon: CheckCircle2,
  },
} as const
type StatusKey = keyof typeof STATUS

// ─── Content type config ────────────────────────────────────────────────────
const CONTENT_TYPES = {
  post:  { label: 'Post',  Icon: Image,        color: '#60a5fa', bg: 'rgba(96,165,250,0.12)',  border: 'rgba(96,165,250,0.3)'  },
  reel:  { label: 'Reel',  Icon: Film,         color: '#a78bfa', bg: 'rgba(167,139,250,0.12)', border: 'rgba(167,139,250,0.3)' },
  vlog:  { label: 'Vlog',  Icon: Clapperboard, color: '#f472b6', bg: 'rgba(244,114,182,0.12)', border: 'rgba(244,114,182,0.3)' },
} as const
type ContentTypeKey = keyof typeof CONTENT_TYPES

const ICON_MAP: Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  share2: Share2,
  building2: Building2,
  'shield-check': ShieldCheck,
  crown: Crown,
}

// ─── Social Media Add Task Form ─────────────────────────────────────────────
function SocialMediaAddForm({
  agentId, onClose, onCreated,
}: { agentId: string; onClose: () => void; onCreated: () => void }) {
  const [title,       setTitle]       = useState('')
  const [photoNotes,  setPhotoNotes]  = useState('')
  const [caption,     setCaption]     = useState('')
  const [contentType, setContentType] = useState<ContentTypeKey>('post')
  const [status,      setStatus]      = useState<StatusKey>('pending')
  const [dueDate,     setDueDate]     = useState('')
  const [saving,      setSaving]      = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    setSaving(true)
    await createAgentTask({
      agent_id:     agentId,
      title:        title.trim(),
      content_type: contentType,
      photo_notes:  photoNotes.trim() || undefined,
      caption:      caption.trim()    || undefined,
      status,
      due_date:     dueDate           || undefined,
    })
    setSaving(false)
    onCreated()
    onClose()
  }

  return (
    <div className="rounded-xl p-4 mt-3" style={{ background: 'rgba(24,119,242,0.06)', border: '1px solid rgba(24,119,242,0.2)' }}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-semibold text-white">New Content Task</span>
        <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors"><X className="w-4 h-4" /></button>
      </div>
      <form onSubmit={handleSubmit} className="space-y-3">
        {/* Content type selector */}
        <div className="flex gap-2">
          {(Object.keys(CONTENT_TYPES) as ContentTypeKey[]).map(ct => {
            const cfg = CONTENT_TYPES[ct]
            const Icon = cfg.Icon
            return (
              <button key={ct} type="button" onClick={() => setContentType(ct)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                style={contentType === ct
                  ? { background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.color }
                  : { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.35)' }
                }>
                <Icon className="w-3.5 h-3.5" />{cfg.label}
              </button>
            )
          })}
        </div>

        <input type="text" placeholder="Task title *" value={title} onChange={e => setTitle(e.target.value)} required
          className="w-full text-sm px-3 py-2 rounded-lg text-white placeholder-gray-500 outline-none"
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }} />

        <textarea placeholder="Photo / video selection notes (which photos to use, scene, etc.)" value={photoNotes}
          onChange={e => setPhotoNotes(e.target.value)} rows={2}
          className="w-full text-sm px-3 py-2 rounded-lg text-white placeholder-gray-500 outline-none resize-none"
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }} />

        <textarea placeholder="Caption / content for this post" value={caption}
          onChange={e => setCaption(e.target.value)} rows={3}
          className="w-full text-sm px-3 py-2 rounded-lg text-white placeholder-gray-500 outline-none resize-none"
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }} />

        {/* Status + Due date + Submit */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex gap-1.5">
            {(Object.keys(STATUS) as StatusKey[]).map(s => {
              const cfg = STATUS[s]; const Icon = cfg.Icon
              return (
                <button key={s} type="button" onClick={() => setStatus(s)}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-all"
                  style={status === s
                    ? { background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.color }
                    : { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.35)' }
                  }>
                  <Icon className="w-3 h-3" />{cfg.label}
                </button>
              )
            })}
          </div>
          <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
            className="text-xs px-2 py-1.5 rounded-lg text-white outline-none"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', colorScheme: 'dark' }} />
          <button type="submit" disabled={saving || !title.trim()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-all disabled:opacity-40 ml-auto"
            style={{ background: 'linear-gradient(135deg,#1877f2,#0d5bbf)', boxShadow: '0 2px 8px rgba(24,119,242,0.3)' }}>
            {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
            Add Task
          </button>
        </div>
      </form>
    </div>
  )
}

// ─── Social Media Task Card ─────────────────────────────────────────────────
function SocialMediaTaskCard({ task, onStatusChange, onDelete }: {
  task: AgentTask
  onStatusChange: (id: string, s: StatusKey) => void
  onDelete: (id: string) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const statusCfg = STATUS[task.status as StatusKey] ?? STATUS.pending
  const StatusIcon = statusCfg.Icon
  const ctCfg = task.content_type ? CONTENT_TYPES[task.content_type] : null
  const ContentIcon = ctCfg?.Icon

  return (
    <div className="rounded-xl overflow-hidden transition-all"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderLeft: `3px solid ${statusCfg.leftBorder}` }}>
      {/* Header row */}
      <div className="flex items-center gap-2 p-3">
        {/* Content type badge */}
        {ctCfg && ContentIcon && (
          <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0"
            style={{ background: ctCfg.bg, border: `1px solid ${ctCfg.border}`, color: ctCfg.color }}>
            <ContentIcon className="w-3 h-3" />{ctCfg.label}
          </span>
        )}
        <p className="text-sm font-medium text-white flex-1 truncate">{task.title}</p>
        {/* Status badge */}
        <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0"
          style={{ background: statusCfg.bg, border: `1px solid ${statusCfg.border}`, color: statusCfg.color }}>
          <StatusIcon className="w-3 h-3" />{statusCfg.label}
        </span>
        {/* Expand toggle */}
        <button onClick={() => setExpanded(e => !e)} className="text-gray-500 hover:text-white transition-colors flex-shrink-0">
          {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="px-3 pb-3 space-y-2 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          {task.photo_notes && (
            <div className="mt-2">
              <p className="text-xs font-semibold mb-1" style={{ color: 'rgba(255,255,255,0.35)' }}>
                📸 Photo / Video Notes
              </p>
              <p className="text-xs text-white/70 whitespace-pre-wrap">{task.photo_notes}</p>
            </div>
          )}
          {task.caption && (
            <div>
              <p className="text-xs font-semibold mb-1" style={{ color: 'rgba(255,255,255,0.35)' }}>
                ✍️ Caption
              </p>
              <p className="text-xs text-white/70 whitespace-pre-wrap">{task.caption}</p>
            </div>
          )}
          {task.due_date && (
            <p className="flex items-center gap-1.5 text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
              <Calendar className="w-3 h-3" />
              Due: {new Date(task.due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
            </p>
          )}
          {/* Actions */}
          <div className="flex items-center gap-1.5 pt-1 flex-wrap">
            <span className="text-xs mr-1" style={{ color: 'rgba(255,255,255,0.25)' }}>Move to:</span>
            {(Object.keys(STATUS) as StatusKey[]).filter(s => s !== task.status).map(s => {
              const c = STATUS[s]; const Icon = c.Icon
              return (
                <button key={s} onClick={() => onStatusChange(task.id, s)}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-all hover:scale-105"
                  style={{ background: c.bg, border: `1px solid ${c.border}`, color: c.color }}>
                  <Icon className="w-3 h-3" />{c.label}
                </button>
              )
            })}
            <button onClick={() => onDelete(task.id)}
              className="ml-auto flex items-center gap-1 px-2 py-1 rounded-lg text-xs transition-all hover:scale-105"
              style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171' }}>
              <Trash2 className="w-3 h-3" /> Delete
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Twitter account definitions ────────────────────────────────────────────
const TWITTER_ACCOUNTS = {
  dipr_uk: {
    handle: 'dipr_uk', username: 'DIPR_UK', label: 'DIPR Official',
    color: '#1d9bf0', gradient: 'linear-gradient(135deg,#1d9bf0,#0d8bd9)', shadow: 'rgba(29,155,240,0.35)',
  },
  pushkardhami: {
    handle: 'pushkardhami', username: 'pushkardhami', label: 'CM Pushkar Dhami',
    color: '#60a5fa', gradient: 'linear-gradient(135deg,#60a5fa,#3b82f6)', shadow: 'rgba(96,165,250,0.35)',
  },
  bjp4uk: {
    handle: 'bjp4uk', username: 'bjp4uk', label: 'BJP Uttarakhand',
    color: '#f97316', gradient: 'linear-gradient(135deg,#f97316,#ea580c)', shadow: 'rgba(249,115,22,0.35)',
  },
} as const
type TwitterAccountKey = keyof typeof TWITTER_ACCOUNTS

// ─── Social Media Analyst Sub-Panel ─────────────────────────────────────────
function SocialMediaPanel({ agent, onRefresh }: { agent: WorkflowAgent; onRefresh: () => void }) {
  const [tasks,        setTasks]        = useState<AgentTask[]>([])
  const [loading,      setLoading]      = useState(false)
  const [filter,       setFilter]       = useState<'all' | ContentTypeKey>('all')
  const [showForm,     setShowForm]     = useState(false)
  const [expanded,     setExpanded]     = useState(false)
  const [syncing,      setSyncing]      = useState<string | null>(null)
  const [syncMsg,      setSyncMsg]      = useState<string | null>(null)
  const [twitterStats, setTwitterStats] = useState<SourceStats>({ total: 0, verified: 0, has_errors: 0, in_review: 0, unchecked: 0 })
  const [byAccount,    setByAccount]    = useState<Record<string, SourceStats>>({})
  const counts = agent.task_counts ?? { urgent: 0, pending: 0, approved: 0, total: 0 }

  const loadStats = useCallback(async () => {
    const r = await getPostStatsBySource()
    setTwitterStats(r.twitter)
    setByAccount(r.by_account)
  }, [])

  const handleSync = async (account?: string) => {
    const key = account ?? 'all'
    setSyncing(key); setSyncMsg(null)
    try {
      const url = account ? `/api/twitter/sync?account=${account}` : '/api/twitter/sync'
      const res = await fetch(url)
      const json = await res.json()
      if (json.error) setSyncMsg(`Error: ${json.error}`)
      else setSyncMsg(`Synced ${json.synced} new tweet${json.synced !== 1 ? 's' : ''}${account ? ` from @${TWITTER_ACCOUNTS[account as TwitterAccountKey]?.username ?? account}` : ' across all accounts'}`)
    } catch {
      setSyncMsg('Sync failed')
    }
    setSyncing(null); loadStats(); onRefresh()
  }

  const handleFacebookSync = async () => {
    setSyncing('fb'); setSyncMsg(null)
    try {
      const res = await fetch('/api/facebook/sync')
      const json = await res.json()
      if (json.error) setSyncMsg(`Facebook: ${json.error}`)
      else setSyncMsg(`Facebook: synced ${json.synced} new post${json.synced !== 1 ? 's' : ''}`)
    } catch {
      setSyncMsg('Facebook sync failed')
    }
    setSyncing(null); loadStats(); onRefresh()
  }

  const loadTasks = useCallback(async () => {
    setLoading(true)
    const r = await getAgentTasks(agent.id)
    setTasks(r.data)
    setLoading(false)
  }, [agent.id])

  useEffect(() => { if (expanded) { loadTasks(); loadStats() } }, [expanded, loadTasks, loadStats])

  const handleStatusChange = async (id: string, s: StatusKey) => {
    await updateTaskStatus(id, s); await loadTasks(); onRefresh()
  }
  const handleDelete = async (id: string) => {
    await deleteAgentTask(id); await loadTasks(); onRefresh()
  }

  const filtered = filter === 'all' ? tasks : tasks.filter(t => t.content_type === filter)

  const typeCounts = {
    post:  tasks.filter(t => t.content_type === 'post').length,
    reel:  tasks.filter(t => t.content_type === 'reel').length,
    vlog:  tasks.filter(t => t.content_type === 'vlog').length,
  }

  return (
    <div className="rounded-2xl overflow-hidden"
      style={{ background: 'rgba(24,119,242,0.05)', border: '1px solid rgba(24,119,242,0.2)' }}>
      {/* Card header */}
      <button className="w-full flex items-center gap-3 p-4 text-left transition-colors hover:bg-white/[0.02]"
        onClick={() => setExpanded(e => !e)}>
        {/* FB icon */}
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: 'linear-gradient(135deg,#1877f2,#0d5bbf)', boxShadow: '0 4px 12px rgba(24,119,242,0.35)' }}>
          <Globe className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <p className="text-sm font-semibold text-white">Social Media Analyst</p>
            <span className="text-xs px-1.5 py-0.5 rounded font-medium"
              style={{ background: 'rgba(24,119,242,0.2)', color: '#60a5fa', border: '1px solid rgba(24,119,242,0.3)' }}>
              Facebook
            </span>
          </div>
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
            UttarakhandDIPR · Posts · Reels · Vlogs
          </p>
        </div>
        {/* Counts */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {counts.urgent  > 0 && <span className="text-xs px-1.5 py-0.5 rounded-md font-bold" style={{ background: 'rgba(239,68,68,0.2)',   color: '#ef4444' }}>{counts.urgent}</span>}
          {counts.pending > 0 && <span className="text-xs px-1.5 py-0.5 rounded-md font-bold" style={{ background: 'rgba(249,115,22,0.2)',  color: '#f97316' }}>{counts.pending}</span>}
          {counts.approved> 0 && <span className="text-xs px-1.5 py-0.5 rounded-md font-bold" style={{ background: 'rgba(34,197,94,0.2)',   color: '#22c55e' }}>{counts.approved}</span>}
          {expanded ? <ChevronUp className="w-4 h-4 text-gray-500 ml-1" /> : <ChevronDown className="w-4 h-4 text-gray-500 ml-1" />}
        </div>
      </button>

      {expanded && (
        <div className="border-t px-4 pb-4" style={{ borderColor: 'rgba(24,119,242,0.15)' }}>

          {/* ── Twitter account cards ── */}
          <div className="mt-4 mb-3">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.3)' }}>
                Twitter / X Accounts
              </span>
              <button onClick={() => handleSync()} disabled={!!syncing}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-semibold text-white transition-all disabled:opacity-50 hover:scale-[1.02]"
                style={{ background: 'linear-gradient(135deg,#1d9bf0,#0d8bd9)', boxShadow: '0 2px 8px rgba(29,155,240,0.3)' }}>
                {syncing === 'all' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Share2 className="w-3 h-3" />}
                {syncing === 'all' ? 'Syncing all…' : 'Sync All'}
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {(Object.keys(TWITTER_ACCOUNTS) as TwitterAccountKey[]).map(key => {
                const acct = TWITTER_ACCOUNTS[key]
                const stats = byAccount[key] ?? { total: 0, verified: 0, has_errors: 0, in_review: 0, unchecked: 0 }
                const isSyncing = syncing === key
                const verifiedPct = stats.total > 0 ? Math.round((stats.verified / stats.total) * 100) : 0
                return (
                  <div key={key} className="rounded-xl p-3"
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    {/* Account header */}
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-2"
                      style={{ background: acct.gradient }}>
                      <Share2 className="w-4 h-4 text-white" />
                    </div>
                    <p className="text-xs font-semibold text-white leading-tight">{acct.label}</p>
                    <p className="text-xs mb-2" style={{ color: 'rgba(255,255,255,0.35)' }}>@{acct.username}</p>

                    {/* Mini stats */}
                    {stats.total > 0 && (
                      <div className="mb-2">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>{stats.total} posts</span>
                          <span className="text-xs font-bold" style={{ color: verifiedPct === 100 ? '#22c55e' : verifiedPct > 50 ? '#f97316' : '#ef4444' }}>
                            {verifiedPct}% ✓
                          </span>
                        </div>
                        <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
                          {stats.verified > 0 && <div className="h-full rounded-full" style={{ width: `${(stats.verified/stats.total)*100}%`, background: '#22c55e' }} />}
                        </div>
                      </div>
                    )}

                    {/* Sync button */}
                    <button onClick={() => handleSync(key)} disabled={!!syncing}
                      className="w-full flex items-center justify-center gap-1 text-xs px-2 py-1.5 rounded-lg font-medium transition-all disabled:opacity-40 hover:scale-[1.02]"
                      style={{ background: `${acct.color}22`, border: `1px solid ${acct.color}44`, color: acct.color }}>
                      {isSyncing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Share2 className="w-3 h-3" />}
                      {isSyncing ? 'Syncing…' : 'Sync'}
                    </button>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Sync status message */}
          {syncMsg && (
            <p className="text-xs mb-3 px-1" style={{ color: syncMsg.includes('Error') || syncMsg.includes('failed') ? '#f87171' : '#86efac' }}>
              {syncMsg}
            </p>
          )}

          {/* Overall Twitter verification stats bar */}
          {twitterStats.total > 0 && (
            <div className="mb-4 p-3 rounded-xl" style={{ background: 'rgba(29,155,240,0.06)', border: '1px solid rgba(29,155,240,0.15)' }}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-white">All Accounts — Verification Status</span>
                <span className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>{twitterStats.total} total</span>
              </div>
              <div className="w-full h-3 rounded-full overflow-hidden flex" style={{ background: 'rgba(255,255,255,0.06)' }}>
                {twitterStats.verified > 0 && <div className="h-full transition-all duration-700" style={{ width: `${(twitterStats.verified/twitterStats.total)*100}%`, background: 'linear-gradient(90deg,#22c55e,#16a34a)' }} />}
                {twitterStats.has_errors > 0 && <div className="h-full transition-all duration-700" style={{ width: `${(twitterStats.has_errors/twitterStats.total)*100}%`, background: 'linear-gradient(90deg,#ef4444,#dc2626)' }} />}
                {twitterStats.in_review > 0 && <div className="h-full transition-all duration-700" style={{ width: `${(twitterStats.in_review/twitterStats.total)*100}%`, background: 'linear-gradient(90deg,#f97316,#ea580c)' }} />}
                {twitterStats.unchecked > 0 && <div className="h-full rounded-r-full transition-all duration-700" style={{ width: `${(twitterStats.unchecked/twitterStats.total)*100}%`, background: 'rgba(255,255,255,0.1)' }} />}
              </div>
              <div className="flex items-center gap-4 mt-2 flex-wrap">
                {[
                  { label: 'Verified',   val: twitterStats.verified,   color: '#22c55e' },
                  { label: 'Has Errors', val: twitterStats.has_errors, color: '#ef4444' },
                  { label: 'In Review',  val: twitterStats.in_review,  color: '#f97316' },
                  { label: 'Unchecked',  val: twitterStats.unchecked,  color: 'rgba(255,255,255,0.25)' },
                ].map(item => item.val > 0 && (
                  <div key={item.label} className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: item.color }} />
                    <span className="text-xs" style={{ color: 'rgba(255,255,255,0.45)' }}>{item.label}</span>
                    <span className="text-xs font-bold text-white">{item.val}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Facebook — pending App Review */}
          <div className="flex items-center gap-3 py-2.5 px-3 rounded-xl mb-4"
            style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 opacity-40"
              style={{ background: '#1877f2' }}>
              <span className="text-white font-bold text-xs">f</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-white opacity-40">UttarakhandDIPR · Facebook</p>
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>Pending Meta App Review approval</p>
            </div>
            <button onClick={handleFacebookSync} disabled={!!syncing}
              className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg transition-all opacity-40 hover:opacity-60 disabled:cursor-not-allowed"
              style={{ background: 'rgba(24,119,242,0.15)', border: '1px solid rgba(24,119,242,0.2)', color: '#60a5fa' }}>
              {syncing === 'fb' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Globe className="w-3 h-3" />}
              Sync
            </button>
          </div>

          {/* Content type filter tabs */}
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <button onClick={() => setFilter('all')}
              className="text-xs px-3 py-1.5 rounded-lg font-medium transition-all"
              style={filter === 'all'
                ? { background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)' }
                : { background: 'rgba(255,255,255,0.03)', color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.07)' }}>
              All ({tasks.length})
            </button>
            {(Object.keys(CONTENT_TYPES) as ContentTypeKey[]).map(ct => {
              const cfg = CONTENT_TYPES[ct]; const Icon = cfg.Icon
              return (
                <button key={ct} onClick={() => setFilter(ct)}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium transition-all"
                  style={filter === ct
                    ? { background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }
                    : { background: 'rgba(255,255,255,0.03)', color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <Icon className="w-3 h-3" />{cfg.label} ({typeCounts[ct]})
                </button>
              )
            })}
            <button onClick={() => setShowForm(f => !f)}
              className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg font-semibold transition-all ml-auto"
              style={{ background: 'rgba(24,119,242,0.15)', border: '1px solid rgba(24,119,242,0.3)', color: '#60a5fa' }}>
              <Plus className="w-3 h-3" /> Add Task
            </button>
          </div>

          {showForm && (
            <SocialMediaAddForm agentId={agent.id} onClose={() => setShowForm(false)}
              onCreated={() => { loadTasks(); onRefresh() }} />
          )}

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-blue-400" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-8 text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>
              No {filter === 'all' ? '' : filter + ' '}tasks yet — click Add Task to create one
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map(t => (
                <SocialMediaTaskCard key={t.id} task={t} onStatusChange={handleStatusChange} onDelete={handleDelete} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Verification Agent Panel ───────────────────────────────────────────────
const VSTATUS = {
  verified:   { label: 'Verified',   color: '#22c55e', bg: 'rgba(34,197,94,0.12)',   border: 'rgba(34,197,94,0.35)',   leftBorder: '#22c55e', Icon: CheckCircle2 },
  in_review:  { label: 'In Review',  color: '#f97316', bg: 'rgba(249,115,22,0.12)',  border: 'rgba(249,115,22,0.35)',  leftBorder: '#f97316', Icon: Clock },
  has_errors: { label: 'Has Errors', color: '#ef4444', bg: 'rgba(239,68,68,0.12)',   border: 'rgba(239,68,68,0.35)',   leftBorder: '#ef4444', Icon: AlertTriangle },
} as const

const WORKFLOW_STATUS_LABEL: Record<string, string> = {
  pending_review: 'Pending Review', internal_review: 'Internal Review',
  awaiting_approval: 'Awaiting Approval', approved: 'Approved',
  scheduled: 'Scheduled', published: 'Published', rejected: 'Rejected',
}

function proxyImg(url: string | null): string | null {
  if (!url) return null
  return `/api/img?url=${encodeURIComponent(url)}`
}

function VerificationPostCard({ post, onUpdated }: { post: VerifiablePost; onUpdated: () => void }) {
  const [expanded, setExpanded] = useState(false)
  const [notes,    setNotes]    = useState(post.verification_notes ?? '')
  const [saving,   setSaving]   = useState<VerificationStatus | null>(null)
  const cfg = post.verification_status ? VSTATUS[post.verification_status] : null
  const isFacebook = post.source === 'facebook'
  const isTwitter  = post.source === 'twitter'
  const imgSrc = proxyImg(post.featured_image)

  const markAs = async (s: VerificationStatus) => {
    setSaving(s)
    await updateVerificationStatus(post.id, s, notes || undefined)
    setSaving(null)
    onUpdated()
  }

  return (
    <div className="rounded-xl overflow-hidden transition-all"
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.07)',
        borderLeft: `3px solid ${cfg ? cfg.leftBorder : 'rgba(255,255,255,0.12)'}`,
      }}>
      {/* Header */}
      <div className="flex items-start gap-3 p-3">
        {/* Photo thumbnail */}
        {imgSrc && (
          <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-gray-800">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imgSrc} alt="" className="w-full h-full object-cover" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {isFacebook && (
              <span className="flex items-center gap-1 text-xs px-1.5 py-0.5 rounded font-semibold flex-shrink-0"
                style={{ background: 'rgba(24,119,242,0.18)', color: '#60a5fa', border: '1px solid rgba(24,119,242,0.3)' }}>
                <span className="font-bold">f</span> Facebook
              </span>
            )}
            {isTwitter && (
              <span className="flex items-center gap-1 text-xs px-1.5 py-0.5 rounded font-semibold flex-shrink-0"
                style={{ background: 'rgba(29,155,240,0.18)', color: '#38bdf8', border: '1px solid rgba(29,155,240,0.3)' }}>
                <Share2 className="w-3 h-3" /> Twitter / X
              </span>
            )}
            <p className="text-sm font-medium text-white truncate">{post.title || post.body.slice(0, 60) + '…'}</p>
          </div>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {isTwitter && post.source_url && (() => {
              const m = post.source_url.match(/x\.com\/([^/]+)\//)
              return m ? (
                <span className="text-xs px-1.5 py-0.5 rounded font-medium"
                  style={{ background: 'rgba(29,155,240,0.1)', color: '#38bdf8', border: '1px solid rgba(29,155,240,0.2)' }}>
                  @{m[1]}
                </span>
              ) : null
            })()}
            <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.35)' }}>
              {new Date(post.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
            </span>
          </div>
        </div>
        {/* Verification badge */}
        {cfg ? (
          <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0"
            style={{ background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.color }}>
            <cfg.Icon className="w-3 h-3" />{cfg.label}
          </span>
        ) : (
          <span className="text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.35)' }}>
            Unchecked
          </span>
        )}
        <button onClick={() => setExpanded(e => !e)} className="text-gray-500 hover:text-white transition-colors flex-shrink-0">
          {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Expanded */}
      {expanded && (
        <div className="px-3 pb-3 space-y-3 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          {/* Full photo if available */}
          {imgSrc && (
            <div className="mt-3 rounded-lg overflow-hidden" style={{ maxHeight: 220 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imgSrc} alt="" className="w-full object-cover rounded-lg" style={{ maxHeight: 220 }} />
            </div>
          )}
          {/* Post body */}
          <div className="p-3 rounded-lg text-xs text-white/60 whitespace-pre-wrap leading-relaxed"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', maxHeight: 120, overflowY: 'auto' }}>
            {post.body}
          </div>
          {/* Source link */}
          {post.source_url && (
            <a href={post.source_url} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs w-fit px-2 py-1 rounded-lg transition-all hover:scale-105"
              style={isTwitter
                ? { background: 'rgba(29,155,240,0.12)', border: '1px solid rgba(29,155,240,0.25)', color: '#38bdf8' }
                : { background: 'rgba(24,119,242,0.12)', border: '1px solid rgba(24,119,242,0.25)', color: '#60a5fa' }
              }>
              <ExternalLink className="w-3 h-3" />
              {isTwitter ? 'View on Twitter / X' : 'View on Facebook'}
            </a>
          )}
          {/* Error notes from Gemini */}
          {post.verification_notes && (
            <div className="p-2.5 rounded-lg text-xs" style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)' }}>
              <p className="font-semibold mb-1" style={{ color: '#fca5a5' }}>Issues found by AI:</p>
              <p className="text-white/60 whitespace-pre-wrap">{post.verification_notes}</p>
            </div>
          )}
          {/* Manual notes */}
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Add manual verification notes…"
            rows={2}
            className="w-full text-xs px-3 py-2 rounded-lg text-white placeholder-gray-600 outline-none resize-none"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
          />
          {/* Action buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            {(Object.keys(VSTATUS) as VerificationStatus[]).map(s => {
              const c = VSTATUS[s]
              const isActive = post.verification_status === s
              return (
                <button key={s} onClick={() => markAs(s)} disabled={!!saving}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium transition-all hover:scale-105 disabled:opacity-50"
                  style={isActive
                    ? { background: c.bg, border: `1px solid ${c.border}`, color: c.color, boxShadow: `0 0 10px ${c.color}30` }
                    : { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)' }
                  }>
                  {saving === s ? <Loader2 className="w-3 h-3 animate-spin" /> : <c.Icon className="w-3 h-3" />}
                  {c.label}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

function VerificationPanel({ agent, onRefresh }: { agent: WorkflowAgent; onRefresh: () => void }) {
  const [posts,    setPosts]    = useState<VerifiablePost[]>([])
  const [stats,    setStats]    = useState<VerificationStats>({ total: 0, verified: 0, in_review: 0, has_errors: 0, unchecked: 0 })
  const [loading,  setLoading]  = useState(false)
  const [filter,   setFilter]   = useState<'all' | VerificationStatus | 'unchecked'>('all')
  const [expanded, setExpanded] = useState(false)

  const loadPosts = useCallback(async () => {
    setLoading(true)
    const r = await getPostsForVerification()
    setPosts(r.data); setStats(r.stats); setLoading(false)
  }, [])

  useEffect(() => { if (expanded) loadPosts() }, [expanded, loadPosts])

  const filtered = filter === 'all'      ? posts
    : filter === 'unchecked'             ? posts.filter(p => !p.verification_status)
    : posts.filter(p => p.verification_status === filter)

  const pct = (n: number) => stats.total > 0 ? (n / stats.total) * 100 : 0

  return (
    <div className="rounded-2xl overflow-hidden"
      style={{ background: 'rgba(34,197,94,0.04)', border: '1px solid rgba(34,197,94,0.18)' }}>
      {/* Card header */}
      <button className="w-full flex items-center gap-3 p-4 text-left transition-colors hover:bg-white/[0.02]"
        onClick={() => setExpanded(e => !e)}>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: 'linear-gradient(135deg,#22c55e,#16a34a)', boxShadow: '0 4px 12px rgba(34,197,94,0.3)' }}>
          <ShieldCheck className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white">Verification Agent</p>
          <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
            Checks spelling & punctuation on all content posts
          </p>
        </div>
        {/* Signal chips */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {stats.has_errors > 0 && <span className="text-xs px-1.5 py-0.5 rounded-md font-bold" style={{ background: 'rgba(239,68,68,0.2)', color: '#ef4444' }}>{stats.has_errors}</span>}
          {stats.in_review  > 0 && <span className="text-xs px-1.5 py-0.5 rounded-md font-bold" style={{ background: 'rgba(249,115,22,0.2)', color: '#f97316' }}>{stats.in_review}</span>}
          {stats.verified   > 0 && <span className="text-xs px-1.5 py-0.5 rounded-md font-bold" style={{ background: 'rgba(34,197,94,0.2)', color: '#22c55e' }}>{stats.verified}</span>}
          {expanded ? <ChevronUp className="w-4 h-4 text-gray-500 ml-1" /> : <ChevronDown className="w-4 h-4 text-gray-500 ml-1" />}
        </div>
      </button>

      {expanded && (
        <div className="border-t px-4 pb-4" style={{ borderColor: 'rgba(34,197,94,0.12)' }}>
          {loading ? (
            <div className="flex items-center justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-green-400" /></div>
          ) : (
            <>
              {/* ── Progress bar ── */}
              <div className="mt-4 mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-white">Verification Progress</span>
                  <span className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>{stats.total} posts total</span>
                </div>
                {/* Stacked bar */}
                <div className="w-full h-4 rounded-full overflow-hidden flex gap-0.5"
                  style={{ background: 'rgba(255,255,255,0.06)' }}>
                  {stats.verified > 0 && (
                    <div title={`Verified: ${stats.verified}`} className="h-full rounded-l-full transition-all duration-700"
                      style={{ width: `${pct(stats.verified)}%`, background: 'linear-gradient(90deg,#22c55e,#16a34a)', boxShadow: '2px 0 8px rgba(34,197,94,0.4)' }} />
                  )}
                  {stats.in_review > 0 && (
                    <div title={`In Review: ${stats.in_review}`} className="h-full transition-all duration-700"
                      style={{ width: `${pct(stats.in_review)}%`, background: 'linear-gradient(90deg,#f97316,#ea580c)', boxShadow: '2px 0 8px rgba(249,115,22,0.4)' }} />
                  )}
                  {stats.has_errors > 0 && (
                    <div title={`Has Errors: ${stats.has_errors}`} className="h-full transition-all duration-700"
                      style={{ width: `${pct(stats.has_errors)}%`, background: 'linear-gradient(90deg,#ef4444,#dc2626)', boxShadow: '2px 0 8px rgba(239,68,68,0.4)' }} />
                  )}
                  {stats.unchecked > 0 && (
                    <div title={`Unchecked: ${stats.unchecked}`} className="h-full rounded-r-full transition-all duration-700"
                      style={{ width: `${pct(stats.unchecked)}%`, background: 'rgba(255,255,255,0.1)' }} />
                  )}
                </div>
                {/* Legend */}
                <div className="flex items-center gap-4 mt-2.5 flex-wrap">
                  {[
                    { label: 'Verified',   val: stats.verified,   color: '#22c55e' },
                    { label: 'In Review',  val: stats.in_review,  color: '#f97316' },
                    { label: 'Has Errors', val: stats.has_errors, color: '#ef4444' },
                    { label: 'Unchecked',  val: stats.unchecked,  color: 'rgba(255,255,255,0.25)' },
                  ].map(item => (
                    <div key={item.label} className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: item.color }} />
                      <span className="text-xs" style={{ color: 'rgba(255,255,255,0.45)' }}>{item.label}</span>
                      <span className="text-xs font-bold text-white">{item.val}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Filter tabs */}
              <div className="flex items-center gap-2 mb-3 flex-wrap">
                {[
                  { key: 'all',       label: `All (${stats.total})`,              color: null },
                  { key: 'unchecked', label: `Unchecked (${stats.unchecked})`,    color: 'rgba(255,255,255,0.25)' },
                  { key: 'in_review', label: `In Review (${stats.in_review})`,    color: '#f97316' },
                  { key: 'has_errors',label: `Has Errors (${stats.has_errors})`,  color: '#ef4444' },
                  { key: 'verified',  label: `Verified (${stats.verified})`,      color: '#22c55e' },
                ].map(tab => (
                  <button key={tab.key} onClick={() => setFilter(tab.key as any)}
                    className="text-xs px-3 py-1.5 rounded-lg font-medium transition-all"
                    style={filter === tab.key
                      ? { background: tab.color ? `${tab.color}20` : 'rgba(255,255,255,0.1)', color: tab.color ?? '#fff', border: `1px solid ${tab.color ? tab.color + '40' : 'rgba(255,255,255,0.2)'}` }
                      : { background: 'rgba(255,255,255,0.03)', color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.07)' }
                    }>
                    {tab.label}
                  </button>
                ))}
                <button onClick={loadPosts} className="ml-auto text-xs px-2 py-1.5 rounded-lg transition-all"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.4)' }}>
                  ↺ Refresh
                </button>
              </div>

              {/* Post list */}
              {filtered.length === 0 ? (
                <div className="text-center py-8 text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>
                  No posts in this filter
                </div>
              ) : (
                <div className="space-y-2">
                  {filtered.map(p => (
                    <VerificationPostCard key={p.id} post={p} onUpdated={loadPosts} />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Official Accounts Panel ────────────────────────────────────────────────
const ACCOUNTS = {
  dipr_official: {
    label: 'DIPR Official',
    shortLabel: 'DIPR',
    color: '#f59e0b',
    bg: 'rgba(245,158,11,0.12)',
    border: 'rgba(245,158,11,0.35)',
    gradient: 'linear-gradient(135deg,#f59e0b,#d97706)',
    shadow: 'rgba(245,158,11,0.35)',
    Icon: Building2,
    desc: 'Social Media · Official',
  },
  bjp_uk: {
    label: 'BJP Uttarakhand',
    shortLabel: 'BJP UK',
    color: '#f97316',
    bg: 'rgba(249,115,22,0.12)',
    border: 'rgba(249,115,22,0.35)',
    gradient: 'linear-gradient(135deg,#f97316,#ea580c)',
    shadow: 'rgba(249,115,22,0.35)',
    Icon: Globe,
    desc: 'Party · Official Account',
  },
  pushkar_dhami: {
    label: 'Pushkar Singh Dhami',
    shortLabel: 'CM Dhami',
    color: '#60a5fa',
    bg: 'rgba(96,165,250,0.12)',
    border: 'rgba(96,165,250,0.35)',
    gradient: 'linear-gradient(135deg,#60a5fa,#3b82f6)',
    shadow: 'rgba(96,165,250,0.35)',
    Icon: User,
    desc: 'Chief Minister · Official',
  },
} as const
type AccountKey = keyof typeof ACCOUNTS

function OfficialAddForm({ agentId, defaultAccount, onClose, onCreated }: {
  agentId: string
  defaultAccount: AccountKey
  onClose: () => void
  onCreated: () => void
}) {
  const [title,   setTitle]   = useState('')
  const [desc,    setDesc]    = useState('')
  const [account, setAccount] = useState<AccountKey>(defaultAccount)
  const [status,  setStatus]  = useState<StatusKey>('pending')
  const [due,     setDue]     = useState('')
  const [saving,  setSaving]  = useState(false)

  const acct = ACCOUNTS[account]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    setSaving(true)
    await createAgentTask({
      agent_id:    agentId,
      title:       title.trim(),
      description: desc.trim() || undefined,
      status,
      account_tag: account,
      due_date:    due || undefined,
    })
    setSaving(false); onCreated(); onClose()
  }

  return (
    <div className="rounded-xl p-4 mt-3" style={{ background: `${acct.bg}`, border: `1px solid ${acct.border}` }}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-semibold text-white">New Task</span>
        <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors"><X className="w-4 h-4" /></button>
      </div>
      <form onSubmit={handleSubmit} className="space-y-3">
        {/* Account selector */}
        <div className="flex gap-2 flex-wrap">
          {(Object.keys(ACCOUNTS) as AccountKey[]).map(a => {
            const c = ACCOUNTS[a]
            return (
              <button key={a} type="button" onClick={() => setAccount(a)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                style={account === a
                  ? { background: c.bg, border: `1px solid ${c.border}`, color: c.color }
                  : { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.35)' }
                }>
                <c.Icon className="w-3.5 h-3.5" />{c.shortLabel}
              </button>
            )
          })}
        </div>

        <input type="text" placeholder="Task title *" value={title} onChange={e => setTitle(e.target.value)} required
          className="w-full text-sm px-3 py-2 rounded-lg text-white placeholder-gray-500 outline-none"
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }} />

        <textarea placeholder="Description (optional)" value={desc} onChange={e => setDesc(e.target.value)} rows={2}
          className="w-full text-sm px-3 py-2 rounded-lg text-white placeholder-gray-500 outline-none resize-none"
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }} />

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex gap-1.5">
            {(Object.keys(STATUS) as StatusKey[]).map(s => {
              const cfg = STATUS[s]; const Icon = cfg.Icon
              return (
                <button key={s} type="button" onClick={() => setStatus(s)}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all"
                  style={status === s
                    ? { background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.color }
                    : { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.4)' }
                  }>
                  <Icon className="w-3 h-3" />{cfg.label}
                </button>
              )
            })}
          </div>
          <input type="date" value={due} onChange={e => setDue(e.target.value)}
            className="text-xs px-2 py-1.5 rounded-lg text-white outline-none"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', colorScheme: 'dark' }} />
          <button type="submit" disabled={saving || !title.trim()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-all disabled:opacity-40 ml-auto"
            style={{ background: acct.gradient, boxShadow: `0 2px 8px ${acct.shadow}` }}>
            {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
            Add Task
          </button>
        </div>
      </form>
    </div>
  )
}

function OfficialTaskCard({ task, onStatusChange, onDelete }: {
  task: AgentTask
  onStatusChange: (id: string, s: StatusKey) => void
  onDelete: (id: string) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const statusCfg = STATUS[task.status as StatusKey] ?? STATUS.pending
  const StatusIcon = statusCfg.Icon
  const acct = task.account_tag ? ACCOUNTS[task.account_tag as AccountKey] : null

  return (
    <div className="rounded-xl overflow-hidden transition-all"
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.07)',
        borderLeft: `3px solid ${statusCfg.leftBorder}`,
      }}>
      <div className="flex items-center gap-2 p-3">
        {acct && (
          <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0"
            style={{ background: acct.bg, border: `1px solid ${acct.border}`, color: acct.color }}>
            <acct.Icon className="w-3 h-3" />{acct.shortLabel}
          </span>
        )}
        <p className="text-sm font-medium text-white flex-1 truncate">{task.title}</p>
        <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0"
          style={{ background: statusCfg.bg, border: `1px solid ${statusCfg.border}`, color: statusCfg.color }}>
          <StatusIcon className="w-3 h-3" />{statusCfg.label}
        </span>
        <button onClick={() => setExpanded(e => !e)} className="text-gray-500 hover:text-white transition-colors flex-shrink-0">
          {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {expanded && (
        <div className="px-3 pb-3 space-y-2 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          {task.description && (
            <p className="text-xs text-white/60 mt-2 leading-relaxed">{task.description}</p>
          )}
          {task.due_date && (
            <p className="flex items-center gap-1.5 text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
              <Calendar className="w-3 h-3" />
              Due: {new Date(task.due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
            </p>
          )}
          <div className="flex items-center gap-1.5 pt-1 flex-wrap">
            <span className="text-xs mr-1" style={{ color: 'rgba(255,255,255,0.25)' }}>Move to:</span>
            {(Object.keys(STATUS) as StatusKey[]).filter(s => s !== task.status).map(s => {
              const c = STATUS[s]; const Icon = c.Icon
              return (
                <button key={s} onClick={() => onStatusChange(task.id, s)}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-all hover:scale-105"
                  style={{ background: c.bg, border: `1px solid ${c.border}`, color: c.color }}>
                  <Icon className="w-3 h-3" />{c.label}
                </button>
              )
            })}
            <button onClick={() => onDelete(task.id)}
              className="ml-auto flex items-center gap-1 px-2 py-1 rounded-lg text-xs transition-all hover:scale-105"
              style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171' }}>
              <Trash2 className="w-3 h-3" /> Delete
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function OfficialAccountsPanel({ agent, onRefresh }: { agent: WorkflowAgent; onRefresh: () => void }) {
  const [tasks,    setTasks]    = useState<AgentTask[]>([])
  const [loading,  setLoading]  = useState(false)
  const [filter,   setFilter]   = useState<'all' | AccountKey>('all')
  const [showForm, setShowForm] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const counts = agent.task_counts ?? { urgent: 0, pending: 0, approved: 0, total: 0 }

  const loadTasks = useCallback(async () => {
    setLoading(true)
    const r = await getAgentTasks(agent.id)
    setTasks(r.data); setLoading(false)
  }, [agent.id])

  useEffect(() => { if (expanded) loadTasks() }, [expanded, loadTasks])

  const handleStatusChange = async (id: string, s: StatusKey) => { await updateTaskStatus(id, s); await loadTasks(); onRefresh() }
  const handleDelete = async (id: string) => { await deleteAgentTask(id); await loadTasks(); onRefresh() }

  const filtered = filter === 'all' ? tasks : tasks.filter(t => t.account_tag === filter)

  const acctCounts = (Object.keys(ACCOUNTS) as AccountKey[]).reduce((acc, a) => {
    acc[a] = tasks.filter(t => t.account_tag === a).length
    return acc
  }, {} as Record<AccountKey, number>)

  const activeAccount = filter !== 'all' ? ACCOUNTS[filter] : null

  return (
    <div className="rounded-2xl overflow-hidden"
      style={{ background: 'rgba(245,158,11,0.04)', border: '1px solid rgba(245,158,11,0.18)' }}>
      {/* Card header */}
      <button className="w-full flex items-center gap-3 p-4 text-left transition-colors hover:bg-white/[0.02]"
        onClick={() => setExpanded(e => !e)}>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: 'linear-gradient(135deg,#f59e0b,#d97706)', boxShadow: '0 4px 12px rgba(245,158,11,0.35)' }}>
          <Building2 className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white">Official Accounts</p>
          <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
            DIPR Official · BJP UK · Pushkar Singh Dhami
          </p>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {counts.urgent  > 0 && <span className="text-xs px-1.5 py-0.5 rounded-md font-bold" style={{ background: 'rgba(239,68,68,0.2)',  color: '#ef4444' }}>{counts.urgent}</span>}
          {counts.pending > 0 && <span className="text-xs px-1.5 py-0.5 rounded-md font-bold" style={{ background: 'rgba(249,115,22,0.2)', color: '#f97316' }}>{counts.pending}</span>}
          {counts.approved> 0 && <span className="text-xs px-1.5 py-0.5 rounded-md font-bold" style={{ background: 'rgba(34,197,94,0.2)',  color: '#22c55e' }}>{counts.approved}</span>}
          {expanded ? <ChevronUp className="w-4 h-4 text-gray-500 ml-1" /> : <ChevronDown className="w-4 h-4 text-gray-500 ml-1" />}
        </div>
      </button>

      {expanded && (
        <div className="border-t px-4 pb-4" style={{ borderColor: 'rgba(245,158,11,0.12)' }}>
          {/* Account cards row */}
          <div className="grid grid-cols-3 gap-3 mt-4 mb-4">
            {(Object.keys(ACCOUNTS) as AccountKey[]).map(a => {
              const c = ACCOUNTS[a]
              const isActive = filter === a
              const cnt = acctCounts[a]
              return (
                <button key={a} onClick={() => setFilter(isActive ? 'all' : a)}
                  className="rounded-xl p-3 text-left transition-all hover:scale-[1.02]"
                  style={isActive
                    ? { background: c.bg, border: `1px solid ${c.border}`, boxShadow: `0 0 16px ${c.shadow}` }
                    : { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }
                  }>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-2"
                    style={{ background: isActive ? c.gradient : 'rgba(255,255,255,0.08)' }}>
                    <c.Icon className="w-4 h-4" style={{ color: isActive ? '#fff' : c.color }} />
                  </div>
                  <p className="text-xs font-semibold text-white leading-tight">{c.shortLabel}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>{cnt} task{cnt !== 1 ? 's' : ''}</p>
                </button>
              )
            })}
          </div>

          {/* Filter bar + Add Task */}
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <button onClick={() => setFilter('all')}
              className="text-xs px-3 py-1.5 rounded-lg font-medium transition-all"
              style={filter === 'all'
                ? { background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)' }
                : { background: 'rgba(255,255,255,0.03)', color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.07)' }}>
              All ({tasks.length})
            </button>
            {(Object.keys(ACCOUNTS) as AccountKey[]).map(a => {
              const c = ACCOUNTS[a]
              return (
                <button key={a} onClick={() => setFilter(a)}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium transition-all"
                  style={filter === a
                    ? { background: c.bg, color: c.color, border: `1px solid ${c.border}` }
                    : { background: 'rgba(255,255,255,0.03)', color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <c.Icon className="w-3 h-3" />{c.shortLabel} ({acctCounts[a]})
                </button>
              )
            })}
            <button onClick={() => setShowForm(f => !f)}
              className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg font-semibold transition-all ml-auto"
              style={{ background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)', color: '#fbbf24' }}>
              <Plus className="w-3 h-3" /> Add Task
            </button>
          </div>

          {showForm && (
            <OfficialAddForm
              agentId={agent.id}
              defaultAccount={filter !== 'all' ? filter : 'dipr_official'}
              onClose={() => setShowForm(false)}
              onCreated={() => { loadTasks(); onRefresh() }}
            />
          )}

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-amber-400" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-8 text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>
              No tasks for {activeAccount ? activeAccount.label : 'any account'} yet
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map(t => (
                <OfficialTaskCard key={t.id} task={t} onStatusChange={handleStatusChange} onDelete={handleDelete} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Generic Add Task Form ──────────────────────────────────────────────────
function AddTaskForm({ agentId, onClose, onCreated }: { agentId: string; onClose: () => void; onCreated: () => void }) {
  const [title,  setTitle]  = useState('')
  const [desc,   setDesc]   = useState('')
  const [status, setStatus] = useState<StatusKey>('pending')
  const [due,    setDue]    = useState('')
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    setSaving(true)
    await createAgentTask({ agent_id: agentId, title: title.trim(), description: desc.trim() || undefined, status, due_date: due || undefined })
    setSaving(false); onCreated(); onClose()
  }

  return (
    <div className="rounded-xl p-4 mt-3" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-semibold text-white">New Task</span>
        <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors"><X className="w-4 h-4" /></button>
      </div>
      <form onSubmit={handleSubmit} className="space-y-3">
        <input type="text" placeholder="Task title *" value={title} onChange={e => setTitle(e.target.value)} required
          className="w-full text-sm px-3 py-2 rounded-lg text-white placeholder-gray-500 outline-none"
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }} />
        <textarea placeholder="Description (optional)" value={desc} onChange={e => setDesc(e.target.value)} rows={2}
          className="w-full text-sm px-3 py-2 rounded-lg text-white placeholder-gray-500 outline-none resize-none"
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }} />
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex gap-1.5">
            {(Object.keys(STATUS) as StatusKey[]).map(s => {
              const cfg = STATUS[s]; const Icon = cfg.Icon
              return (
                <button key={s} type="button" onClick={() => setStatus(s)}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all"
                  style={status === s
                    ? { background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.color }
                    : { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.4)' }
                  }>
                  <Icon className="w-3 h-3" />{cfg.label}
                </button>
              )
            })}
          </div>
          <input type="date" value={due} onChange={e => setDue(e.target.value)}
            className="text-xs px-2 py-1.5 rounded-lg text-white outline-none"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', colorScheme: 'dark' }} />
          <button type="submit" disabled={saving || !title.trim()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-all disabled:opacity-40 ml-auto"
            style={{ background: 'linear-gradient(135deg,#8b5cf6,#6d28d9)', boxShadow: '0 2px 8px rgba(139,92,246,0.3)' }}>
            {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
            Add Task
          </button>
        </div>
      </form>
    </div>
  )
}

// ─── Generic Task Item ──────────────────────────────────────────────────────
function TaskItem({ task, onStatusChange, onDelete }: {
  task: AgentTask; onStatusChange: (id: string, s: StatusKey) => void; onDelete: (id: string) => void
}) {
  const cfg = STATUS[task.status as StatusKey] ?? STATUS.pending
  const Icon = cfg.Icon
  return (
    <div className="rounded-xl p-3 transition-all"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderLeft: `3px solid ${cfg.leftBorder}` }}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white truncate">{task.title}</p>
          {task.description && <p className="text-xs mt-0.5 line-clamp-2" style={{ color: 'rgba(255,255,255,0.4)' }}>{task.description}</p>}
          <div className="flex items-center gap-3 mt-2 flex-wrap">
            <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium"
              style={{ background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.color }}>
              <Icon className="w-3 h-3" />{cfg.label}
            </span>
            {task.due_date && (
              <span className="flex items-center gap-1 text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
                <Calendar className="w-3 h-3" />
                {new Date(task.due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {(Object.keys(STATUS) as StatusKey[]).filter(s => s !== task.status).map(s => {
            const c = STATUS[s]; const SIcon = c.Icon
            return (
              <button key={s} title={`Mark as ${c.label}`} onClick={() => onStatusChange(task.id, s)}
                className="w-6 h-6 rounded-md flex items-center justify-center transition-all hover:scale-110"
                style={{ background: c.bg, border: `1px solid ${c.border}` }}>
                <SIcon className="w-3 h-3" style={{ color: c.color }} />
              </button>
            )
          })}
          <button onClick={() => onDelete(task.id)}
            className="w-6 h-6 rounded-md flex items-center justify-center transition-all hover:scale-110"
            style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
            <Trash2 className="w-3 h-3 text-red-400" />
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Generic Sub-Agent Card ─────────────────────────────────────────────────
function SubAgentCard({ agent, onRefresh }: { agent: WorkflowAgent; onRefresh: () => void }) {
  const [expanded,    setExpanded]    = useState(false)
  const [tasks,       setTasks]       = useState<AgentTask[]>([])
  const [loadingTasks,setLoadingTasks]= useState(false)
  const [showForm,    setShowForm]    = useState(false)
  const AgentIcon = ICON_MAP[agent.icon ?? ''] ?? Bot
  const counts = agent.task_counts ?? { urgent: 0, pending: 0, approved: 0, total: 0 }

  const loadTasks = useCallback(async () => {
    setLoadingTasks(true)
    const r = await getAgentTasks(agent.id)
    setTasks(r.data); setLoadingTasks(false)
  }, [agent.id])

  useEffect(() => { if (expanded) loadTasks() }, [expanded, loadTasks])

  const handleStatusChange = async (id: string, s: StatusKey) => { await updateTaskStatus(id, s); await loadTasks(); onRefresh() }
  const handleDelete = async (id: string) => { await deleteAgentTask(id); await loadTasks(); onRefresh() }

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
      <button className="w-full flex items-center gap-3 p-4 text-left transition-colors hover:bg-white/[0.02]"
        onClick={() => setExpanded(e => !e)}>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: `${agent.color ?? '#8b5cf6'}22`, border: `1px solid ${agent.color ?? '#8b5cf6'}44` }}>
          <AgentIcon className="w-5 h-5" style={{ color: agent.color ?? '#8b5cf6' }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white">{agent.name}</p>
          <p className="text-xs mt-0.5 line-clamp-1" style={{ color: 'rgba(255,255,255,0.4)' }}>{agent.description}</p>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {counts.urgent  > 0 && <span className="text-xs px-1.5 py-0.5 rounded-md font-bold" style={{ background: 'rgba(239,68,68,0.2)',   color: '#ef4444' }}>{counts.urgent}</span>}
          {counts.pending > 0 && <span className="text-xs px-1.5 py-0.5 rounded-md font-bold" style={{ background: 'rgba(249,115,22,0.2)',  color: '#f97316' }}>{counts.pending}</span>}
          {counts.approved> 0 && <span className="text-xs px-1.5 py-0.5 rounded-md font-bold" style={{ background: 'rgba(34,197,94,0.2)',   color: '#22c55e' }}>{counts.approved}</span>}
          {expanded ? <ChevronUp className="w-4 h-4 text-gray-500 ml-1" /> : <ChevronDown className="w-4 h-4 text-gray-500 ml-1" />}
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-2 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          <div className="flex items-center justify-between pt-3">
            <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.3)' }}>
              Tasks · {counts.total}
            </span>
            <button onClick={() => setShowForm(f => !f)}
              className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg font-medium transition-all"
              style={{ background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.3)', color: '#c4b5fd' }}>
              <Plus className="w-3 h-3" /> Add Task
            </button>
          </div>
          {showForm && <AddTaskForm agentId={agent.id} onClose={() => setShowForm(false)} onCreated={() => { loadTasks(); onRefresh() }} />}
          {loadingTasks ? (
            <div className="flex items-center justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-purple-400" /></div>
          ) : tasks.length === 0 ? (
            <div className="text-center py-6 text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>No tasks yet — click Add Task to create one</div>
          ) : (
            <div className="space-y-2">
              {tasks.map(t => <TaskItem key={t.id} task={t} onStatusChange={handleStatusChange} onDelete={handleDelete} />)}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Main Panel ─────────────────────────────────────────────────────────────
export default function AgentsPanel() {
  const [agents,  setAgents]  = useState<WorkflowAgent[]>([])
  const [loading, setLoading] = useState(true)
  const [health,  setHealth]  = useState<{ twitter: SourceStats; by_account: Record<string, SourceStats> } | null>(null)

  const loadAgents = useCallback(async () => {
    const r = await getAgents(); setAgents(r.data); setLoading(false)
  }, [])

  useEffect(() => {
    loadAgents()
    getPostStatsBySource().then(r => setHealth(r))
  }, [loadAgents])

  const parent     = agents[0]
  const subAgents  = parent?.sub_agents ?? []
  const totalTasks = subAgents.reduce((n, a) => n + (a.task_counts?.total   ?? 0), 0)
  const totalUrgent= subAgents.reduce((n, a) => n + (a.task_counts?.urgent  ?? 0), 0)

  const socialMediaAgent   = subAgents.find(a => a.name.toLowerCase().includes('social media'))
  const verificationAgent  = subAgents.find(a => a.name.toLowerCase().includes('verification'))
  const officialAgent      = subAgents.find(a => a.name.toLowerCase().includes('official'))
  const otherAgents        = subAgents.filter(a =>
    !a.name.toLowerCase().includes('social media') &&
    !a.name.toLowerCase().includes('verification') &&
    !a.name.toLowerCase().includes('official')
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#8b5cf6', boxShadow: '0 0 8px #8b5cf6' }} />
          <span className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.4)' }}>Workflow System</span>
        </div>
        <h1 className="text-3xl font-bold text-white tracking-tight">Agent Workflows</h1>
        <p className="mt-1 text-sm" style={{ color: 'rgba(255,255,255,0.35)' }}>Manage tasks and workflows across all agents</p>
      </div>

      {/* Status legend */}
      <div className="flex items-center gap-5 flex-wrap">
        {(Object.keys(STATUS) as StatusKey[]).map(s => {
          const cfg = STATUS[s]; const Icon = cfg.Icon
          return (
            <div key={s} className="flex items-center gap-1.5 text-xs font-medium" style={{ color: cfg.color }}>
              <Icon className="w-3.5 h-3.5" />
              {cfg.label}
              <span style={{ color: 'rgba(255,255,255,0.25)' }}>
                = {s === 'urgent' ? 'High Priority' : s === 'pending' ? 'In Progress' : 'Done'}
              </span>
            </div>
          )
        })}
      </div>

      {/* Parent Agent card */}
      {parent && (
        <div className="rounded-2xl p-5" style={{
          background: 'linear-gradient(135deg,rgba(139,92,246,0.12) 0%,rgba(109,40,217,0.06) 100%)',
          border: '1px solid rgba(139,92,246,0.25)',
          boxShadow: '0 0 40px rgba(139,92,246,0.06)',
        }}>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'linear-gradient(135deg,#8b5cf6,#6d28d9)', boxShadow: '0 4px 20px rgba(139,92,246,0.4)' }}>
              <Crown className="w-7 h-7 text-white" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                  style={{ background: 'rgba(139,92,246,0.2)', color: '#c4b5fd', border: '1px solid rgba(139,92,246,0.3)' }}>
                  Parent Agent
                </span>
              </div>
              <h2 className="text-xl font-bold text-white">{parent.name}</h2>
              <p className="text-sm mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>{parent.description}</p>
            </div>
            <div className="flex items-center gap-4 flex-shrink-0 text-right">
              <div><p className="text-2xl font-bold text-white">{subAgents.length}</p><p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>Sub Agents</p></div>
              <div className="w-px h-8" style={{ background: 'rgba(255,255,255,0.1)' }} />
              <div><p className="text-2xl font-bold text-white">{totalTasks}</p><p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>Total Tasks</p></div>
              {totalUrgent > 0 && (
                <>
                  <div className="w-px h-8" style={{ background: 'rgba(255,255,255,0.1)' }} />
                  <div><p className="text-2xl font-bold" style={{ color: '#ef4444' }}>{totalUrgent}</p><p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>Urgent</p></div>
                </>
              )}
            </div>
          </div>

          {/* ── Sub-agent health monitor ── */}
          {health && (
            <div className="mt-4 pt-4 border-t" style={{ borderColor: 'rgba(139,92,246,0.15)' }}>
              <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'rgba(255,255,255,0.3)' }}>
                System Health
              </p>
              <div className="grid grid-cols-3 gap-3">
                {/* Social Media health */}
                {(() => {
                  const t = health.twitter
                  const ok = t.total > 0
                  const dot = !ok ? '#f97316' : t.unchecked === 0 ? '#22c55e' : '#f97316'
                  return (
                    <div className="rounded-xl p-3" style={{ background: 'rgba(29,155,240,0.06)', border: '1px solid rgba(29,155,240,0.12)' }}>
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: dot }} />
                        <span className="text-xs font-semibold text-white">Social Media</span>
                      </div>
                      <p className="text-lg font-bold text-white">{t.total}</p>
                      <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>posts across 3 accounts</p>
                      <div className="mt-2 flex items-center gap-2">
                        {Object.entries(health.by_account).map(([h, s]) => (
                          <span key={h} className="text-xs font-bold px-1.5 py-0.5 rounded"
                            style={{ background: 'rgba(255,255,255,0.06)', color: s.total > 0 ? '#22c55e' : 'rgba(255,255,255,0.25)' }}>
                            {s.total}
                          </span>
                        ))}
                      </div>
                    </div>
                  )
                })()}

                {/* Verification health */}
                {(() => {
                  const t = health.twitter
                  const pct = t.total > 0 ? Math.round(((t.verified + t.has_errors) / t.total) * 100) : 0
                  const dot = pct === 100 ? '#22c55e' : pct > 50 ? '#f97316' : '#ef4444'
                  return (
                    <div className="rounded-xl p-3" style={{ background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.12)' }}>
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: dot }} />
                        <span className="text-xs font-semibold text-white">Verification</span>
                      </div>
                      <p className="text-lg font-bold text-white">{pct}%</p>
                      <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>content checked</p>
                      <div className="mt-2 w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
                        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: dot }} />
                      </div>
                    </div>
                  )
                })()}

                {/* Official accounts health */}
                <div className="rounded-xl p-3" style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.12)' }}>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: totalUrgent > 0 ? '#ef4444' : '#22c55e' }} />
                    <span className="text-xs font-semibold text-white">Official Accts</span>
                  </div>
                  <p className="text-lg font-bold text-white">{totalTasks}</p>
                  <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>active tasks</p>
                  {totalUrgent > 0 && (
                    <p className="text-xs mt-2 font-semibold" style={{ color: '#ef4444' }}>{totalUrgent} urgent</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Social Media Analyst — full-width, featured */}
      {socialMediaAgent && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'rgba(255,255,255,0.25)' }}>
            Social Media
          </p>
          <SocialMediaPanel agent={socialMediaAgent} onRefresh={loadAgents} />
        </div>
      )}

      {/* Verification Agent — full-width, featured */}
      {verificationAgent && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'rgba(255,255,255,0.25)' }}>
            Content Verification
          </p>
          <VerificationPanel agent={verificationAgent} onRefresh={loadAgents} />
        </div>
      )}

      {/* Official Accounts Agent — full-width, featured */}
      {officialAgent && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'rgba(255,255,255,0.25)' }}>
            Official Accounts
          </p>
          <OfficialAccountsPanel agent={officialAgent} onRefresh={loadAgents} />
        </div>
      )}

      {/* Other sub agents */}
      {otherAgents.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'rgba(255,255,255,0.25)' }}>
            Other Agents
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {otherAgents.map(a => <SubAgentCard key={a.id} agent={a} onRefresh={loadAgents} />)}
          </div>
        </div>
      )}
    </div>
  )
}
