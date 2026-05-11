"use client";

import * as React from "react";
import { format, isValid } from "date-fns";
import { Calendar, Clock, MapPin, Link as LinkIcon, User } from "lucide-react";

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

export interface EventModalData {
  id?: string;
  title: string;
  description?: string;
  event_type: 'meeting' | 'deadline' | 'reminder' | 'appointment' | 'block_time' | 'general';
  start_date: Date;
  end_date: Date;
  all_day: boolean;
  location?: string;
  meeting_url?: string;
  assigned_to?: string[];
  department_id?: string;
  client_id?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  color: string;
  tags?: string[];
}

export interface EventModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event?: EventModalData | null;
  selectedDate?: Date;
  onSave: (event: EventModalData) => void;
  onDelete?: (eventId: string) => void;
  departments?: Array<{ id: string; name: string }>;
  users?: Array<{ id: string; first_name: string; last_name: string; department_id?: string }>;
  clients?: Array<{ id: string; name: string }>;
  isLoading?: boolean;
}

const defaultColors = [
  "#3B82F6",
  "#10B981",
  "#F59E0B",
  "#EF4444",
  "#8B5CF6",
  "#F97316",
  "#06B6D4",
  "#84CC16",
];

const EventModal: React.FC<EventModalProps> = ({
  open,
  onOpenChange,
  event,
  selectedDate,
  onSave,
  onDelete,
  departments = [],
  users = [],
  clients = [],
  isLoading = false,
}) => {
  const [formData, setFormData] = React.useState<EventModalData>({
    title: "",
    description: "",
    event_type: "general",
    start_date: new Date(),
    end_date: new Date(),
    all_day: false,
    priority: "medium",
    color: "#3B82F6",
    tags: [],
    assigned_to: [],
  });

  const [tagInput, setTagInput] = React.useState("");

  const filteredUsers = React.useMemo(() => {
    const deptId = formData.department_id;
    if (!deptId || deptId === "no_department") return users;
    return users.filter((u) => u.department_id === deptId);
  }, [users, formData.department_id]);

  React.useEffect(() => {
    if (event) {
      setFormData({
        ...event,
        tags: event.tags || [],
        assigned_to: event.assigned_to || [],
        department_id: event.department_id || "no_department",
        client_id: event.client_id || "no_client",
      });
    } else {
      const now = selectedDate || new Date();
      const endTime = new Date(now);
      endTime.setHours(endTime.getHours() + 1);
      setFormData({
        title: "",
        description: "",
        event_type: "general",
        start_date: now,
        end_date: endTime,
        all_day: false,
        priority: "medium",
        color: "#3B82F6",
        tags: [],
        assigned_to: [],
        department_id: "no_department",
        client_id: "no_client",
      });
    }
    setTagInput("");
  }, [event, selectedDate, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) return;

    if (formData.end_date <= formData.start_date) {
      const newEndDate = new Date(formData.start_date);
      newEndDate.setHours(newEndDate.getHours() + 1);
      setFormData((prev) => ({ ...prev, end_date: newEndDate }));
      return;
    }

    const eventDataToSave = {
      ...formData,
      assigned_to:
        formData.assigned_to && formData.assigned_to.length > 0
          ? formData.assigned_to
          : undefined,
      department_id:
        formData.department_id === "no_department"
          ? undefined
          : formData.department_id,
      client_id:
        formData.client_id === "no_client" ? undefined : formData.client_id,
    };

    onSave(eventDataToSave);
  };

  const handleAllDayChange = (allDay: boolean) => {
    if (allDay) {
      const startOfDay = new Date(formData.start_date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(formData.start_date);
      endOfDay.setHours(23, 59, 59, 999);
      setFormData((prev) => ({
        ...prev,
        all_day: true,
        start_date: startOfDay,
        end_date: endOfDay,
      }));
    } else {
      setFormData((prev) => ({ ...prev, all_day: false }));
    }
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !formData.tags?.includes(tagInput.trim())) {
      setFormData((prev) => ({
        ...prev,
        tags: [...(prev.tags || []), tagInput.trim()],
      }));
      setTagInput("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags?.filter((tag) => tag !== tagToRemove) || [],
    }));
  };

  const isEditing = !!event?.id;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:max-w-[600px] bg-gray-900 border-gray-700 flex flex-col max-h-[90vh]">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="text-white">
            {isEditing ? "Edit Event" : "Create New Event"}
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            {isEditing
              ? "Update event details below."
              : "Fill in the details to create a new event."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          {/* Scrollable fields */}
          <div className="flex-1 overflow-y-auto pr-1 space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">

              {/* Title */}
              <div className="col-span-2">
                <Label htmlFor="title" className="text-white">Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                  className="bg-gray-800 border-gray-700 text-white"
                  placeholder="Enter event title"
                  required
                />
              </div>

              {/* Description */}
              <div className="col-span-2">
                <Label htmlFor="description" className="text-white">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description || ""}
                  onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                  className="bg-gray-800 border-gray-700 text-white"
                  placeholder="Enter event description"
                  rows={3}
                />
              </div>

              {/* Event Type */}
              <div>
                <Label className="text-white">Event Type</Label>
                <Select
                  value={formData.event_type}
                  onValueChange={(value: any) => setFormData((prev) => ({ ...prev, event_type: value }))}
                >
                  <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700">
                    <SelectItem value="meeting">Meeting</SelectItem>
                    <SelectItem value="deadline">Deadline</SelectItem>
                    <SelectItem value="reminder">Reminder</SelectItem>
                    <SelectItem value="appointment">Appointment</SelectItem>
                    <SelectItem value="block_time">Block Time</SelectItem>
                    <SelectItem value="general">General</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Priority */}
              <div>
                <Label className="text-white">Priority</Label>
                <Select
                  value={formData.priority}
                  onValueChange={(value: any) => setFormData((prev) => ({ ...prev, priority: value }))}
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

              {/* All Day */}
              <div className="col-span-2">
                <Label className="text-white flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={formData.all_day}
                    onChange={(e) => handleAllDayChange(e.target.checked)}
                    className="rounded"
                  />
                  <span>All Day Event</span>
                </Label>
              </div>

              {/* Start Date */}
              <div>
                <Label htmlFor="start_date" className="text-white">Start Date &amp; Time</Label>
                <Input
                  id="start_date"
                  type={formData.all_day ? "date" : "datetime-local"}
                  value={
                    isValid(formData.start_date)
                      ? formData.all_day
                        ? format(formData.start_date, "yyyy-MM-dd")
                        : format(formData.start_date, "yyyy-MM-dd'T'HH:mm")
                      : ""
                  }
                  onChange={(e) => {
                    const d = new Date(e.target.value)
                    if (e.target.value && isValid(d)) {
                      setFormData((prev) => ({ ...prev, start_date: d }))
                    }
                  }}
                  className="bg-gray-800 border-gray-700 text-white"
                  required
                />
              </div>

              {/* End Date */}
              <div>
                <Label htmlFor="end_date" className="text-white">End Date &amp; Time</Label>
                <Input
                  id="end_date"
                  type={formData.all_day ? "date" : "datetime-local"}
                  value={
                    isValid(formData.end_date)
                      ? formData.all_day
                        ? format(formData.end_date, "yyyy-MM-dd")
                        : format(formData.end_date, "yyyy-MM-dd'T'HH:mm")
                      : ""
                  }
                  onChange={(e) => {
                    const d = new Date(e.target.value)
                    if (e.target.value && isValid(d)) {
                      setFormData((prev) => ({ ...prev, end_date: d }))
                    }
                  }}
                  className="bg-gray-800 border-gray-700 text-white"
                  required
                  disabled={formData.all_day}
                />
              </div>

              {/* Location */}
              <div>
                <Label htmlFor="location" className="text-white">Location</Label>
                <Input
                  id="location"
                  value={formData.location || ""}
                  onChange={(e) => setFormData((prev) => ({ ...prev, location: e.target.value }))}
                  className="bg-gray-800 border-gray-700 text-white"
                  placeholder="Enter location"
                />
              </div>

              {/* Meeting URL */}
              <div>
                <Label htmlFor="meeting_url" className="text-white">Meeting URL</Label>
                <Input
                  id="meeting_url"
                  type="url"
                  value={formData.meeting_url || ""}
                  onChange={(e) => setFormData((prev) => ({ ...prev, meeting_url: e.target.value }))}
                  className="bg-gray-800 border-gray-700 text-white"
                  placeholder="https://..."
                />
              </div>

              {/* Department */}
              <div>
                <Label className="text-white">Department</Label>
                <Select
                  value={formData.department_id || ""}
                  onValueChange={(value) =>
                    setFormData((prev) => ({ ...prev, department_id: value || undefined, assigned_to: [] }))
                  }
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

              {/* Client */}
              <div>
                <Label className="text-white">Client</Label>
                <Select
                  value={formData.client_id || ""}
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, client_id: value || undefined }))}
                >
                  <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                    <SelectValue placeholder="Select client" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700">
                    <SelectItem value="no_client">No Client</SelectItem>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Assigned To — checkbox list filtered by department */}
              <div className="col-span-2">
                <Label className="text-white flex items-center gap-2 mb-2">
                  Assigned To
                  {formData.assigned_to && formData.assigned_to.length > 0 && (
                    <span className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded-full">
                      {formData.assigned_to.length} selected
                    </span>
                  )}
                  {formData.department_id && formData.department_id !== "no_department" && (
                    <span className="text-xs text-blue-400 font-normal">· filtered by department</span>
                  )}
                </Label>
                {filteredUsers.length === 0 ? (
                  <p className="text-xs text-gray-500 py-2">
                    {formData.department_id && formData.department_id !== "no_department"
                      ? "No members in this department"
                      : "Select a department to filter members"}
                  </p>
                ) : (
                  <div className="max-h-36 overflow-y-auto rounded-lg border border-gray-700 bg-gray-800 divide-y divide-gray-700">
                    {filteredUsers.map((user) => {
                      const isChecked = formData.assigned_to?.includes(user.id) ?? false;
                      return (
                        <label
                          key={user.id}
                          className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-gray-700 transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              setFormData((prev) => ({
                                ...prev,
                                assigned_to: e.target.checked
                                  ? [...(prev.assigned_to || []), user.id]
                                  : (prev.assigned_to || []).filter((id) => id !== user.id),
                              }));
                            }}
                            className="w-4 h-4 rounded accent-blue-500"
                          />
                          <span className="text-sm text-white">
                            {user.first_name} {user.last_name}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Color */}
              <div>
                <Label className="text-white">Color</Label>
                <div className="flex space-x-2 mt-1">
                  {defaultColors.map((color) => (
                    <button
                      key={color}
                      type="button"
                      className={cn(
                        "w-8 h-8 rounded border-2",
                        formData.color === color ? "border-white" : "border-gray-600"
                      )}
                      style={{ backgroundColor: color }}
                      onClick={() => setFormData((prev) => ({ ...prev, color }))}
                    />
                  ))}
                </div>
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
                    onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), handleAddTag())}
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
          </div>

          {/* Footer — always visible */}
          <DialogFooter className="flex-shrink-0 pt-4 border-t border-gray-700 mt-2">
            {isEditing && onDelete && (
              <Button
                type="button"
                variant="destructive"
                onClick={() => event?.id && onDelete(event.id)}
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

export { EventModal };
