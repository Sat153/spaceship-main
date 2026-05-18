'use client'

import { useEffect, useState } from 'react'
import { getMyTasks, completeTask, startTask } from '@/app/actions/user-tasks'
import type { UserTask } from '@/app/actions/user-tasks'
import { CheckCircle2, Circle, AlertCircle, RotateCcw, XCircle, CalendarDays, Eye, X, Clock, Tag, Building2, Loader2, PlayCircle } from 'lucide-react'

const PRIORITY_COLORS: Record<string, string> = {
  urgent: 'text-red-400 bg-red-500/10 border-red-500/20',
  high: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
  medium: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
  low: 'text-green-400 bg-green-500/10 border-green-500/20',
}

const PRIORITY_BAR: Record<string, string> = {
  urgent: 'bg-red-500',
  high: 'bg-orange-500',
  medium: 'bg-yellow-500',
  low: 'bg-green-500',
}

const STATUS_CONFIG: Record<string, { label: string; icon: any; color: string }> = {
  todo: { label: 'To Do', icon: Circle, color: 'text-gray-400' },
  in_progress: { label: 'In Progress', icon: RotateCcw, color: 'text-blue-400' },
  review: { label: 'In Review', icon: AlertCircle, color: 'text-yellow-400' },
  completed: { label: 'Completed', icon: CheckCircle2, color: 'text-green-400' },
  cancelled: { label: 'Cancelled', icon: XCircle, color: 'text-gray-500' },
}

const STATUS_ORDER = ['in_progress', 'review', 'todo', 'completed', 'cancelled']

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

