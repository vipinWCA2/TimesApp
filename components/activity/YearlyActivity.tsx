"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { CalendarDays, Clock, TrendingUp, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MonthData {
  month: number;
  label: string;
  totalHours: number;
  sessions: number;
  avgPerDay: number;
}

interface YearlyActivityProps {
  userId: string;
  showTitle?: boolean;
}

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function formatHours(h: number): string {
  const hours = Math.floor(h);
  const mins = Math.round((h - hours) * 60);
  if (hours === 0) return `${mins}m`;
  return `${hours}h ${mins}m`;
}

export function YearlyActivity({ userId, showTitle = true }: YearlyActivityProps) {
  const supabase = createClient();
  const [year, setYear] = useState(new Date().getFullYear());
  const [months, setMonths] = useState<MonthData[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalYearHours, setTotalYearHours] = useState(0);
  const [totalSessions, setTotalSessions] = useState(0);

  const loadData = useCallback(async () => {
    setLoading(true);
    const yearStart = `${year}-01-01T00:00:00Z`;
    const yearEnd = `${year + 1}-01-01T00:00:00Z`;

    const { data: logs } = await supabase
      .from("time_logs")
      .select("clock_in, clock_out")
      .eq("user_id", userId)
      .gte("clock_in", yearStart)
      .lt("clock_in", yearEnd)
      .not("clock_out", "is", null)
      .order("clock_in", { ascending: true });

    const monthlyData: MonthData[] = MONTH_LABELS.map((label, i) => ({
      month: i,
      label,
      totalHours: 0,
      sessions: 0,
      avgPerDay: 0,
    }));

    let yearHours = 0;
    let yearSessions = 0;

    // Track unique work days per month
    const workDaysPerMonth: Set<string>[] = Array.from({ length: 12 }, () => new Set());

    for (const log of logs ?? []) {
      const clockIn = new Date(log.clock_in);
      const clockOut = new Date(log.clock_out);
      const month = clockIn.getMonth();
      const hours = (clockOut.getTime() - clockIn.getTime()) / 3600000;

      monthlyData[month].totalHours += hours;
      monthlyData[month].sessions += 1;
      workDaysPerMonth[month].add(clockIn.toISOString().split("T")[0]);

      yearHours += hours;
      yearSessions += 1;
    }

    // Calculate avg per day
    for (let i = 0; i < 12; i++) {
      const days = workDaysPerMonth[i].size;
      monthlyData[i].avgPerDay = days > 0 ? monthlyData[i].totalHours / days : 0;
    }

    setMonths(monthlyData);
    setTotalYearHours(yearHours);
    setTotalSessions(yearSessions);
    setLoading(false);
  }, [userId, year, supabase]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const maxHours = Math.max(...months.map((m) => m.totalHours), 1);
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  if (loading) {
    return (
      <div className="animate-pulse rounded-xl border border-border bg-card p-4 shadow-sm">
        <div className="h-4 w-48 rounded bg-secondary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {showTitle && (
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Yearly Activity</h3>
        </div>
      )}

      {/* Year selector + summary */}
      <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setYear(year - 1)}
            className="h-8 w-8 p-0"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-lg font-bold text-foreground">{year}</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setYear(year + 1)}
            disabled={year >= currentYear}
            className="h-8 w-8 p-0"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex gap-8">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Total Hours</p>
              <p className="text-lg font-bold text-foreground">{formatHours(totalYearHours)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Sessions</p>
              <p className="text-lg font-bold text-foreground">{totalSessions}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Avg/Day</p>
              <p className="text-lg font-bold text-foreground">
                {totalSessions > 0 ? formatHours(totalYearHours / Math.max(1, new Set(
                  (months ?? []).flatMap(() => [])
                ).size || totalSessions)) : "0h"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Monthly chart */}
      <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <div className="flex items-end gap-2" style={{ height: 200 }}>
          {months.map((m) => {
            const heightPercent = maxHours > 0 ? (m.totalHours / maxHours) * 100 : 0;
            const isCurrentMonth = m.month === currentMonth && year === currentYear;
            const hasData = m.totalHours > 0;

            return (
              <div key={m.month} className="group flex flex-1 flex-col items-center gap-1">
                {/* Tooltip */}
                <div className="pointer-events-none mb-1 rounded-lg border border-border bg-card px-2 py-1 text-center opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
                  <p className="text-xs font-bold text-foreground">{formatHours(m.totalHours)}</p>
                  <p className="text-xs text-muted-foreground">{m.sessions} sessions</p>
                  {m.avgPerDay > 0 && (
                    <p className="text-xs text-muted-foreground">{formatHours(m.avgPerDay)}/day</p>
                  )}
                </div>

                {/* Bar */}
                <div className="relative flex w-full flex-1 items-end justify-center">
                  <div
                    className={`w-full max-w-10 rounded-t-md transition-all ${
                      isCurrentMonth
                        ? "bg-primary"
                        : hasData
                        ? "bg-primary/40 group-hover:bg-primary/60"
                        : "bg-secondary"
                    }`}
                    style={{
                      height: `${Math.max(hasData ? 4 : 2, heightPercent)}%`,
                    }}
                  />
                </div>

                {/* Label */}
                <span
                  className={`text-xs ${
                    isCurrentMonth ? "font-bold text-primary" : "text-muted-foreground"
                  }`}
                >
                  {m.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Monthly details table */}
      <div className="rounded-xl border border-border bg-card shadow-sm">
        <div className="grid grid-cols-12 gap-0 divide-x divide-border border-b border-border">
          <div className="col-span-3 px-4 py-2 text-xs font-medium text-muted-foreground">Month</div>
          <div className="col-span-3 px-4 py-2 text-xs font-medium text-muted-foreground">Hours</div>
          <div className="col-span-3 px-4 py-2 text-xs font-medium text-muted-foreground">Sessions</div>
          <div className="col-span-3 px-4 py-2 text-xs font-medium text-muted-foreground">Avg/Day</div>
        </div>
        {months.filter((m) => m.totalHours > 0 || (year === currentYear && m.month <= currentMonth)).map((m) => (
          <div
            key={m.month}
            className={`grid grid-cols-12 gap-0 divide-x divide-border border-b border-border last:border-b-0 ${
              m.month === currentMonth && year === currentYear ? "bg-primary/5" : ""
            }`}
          >
            <div className="col-span-3 px-4 py-2">
              <span className={`text-sm ${
                m.month === currentMonth && year === currentYear
                  ? "font-semibold text-primary"
                  : "text-foreground"
              }`}>
                {MONTH_LABELS[m.month]} {year}
              </span>
            </div>
            <div className="col-span-3 px-4 py-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-foreground">{formatHours(m.totalHours)}</span>
                {m.totalHours > 0 && (
                  <div className="h-1.5 flex-1 max-w-20 overflow-hidden rounded-full bg-secondary">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${(m.totalHours / maxHours) * 100}%` }}
                    />
                  </div>
                )}
              </div>
            </div>
            <div className="col-span-3 px-4 py-2 text-sm text-muted-foreground">{m.sessions}</div>
            <div className="col-span-3 px-4 py-2 text-sm text-muted-foreground">
              {m.avgPerDay > 0 ? formatHours(m.avgPerDay) : "—"}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
