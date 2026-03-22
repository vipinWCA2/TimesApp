"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Timer,
  LogIn,
  LogOut,
  Play,
  Square,
  Clock,
  FolderKanban,
  ClipboardList,
  AlertTriangle,
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ActivityTracker } from "@/components/activity/ActivityTracker";
import type { TaskStatus, TaskPriority } from "@/lib/types/database";

interface Profile {
  user_id: string;
  full_name: string;
  role: string;
  dept_id: string | null;
  face_descriptor: number[] | null;
}

interface TimeLog {
  id: string;
  clock_in: string;
  clock_out: string | null;
  task_id: string | null;
  project_id: string | null;
  tasks?: { title: string } | null;
  projects?: { name: string } | null;
}

interface TaskRow {
  id: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  estimated_hours: number | null;
  actual_hours: number | null;
  due_date: string | null;
  project_id: string | null;
  projects: { name: string } | null;
}

type WidgetTab = "tasks" | "logs";

const priorityColors: Record<TaskPriority, string> = {
  low: "text-slate-400 bg-slate-500/15",
  medium: "text-indigo-400 bg-indigo-500/15",
  high: "text-red-400 bg-red-500/15",
};

function formatTime(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [hours, minutes, seconds]
    .map((v) => String(v).padStart(2, "0"))
    .join(":");
}

function formatLogTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatLogDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function computeDuration(clockIn: string, clockOut: string): string {
  const ms = new Date(clockOut).getTime() - new Date(clockIn).getTime();
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return `${h}h ${m}m`;
}

