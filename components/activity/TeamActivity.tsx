"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Badge } from "@/components/ui/badge";
import {
  Activity,
  Clock,
  Camera,
  ChevronDown,
  ChevronUp,
  Zap,
  User,
} from "lucide-react";

interface EmployeeActivity {
  user_id: string;
  full_name: string;
  role: string;
  is_online: boolean;
  todayHours: number;
  activityPercent: number;
  activePings: number;
  idlePings: number;
  screenshotCount: number;
  screenshots: { id: string; thumbnail: string; created_at: string }[];
}

export function TeamActivity() {
  const supabase = createClient();
  const [employees, setEmployees] = useState<EmployeeActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedUser, setExpandedUser] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();

    // Get all profiles
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, full_name, role, is_online")
      .order("full_name");

    if (!profiles) { setLoading(false); return; }

    const result: EmployeeActivity[] = [];

    for (const p of profiles) {
      // Today's time logs
      const { data: logs } = await supabase
        .from("time_logs")
        .select("clock_in, clock_out")
        .eq("user_id", p.user_id)
        .gte("clock_in", todayStart);

      const todayHours = (logs ?? []).reduce((acc, log) => {
        const end = log.clock_out ? new Date(log.clock_out).getTime() : Date.now();
        return acc + (end - new Date(log.clock_in).getTime()) / 3600000;
      }, 0);

      // Today's pings
      const { data: pings } = await supabase
        .from("activity_pings")
        .select("is_idle")
        .eq("user_id", p.user_id)
        .gte("created_at", todayStart);

      const totalPings = pings?.length ?? 0;
      const activePings = pings?.filter((pg) => !pg.is_idle).length ?? 0;
      const idlePings = totalPings - activePings;
      const activityPercent = totalPings > 0 ? Math.round((activePings / totalPings) * 100) : 0;

      // Today's screenshots
      const { data: ss, count: ssCount } = await supabase
        .from("screenshots")
        .select("id, thumbnail, created_at", { count: "exact" })
        .eq("user_id", p.user_id)
        .gte("created_at", todayStart)
        .order("created_at", { ascending: false })
        .limit(6);

      result.push({
        user_id: p.user_id,
        full_name: p.full_name,
        role: p.role,
        is_online: p.is_online,
        todayHours,
        activityPercent,
        activePings,
        idlePings,
        screenshotCount: ssCount ?? 0,
        screenshots: ss ?? [],
      });
    }

    // Sort: online first, then by activity
    result.sort((a, b) => {
      if (a.is_online !== b.is_online) return a.is_online ? -1 : 1;
      return b.activityPercent - a.activityPercent;
    });

    setEmployees(result);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 120_000);
    return () => clearInterval(interval);
  }, [loadData]);

  if (loading) {
    return (
      <div className="animate-pulse rounded-xl border border-slate-800 bg-slate-900/50 p-4">
        <div className="h-4 w-48 rounded bg-slate-800" />
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/50">
      <div className="flex items-center gap-2 border-b border-slate-800 px-4 py-4">
        <Activity className="h-4 w-4 text-indigo-400" />
        <h3 className="text-sm font-semibold text-slate-200">Team Activity — Today</h3>
      </div>

      <div className="divide-y divide-slate-800/50">
        {employees.map((emp) => {
          const isExpanded = expandedUser === emp.user_id;
          const actColor =
            emp.activityPercent >= 80 ? "text-green-400" :
            emp.activityPercent >= 50 ? "text-amber-400" : "text-red-400";
          const actBg =
            emp.activityPercent >= 80 ? "bg-green-500" :
            emp.activityPercent >= 50 ? "bg-amber-500" : "bg-red-500";

          return (
            <div key={emp.user_id}>
              <button
                onClick={() => setExpandedUser(isExpanded ? null : emp.user_id)}
                className="flex w-full items-center gap-4 px-4 py-4 text-left transition-colors hover:bg-slate-800/30"
              >
                {/* Avatar */}
                <div className="relative">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 text-xs font-bold text-slate-300">
                    {emp.full_name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                  </div>
                  {emp.is_online && (
                    <div className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-slate-900 bg-green-400" />
                  )}
                </div>

                {/* Name + role */}
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-200">{emp.full_name}</p>
                  <p className="text-xs capitalize text-slate-500">{emp.role}</p>
                </div>

                {/* Activity bar */}
                <div className="flex items-center gap-2">
                  <div className="w-16">
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-700">
                      <div className={`h-full rounded-full ${actBg}`} style={{ width: `${emp.activityPercent}%` }} />
                    </div>
                  </div>
                  <span className={`w-8 text-right text-xs font-bold ${actColor}`}>
                    {emp.activityPercent}%
                  </span>
                </div>

                {/* Hours */}
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3 text-slate-500" />
                  <span className="text-xs text-slate-400">
                    {Math.floor(emp.todayHours)}h {Math.round((emp.todayHours % 1) * 60)}m
                  </span>
                </div>

                {/* Screenshots count */}
                {emp.screenshotCount > 0 && (
                  <div className="flex items-center gap-1">
                    <Camera className="h-3 w-3 text-slate-500" />
                    <span className="text-xs text-slate-500">{emp.screenshotCount}</span>
                  </div>
                )}

                {isExpanded ? (
                  <ChevronUp className="h-4 w-4 text-slate-500" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-slate-500" />
                )}
              </button>

              {/* Expanded: Screenshots */}
              {isExpanded && emp.screenshots.length > 0 && (
                <div className="border-t border-slate-800/50 bg-slate-800/20 px-4 py-4">
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
                    {emp.screenshots.map((ss) => (
                      <div key={ss.id} className="relative overflow-hidden rounded-lg border border-slate-700">
                        <img src={ss.thumbnail} alt="Screenshot" className="h-auto w-full object-cover" />
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-900 to-transparent p-1">
                          <p className="text-xs text-slate-400">
                            {new Date(ss.created_at).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {isExpanded && emp.screenshots.length === 0 && (
                <div className="border-t border-slate-800/50 bg-slate-800/20 px-4 py-4">
                  <p className="text-center text-xs text-slate-600">No screenshots today</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
