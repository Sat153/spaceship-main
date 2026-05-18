"use client";

import * as React from "react";
import { format } from "date-fns";
import { Calendar, Clock, User, MessageSquare, Paperclip } from "lucide-react";

import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export interface TaskCardProps {
  id: string;
  title: string;
  description?: string;
  status: 'todo' | 'in_progress' | 'review' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  type: 'reminder' | 'task' | 'meeting' | 'deadline' | 'follow_up' | 'general';
  assignedTo?: {
    id: string;
    name: string;
    avatar?: string;
  };
  dueDate?: Date;
  tags?: string[];
  commentsCount?: number;
  attachmentsCount?: number;
  estimatedHours?: number;
  actualHours?: number;
  onClick?: () => void;
  className?: string;
  isDragging?: boolean;
}

const priorityColors = {
  low: "bg-green-500/20 text-green-400 border-green-500/30",
  medium: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  high: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  urgent: "bg-red-500/20 text-red-400 border-red-500/30",
};

const statusColors = {
  todo: "bg-gray-500/20 text-gray-400",
  in_progress: "bg-blue-500/20 text-blue-400",
  review: "bg-purple-500/20 text-purple-400",
  completed: "bg-green-500/20 text-green-400",
  cancelled: "bg-red-500/20 text-red-400",
};

const typeIcons = {
  reminder: "🔔",
  task: "📋",
  meeting: "👥",
  deadline: "⏰",
  follow_up: "🔄",
  general: "📝",
};

const TaskCard = React.forwardRef<HTMLDivElement, TaskCardProps>(
  ({
    id,
    title,
    description,
    status,
    priority,
    type,
    assignedTo,
    dueDate,
    tags = [],
    commentsCount = 0,
    attachmentsCount = 0,
    estimatedHours,
    actualHours,
    onClick,
    className,
    isDragging = false,
    ...props
  }, ref) => {
    const isOverdue = dueDate && new Date() > dueDate && status !== 'completed';

    return (
      <Card
        ref={ref}
        className={cn(
          "cursor-pointer transition-all duration-200 hover:shadow-md",
          "bg-gray-900 border-gray-700 hover:border-gray-600",
          {
            "opacity-50 rotate-3 scale-105": isDragging,
            "border-red-500/50": isOverdue,
          },
          className
        )}
        onClick={onClick}
        {...props}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-2 flex-1">
              <span className="text-lg">{typeIcons[type]}</span>
              <h3 className="font-semibold text-white text-sm leading-tight line-clamp-2">
                {title}
              </h3>
            </div>
            <Badge 
              variant="outline" 
              className={cn("text-xs", priorityColors[priority])}
            >
              {priority}
            </Badge>
          </div>

          {description && (
            <p className="text-sm text-gray-400 line-clamp-2 mt-2 break-all">
              {description}
            </p>
          )}
        </CardHeader>

        <CardContent className="pt-0">
          {/* Tags */}
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-3">
              {tags.slice(0, 3).map((tag) => (
                <Badge
                  key={tag}
                  variant="secondary"
                  className="text-xs bg-gray-800 text-gray-300"
                >
                  {tag}
                </Badge>
              ))}
              {tags.length > 3 && (
                <Badge
                  variant="secondary"
                  className="text-xs bg-gray-800 text-gray-300"
                >
                  +{tags.length - 3}
                </Badge>
              )}
            </div>
          )}

          {/* Due Date */}
          {dueDate && (
            <div className={cn(
              "flex items-center space-x-1 text-xs mb-2",
              isOverdue ? "text-red-400" : "text-gray-400"
            )}>
              <Calendar className="h-3 w-3" />
              <span>{format(dueDate, "MMM d, yyyy")}</span>
              {isOverdue && <span className="text-red-400 font-medium">(Overdue)</span>}
            </div>
          )}

          {/* Time Estimate */}
          {estimatedHours && (
            <div className="flex items-center space-x-1 text-xs text-gray-400 mb-2">
              <Clock className="h-3 w-3" />
              <span>
                {actualHours ? `${actualHours}/${estimatedHours}h` : `${estimatedHours}h estimated`}
              </span>
            </div>
          )}

          {/* Assigned User */}
          {assignedTo && (
            <div className="flex items-center space-x-2 mb-3">
              <User className="h-3 w-3 text-gray-400" />
              <span className="text-xs text-gray-400">{assignedTo.name}</span>
            </div>
          )}

          {/* Footer with meta info */}
          <div className="flex items-center justify-between">
            <Badge 
              variant="outline" 
              className={cn("text-xs", statusColors[status])}
            >
              {status.replace('_', ' ')}
            </Badge>

            <div className="flex items-center space-x-3">
              {commentsCount > 0 && (
                <div className="flex items-center space-x-1 text-xs text-gray-400">
                  <MessageSquare className="h-3 w-3" />
                  <span>{commentsCount}</span>
                </div>
              )}
              {attachmentsCount > 0 && (
                <div className="flex items-center space-x-1 text-xs text-gray-400">
                  <Paperclip className="h-3 w-3" />
                  <span>{attachmentsCount}</span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }
);

TaskCard.displayName = "TaskCard";

export { TaskCard };