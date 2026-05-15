'use client'

import { useEffect, useState } from 'react'
import { getMyTasks, completeTask } from '@/app/actions/user-tasks'
import { CheckCircle2, Circle, AlertCircle, RotateCcw, XCircle, CalendarDays } from 'lucide-react'

interface Task {
  id: string
  title: string
  description?: string
  status: string
  priority: string
  due_date?: string
  department_id?: string
}

const PRIORITY_COLORS: Record<string, string> = {
  urgent: 'text-red-400 bg-red-500/10 border-red-500/20',
  high: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
  medium: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
  low: 'text-green-400 bg-green-500/10 border-green-500/20',
}

const STATUS_CONFIG: Record<string, { label: string; icon: any; color: string }> = {
  todo: { label: 'To Do', icon: Circle, color: 'text-gray-400' },
  in_progress: { label: 'In Progress', icon: RotateCcw, color: 'text-blue-400' },
  review: { label: 'In Review', icon: AlertCircle, color: 'text-yellow-400' },
  completed: { label: 'Completed', icon: CheckCircle2, color: 'text-green-400' },
  cancelled: { label: 'Cancelled', icon: XCircle, color: 'text-gray-500' },
}

const STATUS_ORDER = ['in_progress', 'review', 'todo', 'completed', 'cancelled']

export default function UserTasks() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [completing, setCompleting] = useState<string | null>(null)

  useEffect(() => {
    getMyTasks().then(({ data }) => {
      setTasks(data)
      setLoading(false)
    })
  }, [])

  const handleComplete = async (taskId: string) => {
    setCompleting(taskId)
    const { success } = await completeTask(taskId)
    if (success) {
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: 'completed' } : t))
    }
    setCompleting(null)
  }

  const grouped = STATUS_ORDER.reduce<Record<string, Task[]>>((acc, s) => {
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
          {[1, 2, 3].map(i => (
            <div key={i} className="h-20 bg-gray-800 rounded-xl animate-pulse" />
          ))}
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
                    <div key={task.id} className={`bg-gray-900 border rounded-xl p-4 transition-colors ${task.status === 'completed' ? 'border-green-900/40 opacity-60' : 'border-gray-800 hover:border-gray-700'}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className={`font-medium truncate ${task.status === 'completed' ? 'text-gray-400 line-through' : 'text-white'}`}>{task.title}</p>
                          {task.description && (
                            <p className="text-gray-500 text-sm mt-1 line-clamp-2">{task.description}</p>
                          )}
                        </div>
                        <span className={`text-xs px-2 py-1 rounded-full border flex-shrink-0 capitalize ${PRIORITY_COLORS[task.priority] || PRIORITY_COLORS.medium}`}>
                          {task.priority}
                        </span>
                      </div>
                      <div className="flex items-center justify-between mt-3">
                        {task.due_date ? (
                          <div className="flex items-center gap-1 text-xs text-gray-500">
                            <CalendarDays className="h-3 w-3" />
                            Due {new Date(task.due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </div>
                        ) : <div />}
                        {task.status !== 'completed' && task.status !== 'cancelled' && (
                          <button
                            onClick={() => handleComplete(task.id)}
                            disabled={completing === task.id}
                            className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium bg-green-600/10 text-green-400 border border-green-600/20 hover:bg-green-600/20 transition-colors disabled:opacity-50"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            {completing === task.id ? 'Marking...' : 'Mark Complete'}
                          </button>
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
    </div>
  )
}
