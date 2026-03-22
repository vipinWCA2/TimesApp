"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Plus,
  Clock,
  Trash2,
  GripVertical,
  FolderKanban,
  User,
} from "lucide-react";
import type { TaskStatus, TaskPriority } from "@/lib/types/database";

interface TaskRow {
  id: string;
  title: string;
  description: string | null;
  project_id: string | null;
  assigned_to: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  estimated_hours: number | null;
  actual_hours: number | null;
  due_date: string | null;
  created_at: string;
  projects?: { name: string } | null;
  profiles?: { full_name: string } | null;
}

interface Project {
  id: string;
  name: string;
}

interface Employee {
  user_id: string;
  full_name: string;
}

const columns: { id: TaskStatus; label: string; color: string; dotColor: string }[] = [
  { id: "pending", label: "Pending", color: "border-amber-500/30", dotColor: "bg-amber-400" },
  { id: "in_progress", label: "In Progress", color: "border-indigo-500/30", dotColor: "bg-indigo-400" },
  { id: "on_hold", label: "On Hold", color: "border-orange-500/30", dotColor: "bg-orange-400" },
  { id: "testing", label: "Testing", color: "border-cyan-500/30", dotColor: "bg-cyan-400" },
  { id: "completed", label: "Completed", color: "border-green-500/30", dotColor: "bg-green-400" },
];

const priorityConfig: Record<TaskPriority, { label: string; bg: string; text: string; border: string }> = {
  low: { label: "Low", bg: "bg-slate-500/10", text: "text-slate-400", border: "border-slate-500/20" },
  medium: { label: "Medium", bg: "bg-indigo-500/10", text: "text-indigo-400", border: "border-indigo-500/20" },
  high: { label: "High", bg: "bg-red-500/10", text: "text-red-400", border: "border-red-500/20" },
};

