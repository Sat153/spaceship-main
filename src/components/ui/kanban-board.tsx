"use client";

import * as React from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
  useDroppable,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import {
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Plus } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TaskCard, TaskCardProps } from "@/components/ui/task-card";

export interface KanbanColumn {
  id: string;
  title: string;
  status: 'todo' | 'in_progress' | 'review' | 'completed' | 'cancelled';
  color?: string;
  limit?: number;
}

export interface KanbanTask extends Omit<TaskCardProps, 'onClick' | 'className' | 'isDragging'> {
  id: string;
  status: 'todo' | 'in_progress' | 'review' | 'completed' | 'cancelled';
  kanban_position: number;
}

export interface KanbanBoardProps {
  columns: KanbanColumn[];
  tasks: KanbanTask[];
  onTaskMove?: (taskId: string, newStatus: string, newPosition: number) => void;
  onTaskClick?: (task: KanbanTask) => void;
  onAddTask?: (status: string) => void;
  className?: string;
}

interface SortableTaskProps {
  task: KanbanTask;
  onTaskClick?: (task: KanbanTask) => void;
}

const SortableTask: React.FC<SortableTaskProps> = ({ task, onTaskClick }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="mb-3"
    >
      <TaskCard
        {...task}
        onClick={() => onTaskClick?.(task)}
        isDragging={isDragging}
        className={cn(
          "touch-none",
          isDragging && "shadow-2xl z-50"
        )}
      />
    </div>
  );
};

interface KanbanColumnComponentProps {
  column: KanbanColumn;
  tasks: KanbanTask[];
  onTaskClick?: (task: KanbanTask) => void;
  onAddTask?: (status: string) => void;
}

interface DroppableColumnProps {
  id: string;
  children: React.ReactNode;
}

const DroppableColumn: React.FC<DroppableColumnProps> = ({ id, children }) => {
  const { setNodeRef, isOver } = useDroppable({
    id: id,
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "transition-colors duration-200",
        isOver && "bg-gray-800/50 rounded-lg"
      )}
    >
      {children}
    </div>
  );
};

const KanbanColumnComponent: React.FC<KanbanColumnComponentProps> = ({
  column,
  tasks,
  onTaskClick,
  onAddTask,
}) => {
  const isAtLimit = Boolean(column.limit && tasks.length >= column.limit);

  return (
    <DroppableColumn id={`column-${column.status}`}>
      <Card className="flex-shrink-0 w-72 sm:w-80 bg-gray-900 border-gray-700">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-white text-lg flex items-center space-x-2">
              <span
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: column.color || "#6B7280" }}
              />
              <span>{column.title}</span>
              <span className="bg-gray-700 text-gray-300 text-xs px-2 py-1 rounded-full">
                {tasks.length}
                {column.limit && `/${column.limit}`}
              </span>
            </CardTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onAddTask?.(column.status)}
              className="h-8 w-8 text-gray-400 hover:text-white"
              disabled={isAtLimit}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          {isAtLimit && (
            <p className="text-xs text-orange-400">
              Column limit reached ({column.limit})
            </p>
          )}
        </CardHeader>

        <CardContent className="pt-0">
          <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-3 min-h-[200px]">
              {tasks.map((task) => (
                <SortableTask
                  key={task.id}
                  task={task}
                  onTaskClick={onTaskClick}
                />
              ))}
            </div>
          </SortableContext>
        </CardContent>
      </Card>
    </DroppableColumn>
  );
};

