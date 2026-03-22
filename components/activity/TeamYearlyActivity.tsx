"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, Clock, ChevronLeft, ChevronRight, ChevronDown, ChevronUp } from "lucide-react";

interface EmployeeYearData {
  user_id: string;
  full_name: string;
  role: string;
  totalHours: number;
  sessions: number;
  months: number[]; // 12 entries, hours per month
}

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function formatHours(h: number): string {
  const hours = Math.floor(h);
  const mins = Math.round((h - hours) * 60);
  if (hours === 0 && mins === 0) return "0h";
  if (hours === 0) return `${mins}m`;
  return `${hours}h ${mins}m`;
}

export function TeamYearlyActivity() {
  const supabase = createClient();
  const [year, setYear] = useState(new Date().getFullYear());
  const [employees, setEmployees] = useState<EmployeeYearData[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedUser, setExpandedUser] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    const yearStart = `${year}-01-01T00:00:00Z`;
    const yearEnd = `${year + 1}-01-01T00:00:00Z`;

    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, full_name, role")
      .order("full_name");

    if (!profiles) { setLoading(false); return; }

    const result: EmployeeYearData[] = [];

    for (const p of profiles) {
      const { data: logs } = await supabase
        .from("time_logs")
        .select("clock_in, clock_out")
        .eq("user_id", p.user_id)
        .gte("clock_in", yearStart)
        .lt("clock_in", yearEnd)
        .not("clock_out", "is", null);

      const months = new Array(12).fill(0);
      let totalHours = 0;
      let sessions = 0;

      for (const log of logs ?? []) {
        const clockIn = new Date(log.clock_in);
        const clockOut = new Date(log.clock_out);
        const hours = (clockOut.getTime() - clockIn.getTime()) / 3600000;
        months[clockIn.getMonth()] += hours;
        totalHours += hours;
        sessions += 1;
      }

      result.push({
        user_id: p.user_id,
        full_name: p.full_name,
        role: p.role,
        totalHours,
        sessions,
        months,
      });
    }

    result.sort((a, b) => b.totalHours - a.totalHours);
    setEmployees(result);
    setLoading(false);
  }, [year, supabase]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const currentYear = new Date().getFullYear();
  const grandTotal = employees.reduce((a, e) => a + e.totalHours, 0);
  const maxEmployeeHours = Math.max(...employees.map((e) => e.totalHours), 1);

  if (loading) {
    return (
      <div className="animate-pulse rounded-xl border border-border bg-card p-4 shadow-sm">
        <div className="h-4 w-48 rounded bg-secondary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <CalendarDays className="h-5 w-5 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Team Activity — Yearly Report</h3>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={() => setYear(year - 1)} className="h-7 w-7 p-0">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="min-w-12 text-center text-sm font-bold text-foreground">{year}</span>
            <Button variant="ghost" size="sm" onClick={() => setYear(year + 1)} disabled={year >= currentYear} className="h-7 w-7 p-0">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Total:</span>
          <span className="text-sm font-bold text-foreground">{formatHours(grandTotal)}</span>
        </div>
      </div>

      {/* Employee rows */}
      <div className="rounded-xl border border-border bg-card shadow-sm">
        {/* Table header */}
        <div className="grid grid-cols-16 items-center gap-0 border-b border-border px-4 py-2">
          <div className="col-span-3 text-xs font-medium text-muted-foreground">Employee</div>
          <div className="col-span-2 text-xs font-medium text-muted-foreground">Total</div>
          {MONTH_LABELS.map((m, i) => (
            <div key={i} className="col-span-1 text-center text-xs font-medium text-muted-foreground">
              {m.charAt(0)}
            </div>
          ))}
        </div>

        {employees.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">No data for {year}</div>
        ) : (
          employees.map((emp) => {
            const isExpanded = expandedUser === emp.user_id;
            const maxMonth = Math.max(...emp.months, 1);

            return (
              <div key={emp.user_id} className="border-b border-border last:border-b-0">
                <Button
                  variant="ghost"
                  onClick={() => setExpandedUser(isExpanded ? null : emp.user_id)}
                  className="grid h-auto w-full grid-cols-16 items-center gap-0 rounded-none px-4 py-3 text-left transition-colors hover:bg-accent/50"
                >
                  {/* Name */}
                  <div className="col-span-3 flex items-center gap-2">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                      {emp.full_name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">{emp.full_name}</p>
                      <p className="text-xs capitalize text-muted-foreground">{emp.role}</p>
                    </div>
                  </div>

                  {/* Total hours + bar */}
                  <div className="col-span-2 flex items-center gap-2">
                    <span className="text-sm font-bold text-foreground">{formatHours(emp.totalHours)}</span>
                    <div className="h-1.5 flex-1 max-w-16 overflow-hidden rounded-full bg-secondary">
                      <div
                        className="h-full rounded-full bg-primary transition-all"
                        style={{ width: `${(emp.totalHours / maxEmployeeHours) * 100}%` }}
                      />
                    </div>
                  </div>

                  {/* Monthly mini bars */}
                  {emp.months.map((hours, i) => (
                    <div key={i} className="col-span-1 flex justify-center px-0.5">
                      <div className="flex h-6 w-full max-w-6 items-end">
                        <div
                          className={`w-full rounded-t-sm transition-all ${
                            hours > 0 ? "bg-primary/50" : "bg-secondary"
                          }`}
                          style={{ height: `${Math.max(hours > 0 ? 15 : 5, (hours / maxMonth) * 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </Button>

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="border-t border-border bg-accent/30 px-4 py-4">
                    <div className="grid grid-cols-3 gap-4 sm:grid-cols-4 lg:grid-cols-6">
                      {emp.months.map((hours, i) => (
                        <div key={i} className="rounded-lg border border-border bg-card p-2">
                          <p className="text-xs text-muted-foreground">{MONTH_LABELS[i]}</p>
                          <p className="text-sm font-bold text-foreground">{formatHours(hours)}</p>
                        </div>
                      ))}
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
}
