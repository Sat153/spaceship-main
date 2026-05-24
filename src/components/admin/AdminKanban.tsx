"use client";

import * as React from "react";
import { Plus, Filter, Search, FolderKanban, Trash2, X, ChevronDown, ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek, isWithinInterval } from "date-fns";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { KanbanBoard, KanbanColumn, KanbanTask } from "@/components/ui/kanban-board";
import { TaskModal, TaskModalData } from "@/components/ui/task-modal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/lib/auth";
import {
  moveTask,
  saveTask,
  deleteTask,
  type AdminTask,
  type TaskPayload
} from "@/app/actions/admin-kanban";
import { createProject, deleteProject } from "@/app/actions/projects";
import { useAdminTasks, useAdminDepartments, useAdminUsers, useAdminProjects, useAdminClients } from "@/hooks/useSWR";

interface TaskStats {
  total: number;
  todo: number;
  in_progress: number;
  review: number;
  completed: number;
  cancelled: number;
  overdue: number;
}

const kanbanColumns: KanbanColumn[] = [
  { id: 'todo', title: 'To Do', status: 'todo', color: '#6B7280' },
  { id: 'in_progress', title: 'In Progress', status: 'in_progress', color: '#3B82F6', limit: 5 },
  { id: 'review', title: 'Review', status: 'review', color: '#8B5CF6' },
  { id: 'completed', title: 'Completed', status: 'completed', color: '#10B981' },
  { id: 'cancelled', title: 'Cancelled', status: 'cancelled', color: '#EF4444' },
];

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-500/10 text-green-400 border-green-500/20',
  completed: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  on_hold: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
}

