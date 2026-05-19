"use client";

import * as React from "react";
import { Plus, Filter, Search, FolderKanban, Trash2, X, ChevronDown, Calendar } from "lucide-react";

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
  const [filterDate, setFilterDate] = React.useState<string>("all");

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
    if (filterDate !== "all") {
      const taskDate = new Date(task.created_at);
      const today = new Date(); today.setHours(0,0,0,0);
      if (filterDate === "today") matchesDate = taskDate >= today;
      else if (filterDate === "week") { const w = new Date(today); w.setDate(today.getDate() - 7); matchesDate = taskDate >= w; }
      else if (filterDate === "month") { const m = new Date(today); m.setDate(today.getDate() - 30); matchesDate = taskDate >= m; }
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
      <div className="flex items-center justify-center h-64">
        <div className="text-white">Loading kanban board...</div>
      </div>
    );
  }

  const activeProject = projects.find((p: any) => p.id === filterProject);

  return (
    <div className="h-full bg-black text-white">
      <div className="p-4 md:p-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 flex-wrap mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Kanban Board</h1>
            <p className="text-gray-400">Manage tasks and track progress</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => setShowProjectList(v => !v)}
              className="border-gray-700 text-gray-300 hover:text-white hover:bg-gray-800"
            >
              <FolderKanban className="h-4 w-4 mr-2" />
              Projects
              <ChevronDown className={`h-3.5 w-3.5 ml-2 transition-transform ${showProjectList ? 'rotate-180' : ''}`} />
            </Button>
            <Button
              onClick={() => handleAddTask('todo')}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Task
            </Button>
          </div>
        </div>

        {/* Projects Panel */}
        {showProjectList && (
          <div className="mb-6 bg-gray-900 border border-gray-700 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-white">Projects</h3>
              <Button size="sm" onClick={() => setIsProjectModalOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white h-7 text-xs">
                <Plus className="h-3.5 w-3.5 mr-1" /> New Project
              </Button>
            </div>
            {projects.length === 0 ? (
              <p className="text-gray-500 text-sm">No projects yet. Create one to group your tasks.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                {projects.map((p: any) => (
                  <div
                    key={p.id}
                    onClick={() => { setFilterProject(filterProject === p.id ? 'all' : p.id); setShowProjectList(false); }}
                    className={`group flex items-start justify-between p-3 rounded-lg border cursor-pointer transition-all ${
                      filterProject === p.id
                        ? 'border-blue-500 bg-blue-500/10'
                        : 'border-gray-700 hover:border-gray-600 bg-gray-800/50'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-white truncate">{p.name}</p>
                      {p.clients?.name && <p className="text-xs text-gray-400 mt-0.5">{p.clients.name}</p>}
                      {p.description && <p className="text-xs text-gray-500 mt-0.5 truncate">{p.description}</p>}
                      <span className={`inline-flex mt-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium border ${STATUS_COLORS[p.status] || STATUS_COLORS.active}`}>
                        {p.status.replace('_', ' ')}
                      </span>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeleteProject(p.id); }}
                      className="opacity-0 group-hover:opacity-100 ml-2 text-gray-500 hover:text-red-400 transition-all flex-shrink-0"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 md:gap-4 mb-6">
          {[
            { label: 'Total', key: 'all', value: stats.total, color: 'text-white', activeClass: 'ring-2 ring-white/40' },
            { label: 'To Do', key: 'todo', value: stats.todo, color: 'text-gray-400', activeClass: 'ring-2 ring-gray-400/60' },
            { label: 'In Progress', key: 'in_progress', value: stats.in_progress, color: 'text-blue-400', activeClass: 'ring-2 ring-blue-500/60' },
            { label: 'Review', key: 'review', value: stats.review, color: 'text-purple-400', activeClass: 'ring-2 ring-purple-500/60' },
            { label: 'Completed', key: 'completed', value: stats.completed, color: 'text-green-400', activeClass: 'ring-2 ring-green-500/60' },
            { label: 'Overdue', key: 'overdue', value: stats.overdue, color: stats.overdue > 0 ? 'text-red-400' : 'text-gray-600', activeClass: 'ring-2 ring-red-500/60' },
          ].map(s => {
            const isActive = filterStatus === s.key;
            return (
              <Card
                key={s.label}
                onClick={() => setFilterStatus(isActive ? 'all' : s.key)}
                className={`border-gray-700 cursor-pointer transition-all hover:border-gray-500 select-none
                  ${s.key === 'overdue' && stats.overdue > 0 ? 'bg-red-900/20 border-red-700/40' : 'bg-gray-900'}
                  ${isActive ? s.activeClass + ' bg-gray-800' : ''}`}
              >
                <CardHeader className="pb-2">
                  <CardTitle className={`text-sm font-medium ${s.key === 'overdue' && stats.overdue > 0 ? 'text-red-400' : 'text-gray-400'}`}>{s.label}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6">
          <div className="flex-1 min-w-0 w-full sm:w-auto relative">
            <Search className="h-4 w-4 absolute left-3 top-3 text-gray-400" />
            <Input
              placeholder="Search tasks..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-gray-900 border-gray-700 text-white"
            />
          </div>

          {/* Active project filter badge */}
          {filterProject !== 'all' && activeProject && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/10 border border-blue-500/30 rounded-md text-sm text-blue-300">
              <FolderKanban className="h-3.5 w-3.5" />
              {activeProject.name}
              <button onClick={() => setFilterProject('all')} className="ml-1 hover:text-white">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          <Select value={filterPriority} onValueChange={setFilterPriority}>
            <SelectTrigger className="w-full sm:w-44 bg-gray-900 border-gray-700 text-white">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent className="bg-gray-900 border-gray-700">
              <SelectItem value="all">All Priorities</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterAssignee} onValueChange={setFilterAssignee}>
            <SelectTrigger className="w-full sm:w-44 bg-gray-900 border-gray-700 text-white">
              <SelectValue placeholder="Assignee" />
            </SelectTrigger>
            <SelectContent className="bg-gray-900 border-gray-700">
              <SelectItem value="all">All Assignees</SelectItem>
              {users.map((u: any) => (
                <SelectItem key={u.id} value={u.id}>
                  {u.first_name} {u.last_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterProject} onValueChange={setFilterProject}>
            <SelectTrigger className="w-full sm:w-44 bg-gray-900 border-gray-700 text-white">
              <SelectValue placeholder="Project" />
            </SelectTrigger>
            <SelectContent className="bg-gray-900 border-gray-700">
              <SelectItem value="all">All Projects</SelectItem>
              {projects.map((p: any) => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex items-center w-full sm:w-44 h-10 bg-gray-900 border border-gray-700 rounded-md px-3 gap-2">
            <Calendar className="h-4 w-4 text-gray-400 flex-shrink-0" />
            <select
              value={filterDate}
              onChange={e => setFilterDate(e.target.value)}
              className="flex-1 bg-transparent text-white text-sm outline-none cursor-pointer [color-scheme:dark] appearance-none"
            >
              <option value="all">All Dates</option>
              <option value="today">Today</option>
              <option value="week">Last 7 Days</option>
              <option value="month">Last 30 Days</option>
            </select>
            <ChevronDown className="h-4 w-4 text-gray-400 flex-shrink-0" />
          </div>
        </div>

        {/* Board */}
        <div className="bg-gray-900 rounded-lg border border-gray-700 p-4">
          <KanbanBoard
            columns={kanbanColumns}
            tasks={kanbanTasks}
            onTaskMove={handleTaskMove}
            onTaskClick={handleTaskClick}
            onAddTask={handleAddTask}
          />
        </div>

        {/* Task Modal */}
        <TaskModal
          open={isTaskModalOpen}
          onOpenChange={setIsTaskModalOpen}
          task={selectedTask ? convertToTaskModalData(selectedTask) : null}
          onSave={handleSaveTask}
          onDelete={handleDeleteTask}
          departments={departments}
          users={users}
          projects={projects}
          isLoading={isSubmitting}
        />

        {/* New Project Modal */}
        <Dialog open={isProjectModalOpen} onOpenChange={setIsProjectModalOpen}>
          <DialogContent className="bg-gray-900 border-gray-700 text-white sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FolderKanban className="h-5 w-5 text-blue-400" />
                New Project
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Project Name *</label>
                <Input
                  autoFocus
                  placeholder="e.g. Nari Shakti Vardhan Event"
                  value={newProjectName}
                  onChange={e => setNewProjectName(e.target.value)}
                  className="bg-gray-800 border-gray-700 text-white"
                  onKeyDown={e => e.key === 'Enter' && handleCreateProject()}
                />
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Description</label>
                <Textarea
                  placeholder="What is this project about?"
                  value={newProjectDesc}
                  onChange={e => setNewProjectDesc(e.target.value)}
                  className="bg-gray-800 border-gray-700 text-white"
                  rows={3}
                />
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Link to Client (optional)</label>
                <Select value={newProjectClientId} onValueChange={setNewProjectClientId}>
                  <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                    <SelectValue placeholder="Select client" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700">
                    <SelectItem value="no_client">No Client</SelectItem>
                    {clients.map((c: any) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setIsProjectModalOpen(false)} className="text-gray-400 hover:text-white">
                Cancel
              </Button>
              <Button
                onClick={handleCreateProject}
                disabled={!newProjectName.trim() || projectCreating}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {projectCreating ? 'Creating...' : 'Create Project'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
