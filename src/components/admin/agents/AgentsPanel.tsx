'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  Crown, Share2, Building2, ShieldCheck,
  Plus, Trash2, AlertTriangle, Clock, CheckCircle2,
  ChevronDown, ChevronUp, Calendar, Loader2, X,
  Bot, Image, Film, Clapperboard, ExternalLink, Globe,
} from 'lucide-react'
import {
  getAgents, getAgentTasks, createAgentTask, updateTaskStatus, deleteAgentTask,
  type WorkflowAgent, type AgentTask,
} from '@/app/actions/agent-workflow'

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

// ─── Social Media Analyst Sub-Panel ─────────────────────────────────────────
function SocialMediaPanel({ agent, onRefresh }: { agent: WorkflowAgent; onRefresh: () => void }) {
  const [tasks,       setTasks]       = useState<AgentTask[]>([])
  const [loading,     setLoading]     = useState(false)
  const [filter,      setFilter]      = useState<'all' | ContentTypeKey>('all')
  const [showForm,    setShowForm]    = useState(false)
  const [expanded,    setExpanded]    = useState(false)
  const counts = agent.task_counts ?? { urgent: 0, pending: 0, approved: 0, total: 0 }

  const loadTasks = useCallback(async () => {
    setLoading(true)
    const r = await getAgentTasks(agent.id)
    setTasks(r.data)
    setLoading(false)
  }, [agent.id])

  useEffect(() => { if (expanded) loadTasks() }, [expanded, loadTasks])

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
          {/* FB page banner */}
          <div className="flex items-center gap-3 py-3 px-3 rounded-xl mt-3 mb-4"
            style={{ background: 'rgba(24,119,242,0.08)', border: '1px solid rgba(24,119,242,0.15)' }}>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: '#1877f2' }}>
              <span className="text-white font-bold text-xs">f</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white">UttarakhandDIPR</p>
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>facebook.com/UttarakhandDIPR</p>
            </div>
            <a href="https://www.facebook.com/UttarakhandDIPR" target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg transition-all hover:scale-105"
              style={{ background: 'rgba(24,119,242,0.2)', border: '1px solid rgba(24,119,242,0.3)', color: '#60a5fa' }}>
              <ExternalLink className="w-3 h-3" /> Open
            </a>
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

  const loadAgents = useCallback(async () => {
    const r = await getAgents(); setAgents(r.data); setLoading(false)
  }, [])

  useEffect(() => { loadAgents() }, [loadAgents])

  const parent     = agents[0]
  const subAgents  = parent?.sub_agents ?? []
  const totalTasks = subAgents.reduce((n, a) => n + (a.task_counts?.total   ?? 0), 0)
  const totalUrgent= subAgents.reduce((n, a) => n + (a.task_counts?.urgent  ?? 0), 0)

  const socialMediaAgent = subAgents.find(a => a.name.toLowerCase().includes('social media'))
  const otherAgents      = subAgents.filter(a => !a.name.toLowerCase().includes('social media'))

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
