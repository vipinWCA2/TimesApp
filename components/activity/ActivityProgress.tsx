"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { getLocalScreenshots } from "./ActivityTracker";
import { Button } from "@/components/ui/button";
import {
  Activity,
  Clock,
  MousePointer,
  Camera,
  ChevronDown,
  ChevronUp,
  Zap,
} from "lucide-react";

interface ActivitySummary {
  totalPings: number;
  activePings: number;
  idlePings: number;
  activityPercent: number;
  screenshots: { id: string | number; thumbnail: string; created_at: string; task_id: string | null }[];
  todayHours: number;
  weekHours: number;
}

interface ActivityProgressProps {
  userId: string;
  showScreenshots?: boolean;
}

function formatHours(h: number): string {
  const hours = Math.floor(h);
  const mins = Math.round((h - hours) * 60);
  return `${hours}h ${mins}m`;
}

export function ActivityProgress({ userId, showScreenshots = true }: ActivityProgressProps) {
  const supabase = createClient();
  const [data, setData] = useState<ActivitySummary | null>(null);
  const [expandScreenshots, setExpandScreenshots] = useState(true);
  const [loading, setLoading] = useState(true);

  const loadActivity = useCallback(async () => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7).toISOString();

    // Get today's pings
    const { data: pings, count: totalPings } = await supabase
      .from("activity_pings")
      .select("is_idle", { count: "exact" })
      .eq("user_id", userId)
      .gte("created_at", todayStart);

    const activePings = pings?.filter((p) => !p.is_idle).length ?? 0;
    const idlePings = pings?.filter((p) => p.is_idle).length ?? 0;
    const total = totalPings ?? 0;
    const activityPercent = total > 0 ? Math.round((activePings / total) * 100) : 0;

    // Get today's hours
    const { data: todayLogs } = await supabase
      .from("time_logs")
      .select("clock_in, clock_out")
      .eq("user_id", userId)
      .gte("clock_in", todayStart);

    const todayHours = (todayLogs ?? []).reduce((acc, log) => {
      const end = log.clock_out ? new Date(log.clock_out).getTime() : Date.now();
      return acc + (end - new Date(log.clock_in).getTime()) / 3600000;
    }, 0);

    // Get week's hours
    const { data: weekLogs } = await supabase
      .from("time_logs")
      .select("clock_in, clock_out")
      .eq("user_id", userId)
      .gte("clock_in", weekStart);

    const weekHours = (weekLogs ?? []).reduce((acc, log) => {
      const end = log.clock_out ? new Date(log.clock_out).getTime() : Date.now();
      return acc + (end - new Date(log.clock_in).getTime()) / 3600000;
    }, 0);

    // Get screenshots — try local first, fallback to Supabase
    let screenshots: { id: string | number; thumbnail: string; created_at: string; task_id: string | null }[] = [];

    try {
      const localSS = await getLocalScreenshots(userId, 12);
      if (localSS.length > 0) {
        screenshots = localSS;
      }
    } catch {
      // IndexedDB not available
    }

    // If no local screenshots, try Supabase
    if (screenshots.length === 0) {
      const { data: remoteSS } = await supabase
        .from("screenshots")
        .select("id, thumbnail, created_at, task_id")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(12);
      if (remoteSS) screenshots = remoteSS;
    }

    setData({
      totalPings: total,
      activePings,
      idlePings,
      activityPercent,
      screenshots,
      todayHours,
      weekHours,
    });
    setLoading(false);
  }, [userId, supabase]);

  useEffect(() => {
    loadActivity();
    const interval = setInterval(loadActivity, 60_000);
    return () => clearInterval(interval);
  }, [loadActivity]);

  if (loading) {
    return (
      <div className="animate-pulse rounded-xl border border-border bg-card p-4">
        <div className="h-4 w-32 rounded bg-secondary" />
      </div>
    );
  }

  if (!data) return null;

  const activityColor =
    data.activityPercent >= 80
      ? "text-green-500"
      : data.activityPercent >= 50
      ? "text-amber-500"
      : "text-red-500";

  const activityBg =
    data.activityPercent >= 80
      ? "bg-green-500"
      : data.activityPercent >= 50
      ? "bg-amber-500"
      : "bg-red-500";

  return (
    <div className="flex flex-col gap-4">
      {/* Activity Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Activity</p>
              <p className={`mt-1 text-2xl font-bold ${activityColor}`}>
                {data.activityPercent}%
              </p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-500/10 ring-1 ring-indigo-500/20">
              <Zap className="h-5 w-5 text-indigo-400" />
            </div>
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
            <div
              className={`h-full rounded-full ${activityBg} transition-all`}
              style={{ width: `${data.activityPercent}%` }}
            />
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Today</p>
              <p className="mt-1 text-2xl font-bold text-foreground">
                {formatHours(data.todayHours)}
              </p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10 ring-1 ring-green-500/20">
              <Clock className="h-5 w-5 text-green-400" />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">This Week</p>
              <p className="mt-1 text-2xl font-bold text-foreground">
                {formatHours(data.weekHours)}
              </p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-500/10 ring-1 ring-violet-500/20">
              <Activity className="h-5 w-5 text-violet-400" />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Active / Idle</p>
              <p className="mt-1 text-2xl font-bold text-foreground">
                {data.activePings} / {data.idlePings}
              </p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10 ring-1 ring-amber-500/20">
              <MousePointer className="h-5 w-5 text-amber-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Screenshots */}
      {showScreenshots && data.screenshots.length > 0 && (
        <div className="rounded-xl border border-border bg-card shadow-sm">
          <Button
            variant="ghost"
            onClick={() => setExpandScreenshots(!expandScreenshots)}
            className="flex h-auto w-full items-center justify-between rounded-none border-b border-border px-4 py-4"
          >
            <div className="flex items-center gap-2">
              <Camera className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">Screenshots</h3>
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                {data.screenshots.length}
              </span>
            </div>
            {expandScreenshots ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </Button>

          {expandScreenshots && (
            <div className="grid grid-cols-2 gap-4 p-4 sm:grid-cols-3 lg:grid-cols-4">
              {data.screenshots.map((ss) => (
                <div
                  key={ss.id}
                  className="group relative overflow-hidden rounded-lg border border-border shadow-sm transition-shadow hover:shadow-md"
                >
                  <img
                    src={ss.thumbnail}
                    alt="Screenshot"
                    className="h-auto w-full object-cover"
                  />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                    <p className="text-xs font-medium text-slate-100">
                      {new Date(ss.created_at).toLocaleTimeString("en-US", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                    <p className="text-xs text-slate-400">
                      {new Date(ss.created_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
