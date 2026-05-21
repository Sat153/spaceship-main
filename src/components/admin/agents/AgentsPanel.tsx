'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  Crown, Share2, Building2, UserCheck, ShieldCheck,
  Plus, Trash2, AlertTriangle, Clock, CheckCircle2,
  ChevronDown, ChevronUp, Calendar, Loader2, X, Bot,
} from 'lucide-react'
import {
  getAgents, getAgentTasks, createAgentTask, updateTaskStatus, deleteAgentTask,
  type WorkflowAgent, type AgentTask,
} from '@/app/actions/agent-workflow'

// ─── Status config ────────────────────────────────────────────────────────────
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

// ─── Icon map from DB string → Lucide component ───────────────────────────────
const ICON_MAP: Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  crown: Crown,
  share2: Share2,
  building2: Building2,
  'user-check': UserCheck,
  'shield-check': ShieldCheck,
}

// ─── Add Task Form ────────────────────────────────────────────────────────────
function AddTaskForm({
  agentId,
  onClose,
  onCreated,
}: {
  agentId: string
  onClose: () => void
  onCreated: () => void
}) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState<StatusKey>('pending')
  const [dueDate, setDueDate] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    setSaving(true)
    await createAgentTask({ agent_id: agentId, title: title.trim(), description: description.trim() || undefined, status, due_date: dueDate || undefined })
    setSaving(false)
    onCreated()
    onClose()
  }

  return (
    <div
      className="rounded-xl p-4 mt-3"
      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-semibold text-white">New Task</span>
        <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>
      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          type="text"
          placeholder="Task title *"
          value={title}
          onChange={e => setTitle(e.target.value)}
          required
          className="w-full text-sm px-3 py-2 rounded-lg text-white placeholder-gray-500 outline-none"
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
        />
        <textarea
          placeholder="Description (optional)"
          value={description}
          onChange={e => setDescription(e.target.value)}
          rows={2}
          className="w-full text-sm px-3 py-2 rounded-lg text-white placeholder-gray-500 outline-none resize-none"
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
        />
        <div className="flex gap-2">
          {/* Status selector */}
          <div className="flex gap-1.5">
            {(Object.keys(STATUS) as StatusKey[]).map(s => {
              const cfg = STATUS[s]
              const Icon = cfg.Icon
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatus(s)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all"
                  style={
                    status === s
                      ? { background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.color }
                      : { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.4)' }
                  }
                >
                  <Icon className="w-3 h-3" />
                  {cfg.label}
                </button>
              )
            })}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 flex-1">
            <Calendar className="w-3.5 h-3.5 text-gray-500" />
            <input
              type="date"
              value={dueDate}
              onChange={e => setDueDate(e.target.value)}
              className="flex-1 text-xs px-2 py-1.5 rounded-lg text-white outline-none"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', colorScheme: 'dark' }}
            />
          </div>
          <button
            type="submit"
            disabled={saving || !title.trim()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-all disabled:opacity-40"
            style={{ background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)', boxShadow: '0 2px 8px rgba(139,92,246,0.3)' }}
          >
            {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
            Add Task
          </button>
        </div>
      </form>
    </div>
  )
}

// ─── Task Item ────────────────────────────────────────────────────────────────
function TaskItem({ task, onStatusChange, onDelete }: {
  task: AgentTask
  onStatusChange: (id: string, status: StatusKey) => void
  onDelete: (id: string) => void
}) {
  const cfg = STATUS[task.status as StatusKey] ?? STATUS.pending
  const StatusIcon = cfg.Icon

  return (
    <div
      className="rounded-xl p-3 transition-all"
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: `1px solid rgba(255,255,255,0.07)`,
        borderLeft: `3px solid ${cfg.leftBorder}`,
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white truncate">{task.title}</p>
          {task.description && (
            <p className="text-xs mt-0.5 line-clamp-2" style={{ color: 'rgba(255,255,255,0.4)' }}>
              {task.description}
            </p>
          )}
          <div className="flex items-center gap-3 mt-2 flex-wrap">
            {/* Status badge */}
            <span
              className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium"
              style={{ background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.color }}
            >
              <StatusIcon className="w-3 h-3" />
              {cfg.label}
            </span>
            {/* Due date */}
            {task.due_date && (
              <span className="flex items-center gap-1 text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
                <Calendar className="w-3 h-3" />
                {new Date(task.due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
              </span>
            )}
          </div>
        </div>
        {/* Actions */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {(Object.keys(STATUS) as StatusKey[]).filter(s => s !== task.status).map(s => {
            const c = STATUS[s]
            const Icon = c.Icon
            return (
              <button
                key={s}
                title={`Mark as ${c.label}`}
                onClick={() => onStatusChange(task.id, s)}
                className="w-6 h-6 rounded-md flex items-center justify-center transition-all hover:scale-110"
                style={{ background: c.bg, border: `1px solid ${c.border}` }}
              >
                <Icon className="w-3 h-3" style={{ color: c.color }} />
              </button>
            )
          })}
          <button
            title="Delete"
            onClick={() => onDelete(task.id)}
            className="w-6 h-6 rounded-md flex items-center justify-center transition-all hover:scale-110"
            style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}
          >
            <Trash2 className="w-3 h-3 text-red-400" />
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Sub Agent Card ───────────────────────────────────────────────────────────
function SubAgentCard({ agent, onRefresh }: { agent: WorkflowAgent; onRefresh: () => void }) {
  const [expanded, setExpanded] = useState(false)
  const [tasks, setTasks] = useState<AgentTask[]>([])
  const [loadingTasks, setLoadingTasks] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)

  const AgentIcon = ICON_MAP[agent.icon ?? ''] ?? Bot
  const counts = agent.task_counts ?? { urgent: 0, pending: 0, approved: 0, total: 0 }

  const loadTasks = useCallback(async () => {
    setLoadingTasks(true)
    const result = await getAgentTasks(agent.id)
    setTasks(result.data)
    setLoadingTasks(false)
  }, [agent.id])

  useEffect(() => {
    if (expanded) loadTasks()
  }, [expanded, loadTasks])

  const handleStatusChange = async (taskId: string, status: StatusKey) => {
    await updateTaskStatus(taskId, status)
    await loadTasks()
    onRefresh()
  }

  const handleDelete = async (taskId: string) => {
    await deleteAgentTask(taskId)
    await loadTasks()
    onRefresh()
  }

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.08)',
      }}
    >
      {/* Card header */}
      <button
        className="w-full flex items-center gap-3 p-4 text-left transition-colors hover:bg-white/[0.02]"
        onClick={() => setExpanded(e => !e)}
      >
        {/* Icon */}
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: `${agent.color ?? '#8b5cf6'}22`, border: `1px solid ${agent.color ?? '#8b5cf6'}44` }}
        >
          <AgentIcon className="w-5 h-5" style={{ color: agent.color ?? '#8b5cf6' }} />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white">{agent.name}</p>
          <p className="text-xs mt-0.5 line-clamp-1" style={{ color: 'rgba(255,255,255,0.4)' }}>
            {agent.description}
          </p>
        </div>

        {/* Task count chips */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {counts.urgent > 0 && (
            <span className="text-xs px-1.5 py-0.5 rounded-md font-bold" style={{ background: 'rgba(239,68,68,0.2)', color: '#ef4444' }}>
              {counts.urgent}
            </span>
          )}
          {counts.pending > 0 && (
            <span className="text-xs px-1.5 py-0.5 rounded-md font-bold" style={{ background: 'rgba(249,115,22,0.2)', color: '#f97316' }}>
              {counts.pending}
            </span>
          )}
          {counts.approved > 0 && (
            <span className="text-xs px-1.5 py-0.5 rounded-md font-bold" style={{ background: 'rgba(34,197,94,0.2)', color: '#22c55e' }}>
              {counts.approved}
            </span>
          )}
          {expanded
            ? <ChevronUp className="w-4 h-4 text-gray-500 ml-1" />
            : <ChevronDown className="w-4 h-4 text-gray-500 ml-1" />}
        </div>
      </button>

      {/* Expanded task panel */}
      {expanded && (
        <div className="px-4 pb-4 space-y-2 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          <div className="flex items-center justify-between pt-3">
            <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.3)' }}>
              Tasks · {counts.total}
            </span>
            <button
              onClick={() => setShowAddForm(f => !f)}
              className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg font-medium transition-all"
              style={{ background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.3)', color: '#c4b5fd' }}
            >
              <Plus className="w-3 h-3" />
              Add Task
            </button>
          </div>

          {showAddForm && (
            <AddTaskForm
              agentId={agent.id}
              onClose={() => setShowAddForm(false)}
              onCreated={() => { loadTasks(); onRefresh() }}
            />
          )}

          {loadingTasks ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="w-5 h-5 animate-spin text-purple-400" />
            </div>
          ) : tasks.length === 0 ? (
            <div className="text-center py-6 text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>
              No tasks yet — click Add Task to create one
            </div>
          ) : (
            <div className="space-y-2">
              {tasks.map(t => (
                <TaskItem
                  key={t.id}
                  task={t}
                  onStatusChange={handleStatusChange}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Main Panel ───────────────────────────────────────────────────────────────
export default function AgentsPanel() {
  const [agents, setAgents] = useState<WorkflowAgent[]>([])
  const [loading, setLoading] = useState(true)

  const loadAgents = useCallback(async () => {
    const result = await getAgents()
    setAgents(result.data)
    setLoading(false)
  }, [])

  useEffect(() => { loadAgents() }, [loadAgents])

  const parent = agents[0]
  const subAgents = parent?.sub_agents ?? []
  const totalTasks = subAgents.reduce((n, a) => n + (a.task_counts?.total ?? 0), 0)
  const totalUrgent = subAgents.reduce((n, a) => n + (a.task_counts?.urgent ?? 0), 0)

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
        <p className="mt-1 text-sm" style={{ color: 'rgba(255,255,255,0.35)' }}>
          Manage tasks and workflows across all agents
        </p>
      </div>

      {/* Status legend */}
      <div className="flex items-center gap-4 flex-wrap">
        {(Object.keys(STATUS) as StatusKey[]).map(s => {
          const cfg = STATUS[s]
          const Icon = cfg.Icon
          return (
            <div key={s} className="flex items-center gap-1.5 text-xs font-medium" style={{ color: cfg.color }}>
              <Icon className="w-3.5 h-3.5" />
              {cfg.label}
              <span style={{ color: 'rgba(255,255,255,0.25)' }}>= {
                s === 'urgent' ? 'Red · High Priority' :
                s === 'pending' ? 'Orange · In Progress' :
                'Green · Done'
              }</span>
            </div>
          )
        })}
      </div>

      {/* Parent Agent card */}
      {parent && (
        <div
          className="rounded-2xl p-5"
          style={{
            background: 'linear-gradient(135deg, rgba(139,92,246,0.12) 0%, rgba(109,40,217,0.06) 100%)',
            border: '1px solid rgba(139,92,246,0.25)',
            boxShadow: '0 0 40px rgba(139,92,246,0.06)',
          }}
        >
          <div className="flex items-center gap-4">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{
                background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)',
                boxShadow: '0 4px 20px rgba(139,92,246,0.4)',
              }}
            >
              <Crown className="w-7 h-7 text-white" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: 'rgba(139,92,246,0.2)', color: '#c4b5fd', border: '1px solid rgba(139,92,246,0.3)' }}>
                  Parent Agent
                </span>
              </div>
              <h2 className="text-xl font-bold text-white">{parent.name}</h2>
              <p className="text-sm mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>{parent.description}</p>
            </div>
            <div className="flex items-center gap-4 flex-shrink-0 text-right">
              <div>
                <p className="text-2xl font-bold text-white">{subAgents.length}</p>
                <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>Sub Agents</p>
              </div>
              <div className="w-px h-8" style={{ background: 'rgba(255,255,255,0.1)' }} />
              <div>
                <p className="text-2xl font-bold text-white">{totalTasks}</p>
                <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>Total Tasks</p>
              </div>
              {totalUrgent > 0 && (
                <>
                  <div className="w-px h-8" style={{ background: 'rgba(255,255,255,0.1)' }} />
                  <div>
                    <p className="text-2xl font-bold" style={{ color: '#ef4444' }}>{totalUrgent}</p>
                    <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>Urgent</p>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Sub agent cards */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'rgba(255,255,255,0.25)' }}>
          Sub Agents
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {subAgents.map(agent => (
            <SubAgentCard key={agent.id} agent={agent} onRefresh={loadAgents} />
          ))}
        </div>
      </div>
    </div>
  )
}