export default function WidgetPage() {
  const supabase = createClient();

  // Auth state
  const [user, setUser] = useState<{ id: string; email: string } | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  // Login form
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginLoading, setLoginLoading] = useState(false);

  // Timer state — task-based
  const [activeLog, setActiveLog] = useState<TimeLog | null>(null);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [startingTaskId, setStartingTaskId] = useState<string | null>(null);
  const [stoppingTask, setStoppingTask] = useState(false);

  // Data
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [recentLogs, setRecentLogs] = useState<TimeLog[]>([]);

  // Tab
  const [activeTab, setActiveTab] = useState<WidgetTab>("tasks");

  // Check auth on mount
  useEffect(() => {
    (async () => {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();
      if (authUser) {
        setUser({ id: authUser.id, email: authUser.email ?? "" });
      }
      setLoading(false);
    })();
  }, []);

  // Set online on mount if already logged in + keep alive
  useEffect(() => {
    if (!user) return;

    // Set online immediately
    supabase
      .from("profiles")
      .update({ is_online: true, last_active_at: new Date().toISOString() })
      .eq("user_id", user.id)
      .then(() => {});

    // Heartbeat every 2 minutes
    const heartbeat = setInterval(() => {
      supabase
        .from("profiles")
        .update({ last_active_at: new Date().toISOString() })
        .eq("user_id", user.id)
        .then(() => {});
    }, 120_000);

    // Set offline on browser close
    const handleBeforeUnload = () => {
      navigator.sendBeacon?.(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/profiles?user_id=eq.${user.id}`,
      );
      // Fallback: will be caught by heartbeat timeout
    };
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      clearInterval(heartbeat);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [user, supabase]);

  // Load data when user is set
  const loadData = useCallback(async () => {
    if (!user) return;

    const { data: p } = await supabase
      .from("profiles")
      .select("user_id, full_name, role, dept_id, face_descriptor")
      .eq("user_id", user.id)
      .single();
    if (p) setProfile(p as Profile);

    // Check for active time log (running timer)
    const { data: active } = await supabase
      .from("time_logs")
      .select("*, tasks(title), projects(name)")
      .eq("user_id", user.id)
      .is("clock_out", null)
      .order("clock_in", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (active) {
      setActiveLog(active);
      setActiveTaskId(active.task_id);
    } else {
      setActiveLog(null);
      setActiveTaskId(null);
    }

    // Only show in_progress tasks in widget
    const { data: t } = await supabase
      .from("tasks")
      .select("id, title, status, priority, estimated_hours, actual_hours, due_date, project_id, projects(name)")
      .eq("assigned_to", user.id)
      .eq("status", "in_progress")
      .order("priority", { ascending: true })
      .order("created_at", { ascending: false });
    if (t) setTasks(t as unknown as TaskRow[]);

    // Recent completed logs
    const { data: logs } = await supabase
      .from("time_logs")
      .select("*, tasks(title), projects(name)")
      .eq("user_id", user.id)
      .not("clock_out", "is", null)
      .order("clock_in", { ascending: false })
      .limit(5);
    if (logs) setRecentLogs(logs);
  }, [user, supabase]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Timer tick
  useEffect(() => {
    if (!activeLog) return;
    const tick = () => {
      const start = new Date(activeLog.clock_in).getTime();
      setElapsed(Math.max(0, Math.floor((Date.now() - start) / 1000)));
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [activeLog]);

  // Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setLoginLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      setLoginError(error.message);
      setLoginLoading(false);
      return;
    }

    if (data.user) {
      const { data: existing } = await supabase
        .from("profiles")
        .select("user_id")
        .eq("user_id", data.user.id)
        .maybeSingle();

      if (!existing) {
        const fullName =
          data.user.user_metadata?.full_name ||
          email
            .split("@")[0]
            .replace(/[._]/g, " ")
            .replace(/\b\w/g, (c) => c.toUpperCase());
        await supabase.from("profiles").insert({
          user_id: data.user.id,
          full_name: fullName,
          role: "employee",
        });
      }

      // Set online
      await supabase
        .from("profiles")
        .update({ is_online: true, last_active_at: new Date().toISOString() })
        .eq("user_id", data.user.id);

      setUser({ id: data.user.id, email: data.user.email ?? "" });
    }
    setLoginLoading(false);
  };

  // Sign out
  const handleSignOut = async () => {
    // Set offline
    if (user) {
      await supabase
        .from("profiles")
        .update({ is_online: false })
        .eq("user_id", user.id);
    }
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setActiveLog(null);
    setActiveTaskId(null);
    setRecentLogs([]);
    setTasks([]);
  };

  // Start timer for a specific task
  const handleStartTask = async (task: TaskRow) => {
    if (!user) return;
    setStartingTaskId(task.id);

    // If another task is running, stop it first
    if (activeLog) {
      await supabase
        .from("time_logs")
        .update({ clock_out: new Date().toISOString() })
        .eq("id", activeLog.id);
    }

    // Create time log for this task
    const { data } = await supabase
      .from("time_logs")
      .insert({
        user_id: user.id,
        task_id: task.id,
        project_id: task.project_id,
      })
      .select("*, tasks(title), projects(name)")
      .single();

    if (data) {
      // Mark task as in_progress
      await supabase
        .from("tasks")
        .update({ status: "in_progress", updated_at: new Date().toISOString() })
        .eq("id", task.id);

      setActiveLog(data);
      setActiveTaskId(task.id);
      await loadData();
    }
    setStartingTaskId(null);
  };

  // Stop timer for current task
  const handleStopTask = async () => {
    if (!activeLog) return;
    setStoppingTask(true);

    // Calculate actual hours spent
    const duration =
      (Date.now() - new Date(activeLog.clock_in).getTime()) / 3600000;

    await supabase
      .from("time_logs")
      .update({ clock_out: new Date().toISOString() })
      .eq("id", activeLog.id);

    // Update task actual_hours
    if (activeTaskId) {
      const task = tasks.find((t) => t.id === activeTaskId);
      const newActual = (task?.actual_hours ?? 0) + duration;
      await supabase
        .from("tasks")
        .update({
          actual_hours: Math.round(newActual * 100) / 100,
          updated_at: new Date().toISOString(),
        })
        .eq("id", activeTaskId);
    }

    setActiveLog(null);
    setActiveTaskId(null);
    setElapsed(0);
    await loadData();
    setStoppingTask(false);
  };

  if (loading) {
    return (
      <div className="w-96 animate-pulse rounded-2xl border border-slate-800 bg-slate-900 p-8">
        <div className="h-8 w-32 rounded-lg bg-slate-800" />
      </div>
    );
  }

  // ─── LOGIN VIEW ───
  if (!user) {
    return (
      <div className="w-96 rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl shadow-black/40">
        <div className="flex items-center gap-2 border-b border-slate-800 px-4 py-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600">
            <Timer className="h-4 w-4 text-slate-100" />
          </div>
          <span className="text-sm font-bold text-slate-100">
            Apex<span className="text-indigo-400">Time</span>
          </span>
          <span className="ml-auto text-xs text-slate-600">Desktop</span>
        </div>

        <form onSubmit={handleLogin} className="flex flex-col gap-4 p-4">
          <div className="flex flex-col gap-1">
            <Label className="text-xs text-slate-500">Email</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              className="h-9 border-slate-700 bg-slate-800/50 text-sm"
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label className="text-xs text-slate-500">Password</Label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              required
              className="h-9 border-slate-700 bg-slate-800/50 text-sm"
            />
          </div>
          {loginError && (
            <p className="text-xs text-red-400">{loginError}</p>
          )}
          <Button
            type="submit"
            disabled={loginLoading}
            size="sm"
            className="w-full gap-2"
          >
            <LogIn className="h-3 w-3" />
            {loginLoading ? "Signing in..." : "Sign In"}
          </Button>
        </form>
      </div>
    );
  }

  // ─── WIDGET VIEW (LOGGED IN) ───
  const initials = (profile?.full_name ?? "U")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="w-96 rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl shadow-black/40">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 px-4 py-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600/20 text-xs font-bold text-indigo-400 ring-1 ring-indigo-500/30">
            {initials}
          </div>
          <div>
            <p className="text-sm font-medium text-slate-100">
              {profile?.full_name ?? "User"}
            </p>
            <p className="text-xs capitalize text-slate-500">
              {profile?.role ?? "employee"}
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleSignOut}
          className="h-8 w-8 text-slate-500 hover:bg-slate-800 hover:text-slate-300"
        >
          <LogOut className="h-4 w-4" />
        </Button>
      </div>

      {/* Activity Tracker (background — sends pings + screenshots while timer runs) */}
      {activeLog && user && (
        <ActivityTracker
          userId={user.id}
          timeLogId={activeLog.id}
          taskId={activeTaskId}
          isRunning={!!activeLog}
        />
      )}

      {/* Active Timer Banner */}
      {activeLog && (
        <div className="border-b border-green-500/20 bg-green-500/5 px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 animate-pulse rounded-full bg-green-400" />
              <div>
                <p className="text-xs font-medium text-green-400">
                  {activeLog.tasks?.title ?? "Working..."}
                </p>
                {activeLog.projects?.name && (
                  <p className="flex items-center gap-1 text-xs text-slate-500">
                    <FolderKanban className="h-3 w-3" />
                    {activeLog.projects.name}
                  </p>
                )}
              </div>
            </div>
            <span className="font-mono text-lg font-bold tracking-wider text-indigo-300">
              {formatTime(elapsed)}
            </span>
          </div>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleStopTask}
            disabled={stoppingTask}
            className="mt-2 w-full gap-2"
          >
            <Square className="h-3 w-3" />
            {stoppingTask ? "Stopping..." : "Stop Timer"}
          </Button>
        </div>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as WidgetTab)} className="border-b border-slate-800">
        <TabsList className="h-auto w-full rounded-none border-0 bg-transparent p-0">
          <TabsTrigger
            value="tasks"
            className="flex-1 gap-2 rounded-none border-b-2 border-transparent py-2 text-xs font-medium text-slate-500 data-[state=active]:border-indigo-500 data-[state=active]:bg-transparent data-[state=active]:text-indigo-400 data-[state=active]:shadow-none"
          >
            <ClipboardList className="h-3 w-3" />
            My Tasks
            {tasks.length > 0 && (
              <span className="rounded-full bg-indigo-600/20 px-1 text-xs text-indigo-400">
                {tasks.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger
            value="logs"
            className="flex-1 gap-2 rounded-none border-b-2 border-transparent py-2 text-xs font-medium text-slate-500 data-[state=active]:border-indigo-500 data-[state=active]:bg-transparent data-[state=active]:text-indigo-400 data-[state=active]:shadow-none"
          >
            <Clock className="h-3 w-3" />
            Time Logs
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Tasks Tab */}
      {activeTab === "tasks" && (
        <div className="max-h-80 overflow-y-auto px-4 py-4">
          {tasks.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8">
              <ClipboardList className="h-8 w-8 text-slate-700" />
              <p className="text-xs text-slate-500">No pending tasks</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {tasks.map((task) => {
                const isActive = activeTaskId === task.id;
                const isStarting = startingTaskId === task.id;
                return (
                  <div
                    key={task.id}
                    className={`rounded-lg border p-4 transition-colors ${
                      isActive
                        ? "border-green-500/30 bg-green-500/5"
                        : "border-slate-800 bg-slate-800/30"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <p className={`text-sm font-medium ${isActive ? "text-green-300" : "text-slate-200"}`}>
                          {task.title}
                        </p>
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                          {task.projects?.name && (
                            <span className="flex items-center gap-1 text-xs text-slate-500">
                              <FolderKanban className="h-3 w-3" />
                              {task.projects.name}
                            </span>
                          )}
                          {task.estimated_hours != null && (
                            <span className={`flex items-center gap-1 text-xs ${isActive ? "text-green-400" : "text-slate-500"}`}>
                              <Clock className="h-3 w-3" />
                              {((task.actual_hours ?? 0) + (isActive ? elapsed / 3600 : 0)).toFixed(1)}h / {task.estimated_hours}h
                            </span>
                          )}
                          {task.due_date && (
                            <span className="text-xs text-slate-500">
                              Due{" "}
                              {new Date(task.due_date).toLocaleDateString(
                                "en-US",
                                { month: "short", day: "numeric" }
                              )}
                            </span>
                          )}
                        </div>
                      </div>
                      <Badge
                        variant="secondary"
                        className={`border-0 text-xs ${priorityColors[task.priority]}`}
                      >
                        {task.priority}
                      </Badge>
                    </div>

                    {/* Timer button */}
                    <div className="mt-2">
                      {isActive ? (
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-sm font-bold text-green-400">
                            {formatTime(elapsed)}
                          </span>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={handleStopTask}
                            disabled={stoppingTask}
                            className="h-7 gap-1 px-2 text-xs"
                          >
                            <Square className="h-3 w-3" />
                            Stop
                          </Button>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => handleStartTask(task)}
                          disabled={isStarting}
                          className="h-7 w-full gap-1 text-xs"
                        >
                          <Play className="h-3 w-3" />
                          {isStarting
                            ? "Starting..."
                            : activeLog
                            ? "Switch to this task"
                            : "Start Timer"}
                        </Button>
                      )}
                    </div>

                    {/* Progress bar */}
                    {task.estimated_hours != null && task.estimated_hours > 0 && (
                      <div className="mt-2">
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-700">
                          <div
                            className={`h-full rounded-full transition-all ${isActive ? "bg-green-500" : "bg-indigo-500"}`}
                            style={{
                              width: `${Math.min(
                                100,
                                (((task.actual_hours ?? 0) + (isActive ? elapsed / 3600 : 0)) / task.estimated_hours) * 100
                              )}%`,
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Logs Tab */}
      {activeTab === "logs" && (
        <div className="max-h-80 overflow-y-auto px-4 py-4">
          <p className="mb-2 text-xs font-semibold text-slate-500">Recent</p>
          {recentLogs.length === 0 ? (
            <p className="py-8 text-center text-xs text-slate-600">
              No time logs yet
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {recentLogs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-center justify-between rounded-lg bg-slate-800/50 px-4 py-2"
                >
                  <div className="flex flex-col">
                    <span className="text-xs font-medium text-slate-300">
                      {log.tasks?.title ?? log.projects?.name ?? "No task"}
                    </span>
                    <span className="text-xs text-slate-500">
                      {formatLogDate(log.clock_in)} ·{" "}
                      {formatLogTime(log.clock_in)}
                    </span>
                  </div>
                  <Badge
                    variant="secondary"
                    className="border-0 bg-slate-700 text-xs text-slate-300"
                  >
                    {computeDuration(log.clock_in, log.clock_out!)}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