export default function AdminTasksPage() {
  const supabase = createClient();
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [showDialog, setShowDialog] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draggedTask, setDraggedTask] = useState<string | null>(null);

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [projectId, setProjectId] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [estimatedHours, setEstimatedHours] = useState("");
  const [dueDate, setDueDate] = useState("");

  const loadData = useCallback(async () => {
    const { data: t } = await supabase
      .from("tasks")
      .select("*, projects(name), assigned:profiles!tasks_assigned_to_fkey(full_name)")
      .order("created_at", { ascending: false });
    if (t) {
      const mapped = t.map((row: Record<string, unknown>) => ({
        ...row,
        profiles: row.assigned,
      }));
      setTasks(mapped as TaskRow[]);
    }

    const { data: p } = await supabase.from("projects").select("id, name");
    if (p) setProjects(p);

    const { data: e } = await supabase.from("profiles").select("user_id, full_name");
    if (e) setEmployees(e);
  }, [supabase]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreate = async () => {
    if (!title.trim()) return;
    setSaving(true);

    const { data: { user } } = await supabase.auth.getUser();

    const { error: insertErr } = await supabase.from("tasks").insert({
      title: title.trim(),
      description: description.trim() || null,
      project_id: projectId || null,
      assigned_to: assignedTo || null,
      assigned_by: user?.id ?? null,
      priority,
      estimated_hours: estimatedHours ? parseFloat(estimatedHours) : null,
      due_date: dueDate || null,
    });
    if (insertErr) {
      alert("Task create error: " + insertErr.message);
      setSaving(false);
      return;
    }

    setTitle("");
    setDescription("");
    setProjectId("");
    setAssignedTo("");
    setPriority("medium");
    setEstimatedHours("");
    setDueDate("");
    setShowDialog(false);
    setSaving(false);
    await loadData();
  };

  const handleStatusChange = async (taskId: string, newStatus: TaskStatus) => {
    await supabase
      .from("tasks")
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq("id", taskId);
    await loadData();
  };

  const handleDelete = async (id: string) => {
    await supabase.from("tasks").delete().eq("id", id);
    await loadData();
  };

  // Drag and drop
  const handleDragStart = (taskId: string) => {
    setDraggedTask(taskId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = async (e: React.DragEvent, targetStatus: TaskStatus) => {
    e.preventDefault();
    if (!draggedTask) return;
    await handleStatusChange(draggedTask, targetStatus);
    setDraggedTask(null);
  };

  const totalTasks = tasks.length;
  const totalEstimated = tasks.reduce((a, t) => a + (t.estimated_hours ?? 0), 0);

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Tasks Board</h1>
          <p className="mt-1 text-sm text-slate-500">
            {totalTasks} tasks · {totalEstimated}h estimated
          </p>
        </div>
        <Button onClick={() => setShowDialog(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          New Task
        </Button>
      </div>

      {/* Kanban Board */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {columns.map((col) => {
          const colTasks = tasks.filter((t) => t.status === col.id);
          return (
            <div
              key={col.id}
              className="flex w-72 shrink-0 flex-col rounded-xl border border-slate-800 bg-slate-900/30"
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, col.id)}
            >
              {/* Column Header */}
              <div className={`flex items-center gap-2 border-b ${col.color} px-4 py-4`}>
                <div className={`h-2 w-2 rounded-full ${col.dotColor}`} />
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  {col.label}
                </h3>
                <span className="ml-auto rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-500">
                  {colTasks.length}
                </span>
              </div>

              {/* Tasks */}
              <div className="flex flex-1 flex-col gap-2 p-2">
                {colTasks.length === 0 ? (
                  <div className="flex items-center justify-center rounded-lg border border-dashed border-slate-800 py-8">
                    <p className="text-xs text-slate-600">Drop tasks here</p>
                  </div>
                ) : (
                  colTasks.map((task) => {
                    const pc = priorityConfig[task.priority];
                    return (
                      <div
                        key={task.id}
                        draggable
                        onDragStart={() => handleDragStart(task.id)}
                        className={`group cursor-grab rounded-lg border border-slate-800 bg-slate-800/50 p-4 transition-all hover:border-slate-700 active:cursor-grabbing ${
                          draggedTask === task.id ? "opacity-50" : ""
                        }`}
                      >
                        {/* Card Top */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                            <GripVertical className="h-3 w-3 text-slate-600" />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-slate-200">
                              {task.title}
                            </p>
                            {task.description && (
                              <p className="mt-1 text-xs leading-relaxed text-slate-500 line-clamp-2">
                                {task.description}
                              </p>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(task.id)}
                            className="h-6 w-6 text-slate-600 opacity-0 transition-all hover:text-red-400 group-hover:opacity-100"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>

                        {/* Meta */}
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          {task.projects?.name && (
                            <span className="flex items-center gap-1 rounded bg-slate-700/50 px-1.5 py-0.5 text-xs text-slate-400">
                              <FolderKanban className="h-3 w-3" />
                              {task.projects.name}
                            </span>
                          )}
                          <Badge
                            variant="secondary"
                            className={`border ${pc.border} ${pc.bg} ${pc.text} text-xs`}
                          >
                            {pc.label}
                          </Badge>
                        </div>

                        {/* Bottom Row */}
                        <div className="mt-2 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {task.profiles?.full_name && (
                              <span className="flex items-center gap-1 text-xs text-slate-500">
                                <User className="h-3 w-3" />
                                {task.profiles.full_name}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {task.estimated_hours != null && (
                              <span className="flex items-center gap-1 text-xs text-slate-500">
                                <Clock className="h-3 w-3" />
                                {task.actual_hours ?? 0}/{task.estimated_hours}h
                              </span>
                            )}
                            {task.due_date && (
                              <span className="text-xs text-slate-500">
                                {new Date(task.due_date).toLocaleDateString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                })}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Progress */}
                        {task.estimated_hours != null && task.estimated_hours > 0 && (
                          <div className="mt-2">
                            <div className="h-1 w-full overflow-hidden rounded-full bg-slate-700">
                              <div
                                className="h-full rounded-full bg-indigo-500 transition-all"
                                style={{
                                  width: `${Math.min(
                                    100,
                                    ((task.actual_hours ?? 0) / task.estimated_hours) * 100
                                  )}%`,
                                }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Create Task Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="border-slate-800 bg-slate-900 sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-slate-100">Create New Task</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-4">
            <div className="flex flex-col gap-2">
              <Label className="text-slate-400">Task Title</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Build login page"
                className="border-slate-700 bg-slate-800/50"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label className="text-slate-400">Description</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Task details..."
                className="min-h-16 resize-none border-slate-700 bg-slate-800/50"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <Label className="text-slate-400">Project</Label>
                <Select value={projectId} onValueChange={(v) => setProjectId(v ?? "")}>
                  <SelectTrigger className="border-slate-700 bg-slate-800/50">
                    <SelectValue placeholder="Select project" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-2">
                <Label className="text-slate-400">Assign To</Label>
                <Select value={assignedTo} onValueChange={(v) => setAssignedTo(v ?? "")}>
                  <SelectTrigger className="border-slate-700 bg-slate-800/50">
                    <SelectValue placeholder="Select employee" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.map((e) => (
                      <SelectItem key={e.user_id} value={e.user_id}>{e.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="flex flex-col gap-2">
                <Label className="text-slate-400">Priority</Label>
                <Select value={priority} onValueChange={(v) => setPriority(v as TaskPriority)}>
                  <SelectTrigger className="border-slate-700 bg-slate-800/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-2">
                <Label className="text-slate-400">Est. Hours</Label>
                <Input
                  type="number"
                  step="0.5"
                  min="0"
                  value={estimatedHours}
                  onChange={(e) => setEstimatedHours(e.target.value)}
                  placeholder="8"
                  className="border-slate-700 bg-slate-800/50"
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label className="text-slate-400">Due Date</Label>
                <Input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="border-slate-700 bg-slate-800/50"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setShowDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={saving || !title.trim()} className="gap-2">
              <Plus className="h-4 w-4" />
              {saving ? "Creating..." : "Create Task"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