const KanbanBoard = React.forwardRef<HTMLDivElement, KanbanBoardProps>(
  ({ columns, tasks, onTaskMove, onTaskClick, onAddTask, className }, ref) => {
    const [activeTask, setActiveTask] = React.useState<KanbanTask | null>(null);
    const [isDragging, setIsDragging] = React.useState(false);

    const sensors = useSensors(
      useSensor(PointerSensor, {
        activationConstraint: {
          distance: 8,
        },
      }),
      useSensor(KeyboardSensor, {
        coordinateGetter: sortableKeyboardCoordinates,
      })
    );

    const handleDragStart = (event: DragStartEvent) => {
      const task = tasks.find(t => t.id === event.active.id);
      setActiveTask(task || null);
      setIsDragging(true);
    };

    const handleDragOver = (event: DragOverEvent) => {
      const { active, over } = event;
      
      if (!over) return;
      
      const activeTask = tasks.find(t => t.id === active.id);
      if (!activeTask) return;
      
      // Handle dragging over a column
      const overColumnId = over.id.toString();
      if (overColumnId.startsWith('column-')) {
        const targetStatus = overColumnId.replace('column-', '');
        if (activeTask.status !== targetStatus) {
          // This is just for visual feedback, actual move happens in dragEnd
          return;
        }
      }
    };

    const handleDragEnd = (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveTask(null);
      setIsDragging(false);

      if (!over) return;

      const activeTask = tasks.find(t => t.id === active.id);
      if (!activeTask) return;

      const overId = over.id.toString();
      
      // Check if dropped on another task (reordering within column)
      const overTask = tasks.find(t => t.id === overId);
      if (overTask) {
        if (activeTask.status === overTask.status) {
          // Reordering within the same column
          const columnTasks = tasks
            .filter(t => t.status === activeTask.status)
            .sort((a, b) => a.kanban_position - b.kanban_position);
          
          const oldIndex = columnTasks.findIndex(t => t.id === activeTask.id);
          const newIndex = columnTasks.findIndex(t => t.id === overTask.id);

          if (oldIndex !== newIndex && oldIndex !== -1 && newIndex !== -1) {
            // Calculate new position based on the target task's position
            let newPosition: number;
            if (newIndex === 0) {
              // Moving to first position
              newPosition = Math.max(0, columnTasks[0].kanban_position - 1);
            } else if (newIndex === columnTasks.length - 1) {
              // Moving to last position
              newPosition = columnTasks[columnTasks.length - 1].kanban_position + 1;
            } else {
              // Moving between tasks
              if (oldIndex < newIndex) {
                // Moving down
                newPosition = (columnTasks[newIndex].kanban_position + columnTasks[newIndex + 1].kanban_position) / 2;
              } else {
                // Moving up
                newPosition = (columnTasks[newIndex - 1].kanban_position + columnTasks[newIndex].kanban_position) / 2;
              }
            }
            onTaskMove?.(activeTask.id, activeTask.status, newPosition);
          }
        } else {
          // Moving to a different column, position at the end
          const targetColumnTasks = tasks.filter(t => t.status === overTask.status);
          const newPosition = targetColumnTasks.length > 0 
            ? Math.max(...targetColumnTasks.map(t => t.kanban_position)) + 1
            : 0;
          onTaskMove?.(activeTask.id, overTask.status, newPosition);
        }
        return;
      }

      // Check if dropped on a column
      if (overId.startsWith('column-')) {
        const targetStatus = overId.replace('column-', '');
        const targetColumn = columns.find(col => col.status === targetStatus);
        
        if (targetColumn && activeTask.status !== targetStatus) {
          // Check column limits
          const targetColumnTasks = tasks.filter(t => t.status === targetStatus);
          if (targetColumn.limit && targetColumnTasks.length >= targetColumn.limit) {
            console.warn(`Column ${targetColumn.title} is at capacity (${targetColumn.limit})`);
            return;
          }
          
          // Moving to a different column, add to the end
          const newPosition = targetColumnTasks.length > 0 
            ? Math.max(...targetColumnTasks.map(t => t.kanban_position)) + 1
            : 0;
          onTaskMove?.(activeTask.id, targetStatus, newPosition);
        }
      }
    };

    const getTasksByStatus = (status: string): KanbanTask[] => {
      return tasks
        .filter(task => task.status === status)
        .sort((a, b) => a.kanban_position - b.kanban_position);
    };

    return (
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div
          ref={ref}
          className={cn(
            "flex space-x-4 overflow-x-auto pb-6 min-h-[60vh] sm:min-h-screen",
            className
          )}
        >
          {columns.map((column) => (
            <KanbanColumnComponent
              key={column.id}
              column={column}
              tasks={getTasksByStatus(column.status)}
              onTaskClick={onTaskClick}
              onAddTask={onAddTask}
            />
          ))}
        </div>

        <DragOverlay>
          {activeTask ? (
            <TaskCard
              {...activeTask}
              isDragging
              className="rotate-3 shadow-2xl opacity-95"
            />
          ) : null}
        </DragOverlay>
      </DndContext>
    );
  }
);

KanbanBoard.displayName = "KanbanBoard";

export { KanbanBoard };