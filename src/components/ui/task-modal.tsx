"use client";

import * as React from "react";
import { format } from "date-fns";
import { Calendar, Clock, User, Tag, FileText } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export interface TaskModalData {
  id?: string;
  title: string;
  description?: string;
  status: 'todo' | 'in_progress' | 'review' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  type: 'reminder' | 'task' | 'meeting' | 'deadline' | 'follow_up' | 'general';
  assigned_to?: string;
  due_date?: Date;
  start_date?: Date;
  estimated_hours?: number;
  tags?: string[];
  department_id?: string;
  project_id?: string;
}

export interface TaskModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task?: TaskModalData | null;
  onSave: (task: TaskModalData) => void;
  onDelete?: (taskId: string) => void;
  departments?: Array<{ id: string; name: string }>;
  users?: Array<{ id: string; first_name: string; last_name: string; department_id?: string | null }>;
  projects?: Array<{ id: string; name: string }>;
  isLoading?: boolean;
}

const TaskModal: React.FC<TaskModalProps> = ({
  open,
  onOpenChange,
  task,
  onSave,
  onDelete,
  departments = [],
  users = [],
  projects = [],
  isLoading = false,
}) => {
  const [formData, setFormData] = React.useState<TaskModalData>({
    title: "",
    description: "",
    status: "todo",
    priority: "medium",
    type: "task",
    tags: [],
    project_id: undefined,
  });

  const [tagInput, setTagInput] = React.useState("");

  // Filter users by selected department
  const filteredUsers = React.useMemo(() => {
    const deptId = formData.department_id
    if (!deptId || deptId === 'no_department') return users
    return users.filter(u => u.department_id === deptId)
  }, [users, formData.department_id]);

  React.useEffect(() => {
    if (task) {
      setFormData({
        ...task,
        tags: task.tags || [],
        assigned_to: task.assigned_to || "unassigned",
        department_id: task.department_id || "no_department",
        project_id: task.project_id || "no_project",
      });
    } else {
      setFormData({
        title: "",
        description: "",
        status: "todo",
        priority: "medium",
        type: "task",
        tags: [],
        assigned_to: "unassigned",
        department_id: "no_department",
        project_id: "no_project",
      });
    }
    setTagInput("");
  }, [task, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) return;
    
    // Convert placeholder values to undefined before saving
    const taskDataToSave = {
      ...formData,
      assigned_to: formData.assigned_to === "unassigned" ? undefined : formData.assigned_to,
      department_id: formData.department_id === "no_department" ? undefined : formData.department_id,
      project_id: formData.project_id === "no_project" ? undefined : formData.project_id,
    };
    
    onSave(taskDataToSave);
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !formData.tags?.includes(tagInput.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...(prev.tags || []), tagInput.trim()]
      }));
      setTagInput("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags?.filter(tag => tag !== tagToRemove) || []
    }));
  };

  const isEditing = !!task?.id;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:max-w-[600px] bg-gray-900 border-gray-700 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white">
            {isEditing ? "Edit Task" : "Create New Task"}
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            {isEditing ? "Update task details below." : "Fill in the details to create a new task."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {/* Title */}
            <div className="col-span-2">
              <Label htmlFor="title" className="text-white">Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                className="bg-gray-800 border-gray-700 text-white"
                placeholder="Enter task title"
                required
              />
            </div>

            {/* Description */}
            <div className="col-span-2">
              <Label htmlFor="description" className="text-white">Description</Label>
              <Textarea
                id="description"
                value={formData.description || ""}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className="bg-gray-800 border-gray-700 text-white"
                placeholder="Enter task description"
                rows={3}
              />
            </div>

            {/* Status */}
            <div>
              <Label className="text-white">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value: any) => setFormData(prev => ({ ...prev, status: value }))}
              >
                <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  <SelectItem value="todo">To Do</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="review">Review</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Priority */}
            <div>
              <Label className="text-white">Priority</Label>
              <Select
                value={formData.priority}
                onValueChange={(value: any) => setFormData(prev => ({ ...prev, priority: value }))}
              >
                <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Type */}
            <div>
              <Label className="text-white">Type</Label>
              <Select
                value={formData.type}
                onValueChange={(value: any) => setFormData(prev => ({ ...prev, type: value }))}
              >
                <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  <SelectItem value="task">Task</SelectItem>
                  <SelectItem value="reminder">Reminder</SelectItem>
                  <SelectItem value="meeting">Meeting</SelectItem>
                  <SelectItem value="deadline">Deadline</SelectItem>
                  <SelectItem value="follow_up">Follow Up</SelectItem>
                  <SelectItem value="general">General</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Department */}
            <div>
              <Label className="text-white">Department</Label>
              <Select
                value={formData.department_id || ""}
                onValueChange={(value) => setFormData(prev => {
                  // Clear assigned_to if selected user is not in the new department
                  const userStillValid = value === 'no_department' ||
                    !prev.assigned_to || prev.assigned_to === 'unassigned' ||
                    users.find(u => u.id === prev.assigned_to)?.department_id === value
                  return {
                    ...prev,
                    department_id: value || undefined,
                    assigned_to: userStillValid ? prev.assigned_to : 'unassigned',
                  }
                })}
              >
                <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  <SelectItem value="no_department">No Department</SelectItem>
                  {departments.map((dept) => (
                    <SelectItem key={dept.id} value={dept.id}>
                      {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Assigned To */}
            <div>
              <Label className="text-white">
                Assigned To
                {formData.department_id && formData.department_id !== 'no_department' && (
                  <span className="ml-2 text-xs text-gray-400 font-normal">
                    ({filteredUsers.length} in dept)
                  </span>
                )}
              </Label>
              <Select
                value={formData.assigned_to || ""}
                onValueChange={(value) => setFormData(prev => ({ ...prev, assigned_to: value || undefined }))}
              >
                <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                  <SelectValue placeholder="Select user" />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {filteredUsers.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.first_name} {user.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Project */}
            <div className="col-span-2">
              <Label className="text-white">Project</Label>
              <Select
                value={formData.project_id || "no_project"}
                onValueChange={(value) => setFormData(prev => ({ ...prev, project_id: value }))}
              >
                <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                  <SelectValue placeholder="Select project (optional)" />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  <SelectItem value="no_project">No Project</SelectItem>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Start Date */}
            <div>
              <Label htmlFor="start_date" className="text-white">Start Date</Label>
              <Input
                id="start_date"
                type="datetime-local"
                value={formData.start_date ? format(formData.start_date, "yyyy-MM-dd'T'HH:mm") : ""}
                onChange={(e) => {
                  const start = e.target.value ? new Date(e.target.value) : undefined
                  setFormData(prev => {
                    const hours = start && prev.due_date
                      ? Math.max(0, Math.round((prev.due_date.getTime() - start.getTime()) / 36e5 * 10) / 10)
                      : prev.estimated_hours
                    return { ...prev, start_date: start, estimated_hours: hours }
                  })
                }}
                className="bg-gray-800 border-gray-700 text-white"
              />
            </div>

            {/* Due Date */}
            <div>
              <Label htmlFor="due_date" className="text-white">Due Date</Label>
              <Input
                id="due_date"
                type="datetime-local"
                value={formData.due_date ? format(formData.due_date, "yyyy-MM-dd'T'HH:mm") : ""}
                onChange={(e) => {
                  const due = e.target.value ? new Date(e.target.value) : undefined
                  setFormData(prev => {
                    const start = prev.start_date
                    const hours = due && start
                      ? Math.max(0, Math.round((due.getTime() - start.getTime()) / 36e5 * 10) / 10)
                      : prev.estimated_hours
                    return { ...prev, due_date: due, estimated_hours: hours }
                  })
                }}
                className="bg-gray-800 border-gray-700 text-white"
              />
            </div>

            {/* Estimated Hours — auto-calculated, still editable */}
            <div className="col-span-2">
              <Label htmlFor="estimated_hours" className="text-white">
                Estimated Hours
                {formData.start_date && formData.due_date && (
                  <span className="ml-2 text-xs text-blue-400 font-normal">auto-calculated</span>
                )}
              </Label>
              <Input
                id="estimated_hours"
                type="number"
                min="0"
                step="0.5"
                value={formData.estimated_hours || ""}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  estimated_hours: e.target.value ? parseFloat(e.target.value) : undefined
                }))}
                className="bg-gray-800 border-gray-700 text-white"
                placeholder="Set start & due date to auto-calculate"
              />
            </div>

            {/* Tags */}
            <div className="col-span-2">
              <Label className="text-white">Tags</Label>
              <div className="flex space-x-2 mb-2">
                <Input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  className="bg-gray-800 border-gray-700 text-white"
                  placeholder="Add a tag"
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleAddTag}
                  className="bg-gray-800 border-gray-700 text-white hover:bg-gray-700"
                >
                  Add
                </Button>
              </div>
              {formData.tags && formData.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {formData.tags.map((tag) => (
                    <span
                      key={tag}
                      className="bg-blue-600 text-white px-2 py-1 rounded text-sm flex items-center space-x-1"
                    >
                      <span>{tag}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        className="text-blue-200 hover:text-white"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="flex space-x-2">
            {isEditing && onDelete && (
              <Button
                type="button"
                variant="destructive"
                onClick={() => task?.id && onDelete(task.id)}
                disabled={isLoading}
              >
                Delete
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
              className="bg-gray-800 border-gray-700 text-white hover:bg-gray-700"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading || !formData.title.trim()}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isLoading ? "Saving..." : isEditing ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export { TaskModal };