export default function AdminKanban() {
  const { user } = useAuth();

  const { tasks, isLoading: tasksLoading, refresh: refreshTasks } = useAdminTasks();
  const { departments } = useAdminDepartments();
  const { users } = useAdminUsers();
  const { projects, refresh: refreshProjects } = useAdminProjects();
  const { clients } = useAdminClients();

  const [isTaskModalOpen, setIsTaskModalOpen] = React.useState(false);
  const [selectedTask, setSelectedTask] = React.useState<AdminTask | null>(null);
  const [newTaskStatus, setNewTaskStatus] = React.useState<string>('todo');
  const [searchTerm, setSearchTerm] = React.useState("");
  const [filterPriority, setFilterPriority] = React.useState<string>("all");
  const [filterAssignee, setFilterAssignee] = React.useState<string>("all");
  const [filterProject, setFilterProject] = React.useState<string>("all");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [filterStatus, setFilterStatus] = React.useState<string>("all");
  const [filterDateFrom, setFilterDateFrom] = React.useState<Date | null>(null);
  const [filterDateTo, setFilterDateTo] = React.useState<Date | null>(null);
  const [calendarOpen, setCalendarOpen] = React.useState(false);
  const [calendarMonth, setCalendarMonth] = React.useState(new Date());
  const calendarRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (calendarRef.current && !calendarRef.current.contains(e.target as Node)) {
        setCalendarOpen(false);
      }
    }
    if (calendarOpen) document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [calendarOpen]);

  const handleCalendarDayClick = (date: Date) => {
    if (!filterDateFrom || (filterDateFrom && filterDateTo)) {
      setFilterDateFrom(date); setFilterDateTo(null);
    } else {
      if (date < filterDateFrom) { setFilterDateTo(filterDateFrom); setFilterDateFrom(date); }
      else { setFilterDateTo(date); }
      setCalendarOpen(false);
    }
  };

  // Project management state
  const [isProjectModalOpen, setIsProjectModalOpen] = React.useState(false);
  const [newProjectName, setNewProjectName] = React.useState("");
  const [newProjectDesc, setNewProjectDesc] = React.useState("");
  const [newProjectClientId, setNewProjectClientId] = React.useState("no_client");
  const [projectCreating, setProjectCreating] = React.useState(false);
  const [showProjectList, setShowProjectList] = React.useState(false);

  const stats = React.useMemo(() => {
    const now = new Date()
    return tasks.reduce((acc, task) => {
      acc.total++;
      acc[task.status as keyof Omit<TaskStats, 'total' | 'overdue'>]++;
      const isOverdue = task.due_date &&
        new Date(task.due_date) < now &&
        task.status !== 'completed' &&
        task.status !== 'cancelled'
      if (isOverdue) acc.overdue++
      return acc;
    }, { total: 0, todo: 0, in_progress: 0, review: 0, completed: 0, cancelled: 0, overdue: 0 } as TaskStats);
  }, [tasks]);

  const handleTaskMove = React.useCallback(async (taskId: string, newStatus: string, newPosition: number) => {
    try {
      const result = await moveTask(taskId, newStatus, newPosition);
      if (result.error) throw new Error(result.error);
      await refreshTasks();
    } catch {
      await refreshTasks();
      throw new Error('Failed to move task');
    }
  }, [refreshTasks]);

  const handleTaskClick = React.useCallback((task: KanbanTask) => {
    const adminTask = tasks.find(t => t.id === task.id);
    if (adminTask) {
      setSelectedTask(adminTask);
      setIsTaskModalOpen(true);
    }
  }, [tasks]);

  const handleAddTask = React.useCallback((status: string) => {
    setSelectedTask(null);
    setNewTaskStatus(status);
    setIsTaskModalOpen(true);
  }, []);

  const convertToTaskModalData = React.useCallback((task: AdminTask): TaskModalData => ({
    id: task.id,
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority,
    type: task.type,
    assigned_to: task.assigned_to,
    due_date: task.due_date ? new Date(task.due_date) : undefined,
    start_date: task.start_date ? new Date(task.start_date) : undefined,
    estimated_hours: task.estimated_hours,
    tags: task.tags,
    department_id: task.department_id,
    project_id: task.project_id,
  }), []);

  const handleSaveTask = React.useCallback(async (taskData: TaskModalData) => {
    if (!user) return;
    setIsSubmitting(true);
    try {
      const payload: TaskPayload = {
        title: taskData.title,
        description: taskData.description,
        status: taskData.id ? taskData.status : newTaskStatus,
        priority: taskData.priority,
        type: taskData.type,
        assigned_to: taskData.assigned_to,
        department_id: taskData.department_id,
        project_id: taskData.project_id,
        start_date: taskData.start_date?.toISOString(),
        due_date: taskData.due_date?.toISOString(),
        estimated_hours: taskData.estimated_hours,
        tags: taskData.tags,
        created_by: user.id,
        kanban_position: 0,
      };

      const result = await saveTask(payload, taskData.id);
      if (result.error) throw new Error(result.error);

      await refreshTasks();
      setIsTaskModalOpen(false);
      setSelectedTask(null);
    } catch (error) {
      console.error('Error saving task:', error);
    } finally {
      setIsSubmitting(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, refreshTasks, newTaskStatus]);

  const handleDeleteTask = React.useCallback(async (taskId: string) => {
    try {
      const result = await deleteTask(taskId);
      if (result.error) throw new Error(result.error);
      await refreshTasks();
      setIsTaskModalOpen(false);
      setSelectedTask(null);
    } catch (error) {
      console.error('Error deleting task:', error);
      throw error;
    }
  }, [refreshTasks]);

  const handleCreateProject = async () => {
    if (!newProjectName.trim() || !user) return;
    setProjectCreating(true);
    try {
      const result = await createProject({
        name: newProjectName.trim(),
        description: newProjectDesc.trim() || undefined,
        client_id: newProjectClientId === 'no_client' ? undefined : newProjectClientId,
        created_by: user.id,
      });
      if (result.error) { alert(result.error); return; }
      await refreshProjects();
      setIsProjectModalOpen(false);
      setNewProjectName("");
      setNewProjectDesc("");
      setNewProjectClientId("no_client");
    } finally {
      setProjectCreating(false);
    }
  };

  const handleDeleteProject = async (id: string) => {
    if (!confirm("Delete this project? Tasks linked to it will not be deleted.")) return;
    await deleteProject(id);
    if (filterProject === id) setFilterProject("all");
    await refreshProjects();
  };

  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPriority = filterPriority === "all" || task.priority === filterPriority;
    const matchesAssignee = filterAssignee === "all" || task.assigned_to === filterAssignee;
    const matchesProject = filterProject === "all" || task.project_id === filterProject;
    const now = new Date();
    const matchesStatus = filterStatus === "all" ||
      (filterStatus === "overdue"
        ? task.due_date && new Date(task.due_date) < now && task.status !== 'completed' && task.status !== 'cancelled'
        : task.status === filterStatus);
    let matchesDate = true;
    if (filterDateFrom || filterDateTo) {
      const taskDate = new Date(task.created_at); taskDate.setHours(0,0,0,0);
      if (filterDateFrom && filterDateTo) matchesDate = isWithinInterval(taskDate, { start: filterDateFrom, end: filterDateTo });
      else if (filterDateFrom) matchesDate = taskDate >= filterDateFrom;
      else if (filterDateTo) matchesDate = taskDate <= filterDateTo;
    }
    return matchesSearch && matchesPriority && matchesAssignee && matchesProject && matchesStatus && matchesDate;
  });

  const kanbanTasks: KanbanTask[] = filteredTasks.map(task => ({
    id: task.id,
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority,
    type: task.type,
    assignedTo: task.assigned_to ? {
      id: task.assigned_to,
      name: `${users.find(u => u.id === task.assigned_to)?.first_name || ''} ${users.find(u => u.id === task.assigned_to)?.last_name || ''}`.trim() || "Unknown",
    } : undefined,
    dueDate: task.due_date ? new Date(task.due_date) : undefined,
    tags: task.tags,
    estimatedHours: task.estimated_hours,
    actualHours: task.actual_hours,
    kanban_position: task.kanban_position,
  }));

  if (tasksLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <style>{`@keyframes kb-spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}@keyframes kb-flicker{0%,100%{opacity:1}50%{opacity:0.5}}`}</style>
        <div className="relative w-14 h-14">
          <div className="absolute inset-0 rounded-full border border-blue-500/20" />
          <div className="absolute inset-0 rounded-full border-t-2 border-blue-400" style={{ animation: 'kb-spin 1s linear infinite' }} />
          <div className="absolute inset-0 flex items-center justify-center">
            <FolderKanban className="w-5 h-5 text-blue-400" />
          </div>
        </div>
        <p className="text-xs font-mono tracking-widest text-blue-400/60" style={{ animation: 'kb-flicker 2s ease-in-out infinite' }}>LOADING TASK BOARD...</p>
      </div>
    );
  }

  const activeProject = projects.find((p: any) => p.id === filterProject);

  const statConfig = [
    { label: 'TOTAL',       key: 'all',         value: stats.total,       color: '#e2e8f0', glow: 'rgba(226,232,240,0.15)', border: 'rgba(226,232,240,0.15)' },
    { label: 'TO DO',       key: 'todo',         value: stats.todo,        color: '#94a3b8', glow: 'rgba(148,163,184,0.15)', border: 'rgba(148,163,184,0.2)'  },
    { label: 'IN PROGRESS', key: 'in_progress',  value: stats.in_progress, color: '#60a5fa', glow: 'rgba(96,165,250,0.2)',  border: 'rgba(96,165,250,0.3)'   },
    { label: 'REVIEW',      key: 'review',       value: stats.review,      color: '#c084fc', glow: 'rgba(192,132,252,0.2)', border: 'rgba(192,132,252,0.3)'  },
    { label: 'COMPLETED',   key: 'completed',    value: stats.completed,   color: '#4ade80', glow: 'rgba(74,222,128,0.2)',  border: 'rgba(74,222,128,0.3)'   },
    { label: 'OVERDUE',     key: 'overdue',      value: stats.overdue,     color: stats.overdue > 0 ? '#f87171' : '#475569', glow: stats.overdue > 0 ? 'rgba(248,113,113,0.2)' : 'transparent', border: stats.overdue > 0 ? 'rgba(248,113,113,0.3)' : 'rgba(71,85,105,0.2)' },
  ]

  return (
    <div className="h-full bg-black text-white">
      <style>{`
        @keyframes kb-scan    { 0%{top:-5%} 100%{top:105%} }
        @keyframes kb-spin    { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes kb-glow    { 0%,100%{box-shadow:0 0 20px rgba(59,130,246,0.2)} 50%{box-shadow:0 0 40px rgba(59,130,246,0.5),0 0 80px rgba(59,130,246,0.1)} }
        @keyframes kb-fadein  { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
        @keyframes kb-flicker { 0%,19%,21%,23%,25%,54%,56%,100%{opacity:1} 20%,24%,55%{opacity:0.4} }
        .kb-stat:hover { transform: translateY(-3px) scale(1.03); transition: all 0.2s ease; }
        .kb-proj:hover { transform: translateY(-1px); transition: all 0.15s ease; }
      `}</style>

      <div className="p-4 md:p-6 space-y-6">

        {/* ── HEADER ── */}
        <div className="relative overflow-hidden rounded-2xl p-6" style={{
          background: 'linear-gradient(135deg,#060610 0%,#0a0a1e 60%,#060a10 100%)',
          border: '1px solid rgba(59,130,246,0.35)',
          animation: 'kb-glow 4s ease-in-out infinite',
        }}>
          {/* scanline */}
          <div className="absolute left-0 right-0 h-px pointer-events-none" style={{
            background: 'linear-gradient(90deg,transparent,rgba(59,130,246,0.5),transparent)',
            animation: 'kb-scan 3s linear infinite',
          }} />
          {/* grid bg */}
          <div className="absolute inset-0 opacity-[0.04]" style={{
            backgroundImage: 'linear-gradient(rgba(59,130,246,1) 1px,transparent 1px),linear-gradient(90deg,rgba(59,130,246,1) 1px,transparent 1px)',
            backgroundSize: '40px 40px',
          }} />

          <div className="relative flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-4">
              <div className="relative w-14 h-14 flex-shrink-0">
                <div className="absolute inset-0 rounded-xl" style={{ background: 'linear-gradient(135deg,#3b82f6,#1d4ed8)', boxShadow: '0 0 24px rgba(59,130,246,0.6)' }} />
                <div className="absolute inset-0 rounded-xl border border-blue-400/30" style={{ animation: 'kb-spin 8s linear infinite' }} />
                <div className="absolute inset-0 flex items-center justify-center">
                  <FolderKanban className="w-6 h-6 text-white" />
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-bold" style={{ background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.4)', color: '#93c5fd' }}>
                    <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                    TASK BOARD ONLINE
                  </div>
                </div>
                <h1 className="text-3xl font-black tracking-tight" style={{
                  background: 'linear-gradient(135deg,#fff 0%,#93c5fd 50%,#3b82f6 100%)',
                  WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                  animation: 'kb-flicker 10s linear infinite',
                }}>Kanban Board</h1>
                <p className="text-xs font-mono mt-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>
                  {filteredTasks.length} / {tasks.length} TASKS DISPLAYED
                  {activeProject ? ` · PROJECT: ${activeProject.name.toUpperCase()}` : ''}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowProjectList(v => !v)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-mono font-medium transition-all"
                style={{
                  background: showProjectList ? 'rgba(59,130,246,0.2)' : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${showProjectList ? 'rgba(59,130,246,0.5)' : 'rgba(255,255,255,0.12)'}`,
                  color: showProjectList ? '#93c5fd' : 'rgba(255,255,255,0.5)',
                }}
              >
                <FolderKanban className="h-4 w-4" />
                PROJECTS
                <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showProjectList ? 'rotate-180' : ''}`} />
              </button>
              <button
                onClick={() => handleAddTask('todo')}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-mono font-bold transition-all"
                style={{ background: 'linear-gradient(135deg,#3b82f6,#1d4ed8)', boxShadow: '0 0 16px rgba(59,130,246,0.4)', color: '#fff' }}
              >
                <Plus className="h-4 w-4" /> NEW TASK
              </button>
            </div>
          </div>
        </div>

        {/* ── PROJECTS PANEL ── */}
        {showProjectList && (
          <div className="rounded-2xl p-5" style={{ background: 'rgba(59,130,246,0.04)', border: '1px solid rgba(59,130,246,0.2)', animation: 'kb-fadein 0.2s ease' }}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-1 h-4 rounded-full" style={{ background: '#3b82f6', boxShadow: '0 0 8px #3b82f6' }} />
                <span className="text-xs font-mono font-bold tracking-widest" style={{ color: '#60a5fa' }}>PROJECTS</span>
                <span className="text-xs font-mono px-1.5 py-0.5 rounded" style={{ background: 'rgba(59,130,246,0.12)', color: 'rgba(255,255,255,0.4)' }}>{projects.length}</span>
              </div>
              <button onClick={() => setIsProjectModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all"
                style={{ background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.3)', color: '#93c5fd' }}>
                <Plus className="h-3.5 w-3.5" /> NEW PROJECT
              </button>
            </div>
            {projects.length === 0 ? (
              <p className="text-xs font-mono text-center py-4" style={{ color: 'rgba(255,255,255,0.2)' }}>NO PROJECTS YET</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                {projects.map((p: any) => {
                  const isActive = filterProject === p.id
                  return (
                    <div key={p.id} className="kb-proj group flex items-start justify-between p-3 rounded-xl cursor-pointer transition-all" style={{
                      background: isActive ? 'rgba(59,130,246,0.12)' : 'rgba(255,255,255,0.03)',
                      border: `1px solid ${isActive ? 'rgba(59,130,246,0.5)' : 'rgba(255,255,255,0.08)'}`,
                      boxShadow: isActive ? '0 0 16px rgba(59,130,246,0.15)' : 'none',
                    }}
                      onClick={() => { setFilterProject(isActive ? 'all' : p.id); setShowProjectList(false); }}>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-white truncate">{p.name}</p>
                        {p.clients?.name && <p className="text-xs mt-0.5 font-mono" style={{ color: 'rgba(255,255,255,0.35)' }}>{p.clients.name}</p>}
                        <span className={`inline-flex mt-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono font-medium border ${STATUS_COLORS[p.status] || STATUS_COLORS.active}`}>
                          {p.status.replace('_', ' ').toUpperCase()}
                        </span>
                      </div>
                      <button onClick={(e) => { e.stopPropagation(); handleDeleteProject(p.id); }}
                        className="opacity-0 group-hover:opacity-100 ml-2 transition-all flex-shrink-0" style={{ color: 'rgba(248,113,113,0.6)' }}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ── STAT TILES ── */}
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {statConfig.map((s, i) => {
            const isActive = filterStatus === s.key
            return (
              <button key={s.key} className="kb-stat rounded-2xl p-4 text-left transition-all select-none" onClick={() => setFilterStatus(isActive ? 'all' : s.key)} style={{
                background: isActive ? `${s.glow}` : 'rgba(255,255,255,0.03)',
                border: `1px solid ${isActive ? s.border : 'rgba(255,255,255,0.07)'}`,
                boxShadow: isActive ? `0 0 20px ${s.glow}` : 'none',
                animation: `kb-fadein 0.4s ease both`,
                animationDelay: `${i * 0.06}s`,
              }}>
                <p className="text-3xl font-black mb-1" style={{ color: s.color, textShadow: isActive ? `0 0 16px ${s.color}` : 'none' }}>{s.value}</p>
                <p className="text-[10px] font-mono tracking-widest" style={{ color: 'rgba(255,255,255,0.3)' }}>{s.label}</p>
              </button>
            )
          })}
        </div>

        {/* ── FILTERS ── */}
        <div className="flex flex-wrap gap-2 p-4 rounded-2xl" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex-1 min-w-[180px] relative">
            <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'rgba(255,255,255,0.3)' }} />
            <Input placeholder="Search tasks..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-9 text-xs font-mono bg-transparent border-gray-700/50 text-white placeholder:text-gray-600 focus-visible:ring-blue-500/30" />
          </div>

          {filterProject !== 'all' && activeProject && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono" style={{ background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.3)', color: '#93c5fd' }}>
              <FolderKanban className="h-3.5 w-3.5" />
              {activeProject.name}
              <button onClick={() => setFilterProject('all')} className="ml-1 hover:text-white"><X className="h-3 w-3" /></button>
            </div>
          )}

          <Select value={filterPriority} onValueChange={setFilterPriority}>
            <SelectTrigger className="w-36 h-9 text-xs font-mono bg-transparent border-gray-700/50 text-gray-300">
              <Filter className="h-3.5 w-3.5 mr-1.5" /><SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent className="bg-gray-900 border-gray-700 font-mono text-xs">
              <SelectItem value="all">ALL PRIORITY</SelectItem>
              <SelectItem value="urgent">URGENT</SelectItem>
              <SelectItem value="high">HIGH</SelectItem>
              <SelectItem value="medium">MEDIUM</SelectItem>
              <SelectItem value="low">LOW</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterAssignee} onValueChange={setFilterAssignee}>
            <SelectTrigger className="w-36 h-9 text-xs font-mono bg-transparent border-gray-700/50 text-gray-300">
              <SelectValue placeholder="Assignee" />
            </SelectTrigger>
            <SelectContent className="bg-gray-900 border-gray-700 font-mono text-xs">
              <SelectItem value="all">ALL ASSIGNEES</SelectItem>
              {users.map((u: any) => (
                <SelectItem key={u.id} value={u.id}>{u.first_name} {u.last_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterProject} onValueChange={setFilterProject}>
            <SelectTrigger className="w-36 h-9 text-xs font-mono bg-transparent border-gray-700/50 text-gray-300">
              <SelectValue placeholder="Project" />
            </SelectTrigger>
            <SelectContent className="bg-gray-900 border-gray-700 font-mono text-xs">
              <SelectItem value="all">ALL PROJECTS</SelectItem>
              {projects.map((p: any) => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="relative" ref={calendarRef}>
            <button onClick={() => setCalendarOpen(v => !v)}
              className="flex items-center gap-2 h-9 px-3 rounded-lg border text-xs font-mono transition-colors"
              style={filterDateFrom
                ? { background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.4)', color: '#93c5fd' }
                : { background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.4)' }}>
              <Calendar className="h-3.5 w-3.5" />
              <span>{filterDateFrom && filterDateTo ? `${format(filterDateFrom,'MMM d')}–${format(filterDateTo,'MMM d')}` : filterDateFrom ? `FROM ${format(filterDateFrom,'MMM d')}` : 'DATE RANGE'}</span>
              {filterDateFrom && <X className="h-3 w-3 ml-1" onClick={e => { e.stopPropagation(); setFilterDateFrom(null); setFilterDateTo(null); }} />}
            </button>
            {calendarOpen && (
              <div className="absolute right-0 top-11 z-50 rounded-2xl shadow-2xl p-4 w-72" style={{ background: '#0d0d1a', border: '1px solid rgba(59,130,246,0.3)' }}>
                <div className="flex items-center justify-between mb-3">
                  <button onClick={() => setCalendarMonth(m => subMonths(m, 1))} className="p-1 rounded hover:bg-white/10"><ChevronLeft className="h-4 w-4 text-gray-400" /></button>
                  <span className="text-white font-mono text-sm font-bold">{format(calendarMonth, 'MMMM yyyy').toUpperCase()}</span>
                  <button onClick={() => setCalendarMonth(m => addMonths(m, 1))} className="p-1 rounded hover:bg-white/10"><ChevronRight className="h-4 w-4 text-gray-400" /></button>
                </div>
                <div className="grid grid-cols-7 mb-1">{['SU','MO','TU','WE','TH','FR','SA'].map(d => <div key={d} className="text-center text-[10px] font-mono text-gray-600 py-1">{d}</div>)}</div>
                <div className="grid grid-cols-7 gap-y-1">
                  {eachDayOfInterval({ start: startOfWeek(startOfMonth(calendarMonth)), end: endOfWeek(endOfMonth(calendarMonth)) }).map(day => {
                    const isFrom = filterDateFrom && isSameDay(day, filterDateFrom)
                    const isTo = filterDateTo && isSameDay(day, filterDateTo)
                    const inRange = filterDateFrom && filterDateTo && isWithinInterval(day, { start: filterDateFrom, end: filterDateTo })
                    return (
                      <button key={day.toISOString()} onClick={() => handleCalendarDayClick(day)}
                        className="text-xs py-1.5 rounded font-mono transition-colors"
                        style={(isFrom || isTo) ? { background: '#3b82f6', color: '#fff', fontWeight: 'bold' } : inRange ? { background: 'rgba(59,130,246,0.15)', color: '#93c5fd' } : { color: isSameMonth(day, calendarMonth) ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.15)' }}>
                        {format(day, 'd')}
                      </button>
                    )
                  })}
                </div>
                <p className="text-[10px] font-mono text-center mt-3" style={{ color: 'rgba(255,255,255,0.2)' }}>
                  {!filterDateFrom ? 'SELECT START DATE' : !filterDateTo ? 'SELECT END DATE' : 'RANGE SELECTED'}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ── BOARD ── */}
        <div className="rounded-2xl p-4 overflow-hidden" style={{
          background: 'rgba(255,255,255,0.01)',
          border: '1px solid rgba(59,130,246,0.15)',
          boxShadow: '0 0 40px rgba(59,130,246,0.05)',
        }}>
          <KanbanBoard columns={kanbanColumns} tasks={kanbanTasks} onTaskMove={handleTaskMove} onTaskClick={handleTaskClick} onAddTask={handleAddTask} />
        </div>

        {/* Task Modal */}
        <TaskModal open={isTaskModalOpen} onOpenChange={setIsTaskModalOpen}
          task={selectedTask ? convertToTaskModalData(selectedTask) : null}
          onSave={handleSaveTask} onDelete={handleDeleteTask}
          departments={departments} users={users} projects={projects} isLoading={isSubmitting} />

        {/* New Project Modal */}
        <Dialog open={isProjectModalOpen} onOpenChange={setIsProjectModalOpen}>
          <DialogContent className="text-white sm:max-w-md" style={{ background: '#0d0d1a', border: '1px solid rgba(59,130,246,0.3)' }}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 font-mono">
                <FolderKanban className="h-5 w-5 text-blue-400" /> NEW PROJECT
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div>
                <label className="text-xs font-mono text-gray-400 mb-1.5 block tracking-widest">PROJECT NAME *</label>
                <Input autoFocus placeholder="e.g. Nari Shakti Vardhan Event" value={newProjectName}
                  onChange={e => setNewProjectName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleCreateProject()}
                  className="bg-gray-800/50 border-gray-700 text-white font-mono text-sm" />
              </div>
              <div>
                <label className="text-xs font-mono text-gray-400 mb-1.5 block tracking-widest">DESCRIPTION</label>
                <Textarea placeholder="What is this project about?" value={newProjectDesc}
                  onChange={e => setNewProjectDesc(e.target.value)}
                  className="bg-gray-800/50 border-gray-700 text-white font-mono text-sm" rows={3} />
              </div>
              <div>
                <label className="text-xs font-mono text-gray-400 mb-1.5 block tracking-widest">CLIENT (OPTIONAL)</label>
                <Select value={newProjectClientId} onValueChange={setNewProjectClientId}>
                  <SelectTrigger className="bg-gray-800/50 border-gray-700 text-white font-mono text-sm"><SelectValue placeholder="Select client" /></SelectTrigger>
                  <SelectContent className="bg-gray-900 border-gray-700 font-mono text-sm">
                    <SelectItem value="no_client">No Client</SelectItem>
                    {clients.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setIsProjectModalOpen(false)} className="font-mono text-gray-400 hover:text-white text-xs">CANCEL</Button>
              <Button onClick={handleCreateProject} disabled={!newProjectName.trim() || projectCreating}
                className="font-mono text-xs font-bold" style={{ background: 'linear-gradient(135deg,#3b82f6,#1d4ed8)', boxShadow: '0 0 12px rgba(59,130,246,0.3)' }}>
                {projectCreating ? 'CREATING...' : 'CREATE PROJECT'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
