"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Badge } from "@/components/ui/badge";
import {
  Clock,
  FolderKanban,
  ClipboardList,
  GripVertical,
} from "lucide-react";
import type { TaskStatus, TaskPriority, Role } from "@/lib/types/database";

interface TaskRow {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  estimated_hours: number | null;
  actual_hours: number | null;
  due_date: string | null;
  project_id: string | null;
  projects: { name: string } | null;
}

const allColumns: { id: TaskStatus; label: string; dotColor: string; headerBg: string }[] = [
  { id: "pending", label: "Pending", dotColor: "bg-amber-500", headerBg: "bg-amber-500/5 dark:bg-amber-500/10" },
  { id: "in_progress", label: "In Progress", dotColor: "bg-indigo-500", headerBg: "bg-indigo-500/5 dark:bg-indigo-500/10" },
  { id: "on_hold", label: "On Hold", dotColor: "bg-orange-500", headerBg: "bg-orange-500/5 dark:bg-orange-500/10" },
  { id: "testing", label: "Testing", dotColor: "bg-cyan-500", headerBg: "bg-cyan-500/5 dark:bg-cyan-500/10" },
  { id: "completed", label: "Completed", dotColor: "bg-green-500", headerBg: "bg-green-500/5 dark:bg-green-500/10" },
];

const priorityConfig: Record<TaskPriority, { label: string; class: string }> = {
  low: { label: "Low", class: "bg-secondary text-muted-foreground" },
  medium: { label: "Med", class: "bg-indigo-500/15 text-indigo-400" },
  high: { label: "High", class: "bg-red-500/15 text-red-400" },
};

export function MyTasks({ userId, userRole }: { userId: string; userRole: Role }) {
  const supabase = createClient();
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [draggedTask, setDraggedTask] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);

  const canDropTo = (status: TaskStatus): boolean => {
    if (userRole === "admin") return true;
    if (userRole === "tester") return true;
    if (status === "completed") return false;
    return true;
  };

  const loadData = useCallback(async () => {
    const { data: t } = await supabase
      .from("tasks")
      .select("id, title, description, status, priority, estimated_hours, actual_hours, due_date, project_id, projects(name)")
      .eq("assigned_to", userId)
      .order("priority", { ascending: true })
      .order("created_at", { ascending: false });
    if (t) setTasks(t as unknown as TaskRow[]);
  }, [userId, supabase]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleStatusChange = async (taskId: string, newStatus: TaskStatus) => {
    if (!canDropTo(newStatus)) return;
    await supabase
      .from("tasks")
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq("id", taskId);
    await loadData();
  };

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    setDraggedTask(taskId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, status: TaskStatus) => {
    if (!canDropTo(status)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverCol(status);
  };

  const handleDragLeave = () => {
    setDragOverCol(null);
  };

  const handleDrop = async (e: React.DragEvent, targetStatus: TaskStatus) => {
    e.preventDefault();
    setDragOverCol(null);
    if (!draggedTask || !canDropTo(targetStatus)) return;
    await handleStatusChange(draggedTask, targetStatus);
    setDraggedTask(null);
  };

  const handleDragEnd = () => {
    setDraggedTask(null);
    setDragOverCol(null);
  };

  const visibleColumns = allColumns.filter(
    (col) => canDropTo(col.id) || tasks.some((t) => t.status === col.id)
  );

  if (tasks.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card shadow-sm">
        <div className="flex items-center gap-2 border-b border-border px-4 py-4">
          <ClipboardList className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">My Tasks</h3>
        </div>
        <div className="flex flex-col items-center gap-2 py-8">
          <ClipboardList className="h-8 w-8 text-muted-foreground/30" />
          <p className="text-xs text-muted-foreground">No tasks assigned to you</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <ClipboardList className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">My Tasks</h3>
        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
          {tasks.length}
        </span>
      </div>

      {/* Kanban Board */}
      <div className="grid grid-cols-5 gap-4">
        {visibleColumns.map((col) => {
          const colTasks = tasks.filter((t) => t.status === col.id);
          const droppable = canDropTo(col.id);
          const isOver = dragOverCol === col.id;

          return (
            <div
              key={col.id}
              className={`flex min-h-48 flex-col rounded-xl border bg-card shadow-sm transition-all
                ${isOver && droppable ? "border-primary/50 ring-2 ring-primary/20" : "border-border"}
                ${!droppable ? "opacity-50" : ""}
              `}
              onDragOver={(e) => handleDragOver(e, col.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, col.id)}
            >
              {/* Column Header */}
              <div className={`flex items-center gap-2 rounded-t-xl px-4 py-3 ${col.headerBg}`}>
                <div className={`h-2 w-2 rounded-full ${col.dotColor}`} />
                <span className="text-xs font-semibold uppercase tracking-wider text-foreground/70">
                  {col.label}
                </span>
                <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-secondary text-xs font-medium text-muted-foreground">
                  {colTasks.length}
                </span>
                {!droppable && (
                  <span className="text-xs text-muted-foreground">🔒</span>
                )}
              </div>

              {/* Task Cards */}
              <div className="flex flex-1 flex-col gap-2 p-2.5">
                {colTasks.length === 0 ? (
                  <div className={`flex flex-1 items-center justify-center rounded-lg border-2 border-dashed py-8 transition-colors
                    ${isOver ? "border-primary/30 bg-primary/5" : "border-border"}
                  `}>
                    <p className="text-xs text-muted-foreground">
                      {droppable ? "Drop here" : ""}
                    </p>
                  </div>
                ) : (
                  colTasks.map((task) => {
                    const pc = priorityConfig[task.priority];
                    return (
                      <div
                        key={task.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, task.id)}
                        onDragEnd={handleDragEnd}
                        className={`group cursor-grab rounded-lg border border-border bg-background p-4 shadow-sm transition-all
                          hover:shadow-md hover:border-primary/30 active:cursor-grabbing
                          ${draggedTask === task.id ? "scale-95 opacity-50" : ""}
                        `}
                      >
                        <div className="flex items-start gap-2">
                          <GripVertical className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground/30 transition-colors group-hover:text-muted-foreground" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground">
                              {task.title}
                            </p>
                            <div className="mt-2 flex flex-wrap items-center gap-1.5">
                              {task.projects?.name && (
                                <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
                                  <FolderKanban className="h-2.5 w-2.5" />
                                  <span className="truncate max-w-20">{task.projects.name}</span>
                                </span>
                              )}
                              <Badge variant="secondary" className={`border-0 px-2 py-0.5 text-xs ${pc.class}`}>
                                {pc.label}
                              </Badge>
                            </div>
                            {task.estimated_hours != null && (
                              <div className="mt-2 flex items-center gap-1">
                                <Clock className="h-2.5 w-2.5 text-muted-foreground" />
                                <span className="text-xs text-muted-foreground">
                                  {task.actual_hours ?? 0}/{task.estimated_hours}h
                                </span>
                              </div>
                            )}
                            {task.estimated_hours != null && task.estimated_hours > 0 && (
                              <div className="mt-2">
                                <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                                  <div
                                    className="h-full rounded-full bg-primary transition-all"
                                    style={{
                                      width: `${Math.min(100, ((task.actual_hours ?? 0) / task.estimated_hours) * 100)}%`,
                                    }}
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