function TaskModal({ task, onClose, onComplete, onProgress, completing, progressing }: {
  task: UserTask
  onClose: () => void
  onComplete: (id: string) => void
  onProgress: (id: string) => void
  completing: string | null
  progressing: string | null
}) {
  const cfg = STATUS_CONFIG[task.status] || STATUS_CONFIG.todo
  const StatusIcon = cfg.icon

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-lg bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Priority bar top */}
        <div className={`h-1 w-full ${PRIORITY_BAR[task.priority] || 'bg-gray-600'}`} />

        {/* Header */}
        <div className="flex items-start justify-between gap-3 p-5 border-b border-gray-800">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className={`text-xs px-2 py-0.5 rounded-full border capitalize ${PRIORITY_COLORS[task.priority] || PRIORITY_COLORS.medium}`}>
                {task.priority}
              </span>
              <span className={`flex items-center gap-1 text-xs ${cfg.color}`}>
                <StatusIcon className="h-3.5 w-3.5" />
                {cfg.label}
              </span>
              {task.type && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20 capitalize">
                  {task.type.replace('_', ' ')}
                </span>
              )}
            </div>
            <h2 className="text-white font-bold text-lg leading-snug">{task.title}</h2>
          </div>
          <button onClick={onClose} className="flex-shrink-0 p-1.5 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-white transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
          {/* Description */}
          {task.description ? (
            <div>
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1.5">Description</p>
              <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">{task.description}</p>
            </div>
          ) : (
            <p className="text-gray-600 text-sm italic">No description provided.</p>
          )}

          {/* Meta grid */}
          <div className="grid grid-cols-2 gap-3">
            {task.due_date && (
              <div className="bg-gray-800 rounded-xl p-3">
                <div className="flex items-center gap-1.5 text-gray-500 text-xs mb-1">
                  <CalendarDays className="h-3 w-3" /> Due Date
                </div>
                <p className="text-white text-sm font-medium">{fmt(task.due_date)}</p>
              </div>
            )}
            {task.start_date && (
              <div className="bg-gray-800 rounded-xl p-3">
                <div className="flex items-center gap-1.5 text-gray-500 text-xs mb-1">
                  <CalendarDays className="h-3 w-3" /> Start Date
                </div>
                <p className="text-white text-sm font-medium">{fmt(task.start_date)}</p>
              </div>
            )}
            {task.estimated_hours && (
              <div className="bg-gray-800 rounded-xl p-3">
                <div className="flex items-center gap-1.5 text-gray-500 text-xs mb-1">
                  <Clock className="h-3 w-3" /> Estimated
                </div>
                <p className="text-white text-sm font-medium">{task.estimated_hours}h</p>
              </div>
            )}
            {task.department_name && (
              <div className="bg-gray-800 rounded-xl p-3">
                <div className="flex items-center gap-1.5 text-gray-500 text-xs mb-1">
                  <Building2 className="h-3 w-3" /> Department
                </div>
                <p className="text-white text-sm font-medium">{task.department_name}</p>
              </div>
            )}
            {task.created_at && (
              <div className="bg-gray-800 rounded-xl p-3">
                <div className="flex items-center gap-1.5 text-gray-500 text-xs mb-1">
                  <Clock className="h-3 w-3" /> Created
                </div>
                <p className="text-white text-sm font-medium">{fmt(task.created_at)}</p>
              </div>
            )}
          </div>

          {/* Tags */}
          {task.tags && task.tags.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 text-gray-500 text-xs mb-2">
                <Tag className="h-3 w-3" /> Tags
              </div>
              <div className="flex flex-wrap gap-2">
                {task.tags.map(tag => (
                  <span key={tag} className="text-xs px-2 py-0.5 rounded-full bg-gray-800 text-gray-400 border border-gray-700">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer action */}
        {task.status !== 'completed' && task.status !== 'cancelled' && (
          <div className="px-5 py-4 border-t border-gray-800 flex gap-2">
            {task.status === 'todo' && (
              <button
                onClick={() => onProgress(task.id)}
                disabled={progressing === task.id}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold bg-blue-600 hover:bg-blue-500 text-white transition-colors disabled:opacity-50"
              >
                {progressing === task.id
                  ? <><Loader2 className="h-4 w-4 animate-spin" /> Starting…</>
                  : <><PlayCircle className="h-4 w-4" /> Mark In Progress</>
                }
              </button>
            )}
            <button
              onClick={() => onComplete(task.id)}
              disabled={completing === task.id}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold bg-green-600 hover:bg-green-500 text-white transition-colors disabled:opacity-50"
            >
              {completing === task.id
                ? <><Loader2 className="h-4 w-4 animate-spin" /> Marking complete…</>
                : <><CheckCircle2 className="h-4 w-4" /> Mark as Complete</>
              }
            </button>
          </div>
        )}
        {task.status === 'completed' && (
          <div className="px-5 py-4 border-t border-gray-800 flex items-center justify-center gap-2 text-green-400 text-sm font-medium">
            <CheckCircle2 className="h-4 w-4" /> Task completed
          </div>
        )}
      </div>
    </div>
  )
}

export default function UserTasks() {
  const [tasks, setTasks] = useState<UserTask[]>([])
  const [loading, setLoading] = useState(true)
  const [completing, setCompleting] = useState<string | null>(null)
  const [progressing, setProgressing] = useState<string | null>(null)
  const [selected, setSelected] = useState<UserTask | null>(null)

  useEffect(() => {
    getMyTasks().then(({ data }) => {
      setTasks(data)
      setLoading(false)
    })
  }, [])

  const handleProgress = async (taskId: string) => {
    setProgressing(taskId)
    const { success } = await startTask(taskId)
    if (success) {
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: 'in_progress' } : t))
      if (selected?.id === taskId) setSelected(prev => prev ? { ...prev, status: 'in_progress' } : prev)
    }
    setProgressing(null)
  }

  const handleComplete = async (taskId: string) => {
    setCompleting(taskId)
    const { success } = await completeTask(taskId)
    if (success) {
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: 'completed' } : t))
      if (selected?.id === taskId) setSelected(prev => prev ? { ...prev, status: 'completed' } : prev)
    }
    setCompleting(null)
  }

  const grouped = STATUS_ORDER.reduce<Record<string, UserTask[]>>((acc, s) => {
    const list = tasks.filter(t => t.status === s)
    if (list.length > 0) acc[s] = list
    return acc
  }, {})

  const active = tasks.filter(t => t.status !== 'completed' && t.status !== 'cancelled').length

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white mb-1">My Tasks</h2>
        <p className="text-gray-400">{active} active task{active !== 1 ? 's' : ''} assigned to you</p>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-20 bg-gray-800 rounded-xl animate-pulse" />)}
        </div>
      ) : tasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center bg-gray-900 rounded-xl border border-gray-800">
          <CheckCircle2 className="h-12 w-12 text-gray-600 mb-3" />
          <p className="text-white font-medium">No tasks assigned</p>
          <p className="text-gray-500 text-sm mt-1">Tasks assigned to you will appear here</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([status, list]) => {
            const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.todo
            const StatusIcon = cfg.icon
            return (
              <div key={status}>
                <div className="flex items-center gap-2 mb-3">
                  <StatusIcon className={`h-4 w-4 ${cfg.color}`} />
                  <span className={`text-sm font-semibold ${cfg.color}`}>{cfg.label}</span>
                  <span className="text-gray-600 text-xs">({list.length})</span>
                </div>
                <div className="space-y-2">
                  {list.map(task => (
                    <div
                      key={task.id}
                      className={`bg-gray-900 border rounded-xl p-4 transition-colors ${task.status === 'completed' ? 'border-green-900/40 opacity-60' : 'border-gray-800 hover:border-gray-700'}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className={`font-medium truncate ${task.status === 'completed' ? 'text-gray-400 line-through' : 'text-white'}`}>{task.title}</p>
                          {task.description && (
                            <p className="text-gray-500 text-sm mt-1 line-clamp-1">{task.description}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className={`text-xs px-2 py-1 rounded-full border capitalize ${PRIORITY_COLORS[task.priority] || PRIORITY_COLORS.medium}`}>
                            {task.priority}
                          </span>
                          {/* View badge */}
                          <button
                            onClick={() => setSelected(task)}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20 transition-colors"
                          >
                            <Eye className="h-3 w-3" />
                            View
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-3">
                        {task.due_date ? (
                          <div className="flex items-center gap-1 text-xs text-gray-500">
                            <CalendarDays className="h-3 w-3" />
                            Due {fmt(task.due_date)}
                          </div>
                        ) : <div />}
                        {task.status !== 'completed' && task.status !== 'cancelled' && (
                          <div className="flex items-center gap-2">
                            {task.status === 'todo' && (
                              <button
                                onClick={() => handleProgress(task.id)}
                                disabled={progressing === task.id}
                                className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium bg-blue-600/10 text-blue-400 border border-blue-600/20 hover:bg-blue-600/20 transition-colors disabled:opacity-50"
                              >
                                <PlayCircle className="h-3.5 w-3.5" />
                                {progressing === task.id ? 'Starting...' : 'In Progress'}
                              </button>
                            )}
                            <button
                              onClick={() => handleComplete(task.id)}
                              disabled={completing === task.id}
                              className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium bg-green-600/10 text-green-400 border border-green-600/20 hover:bg-green-600/20 transition-colors disabled:opacity-50"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              {completing === task.id ? 'Marking...' : 'Mark Complete'}
                            </button>
                          </div>
                        )}
                        {task.status === 'completed' && (
                          <span className="flex items-center gap-1 text-xs text-green-500">
                            <CheckCircle2 className="h-3.5 w-3.5" /> Completed
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {selected && (
        <TaskModal
          task={selected}
          onClose={() => setSelected(null)}
          onComplete={handleComplete}
          onProgress={handleProgress}
          completing={completing}
          progressing={progressing}
        />
      )}
    </div>
  )
}
