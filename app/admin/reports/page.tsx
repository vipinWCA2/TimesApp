"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileDown, BarChart3 } from "lucide-react";
import { TeamYearlyActivity } from "@/components/activity/TeamYearlyActivity";

interface ReportRow {
  userName: string;
  department: string;
  totalHours: number;
  totalSessions: number;
  approvedSessions: number;
}

export default function ReportsPage() {
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().split("T")[0];
  });
  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().split("T")[0];
  });
  const [rows, setRows] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(false);

  const generateReport = async () => {
    setLoading(true);

    const supabase = createClient();

    const { data: logs } = await supabase
      .from("time_logs")
      .select("*, profiles(full_name, departments(name))")
      .gte("clock_in", `${startDate}T00:00:00`)
      .lte("clock_in", `${endDate}T23:59:59`)
      .not("clock_out", "is", null);

    if (!logs || logs.length === 0) {
      setRows([]);
      setLoading(false);
      return;
    }

    // Aggregate by user
    const userMap = new Map<string, ReportRow>();

    for (const log of logs) {
      const profile = log.profiles as unknown as {
        full_name: string;
        departments: { name: string } | null;
      };
      const userId = log.user_id;

      if (!userMap.has(userId)) {
        userMap.set(userId, {
          userName: profile.full_name,
          department: profile.departments?.name ?? "Unassigned",
          totalHours: 0,
          totalSessions: 0,
          approvedSessions: 0,
        });
      }

      const row = userMap.get(userId)!;
      const ms =
        new Date(log.clock_out!).getTime() - new Date(log.clock_in).getTime();
      row.totalHours += ms / 3600000;
      row.totalSessions += 1;
      if (log.approved) row.approvedSessions += 1;
    }

    setRows(
      Array.from(userMap.values()).sort((a, b) =>
        a.userName.localeCompare(b.userName)
      )
    );
    setLoading(false);
  };

  const exportCSV = () => {
    const headers = [
      "Employee",
      "Department",
      "Total Hours",
      "Sessions",
      "Approved",
    ];
    const csvRows = [
      headers.join(","),
      ...rows.map((r) =>
        [
          `"${r.userName}"`,
          `"${r.department}"`,
          r.totalHours.toFixed(2),
          r.totalSessions,
          r.approvedSessions,
        ].join(",")
      ),
    ];
    const blob = new Blob([csvRows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `payroll-report-${startDate}-to-${endDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Reports</h1>
        <p className="text-sm text-slate-400">
          Generate payroll reports with date range
        </p>
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-900/50">
        <div className="border-b border-slate-800 p-4">
          <h2 className="text-lg font-semibold text-slate-100">Date Range</h2>
        </div>
        <div className="p-4">
          <div className="flex items-end gap-4">
            <div className="flex flex-col gap-2">
              <Label>Start Date</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label>End Date</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <Button onClick={generateReport} disabled={loading}>
              <BarChart3 className="mr-2 h-4 w-4" />
              {loading ? "Generating..." : "Generate Report"}
            </Button>
          </div>
        </div>
      </div>

      {/* Yearly Team Activity */}
      <TeamYearlyActivity />

      {rows.length > 0 && (
        <div className="rounded-xl border border-slate-800 bg-slate-900/50">
          <div className="flex items-center justify-between border-b border-slate-800 p-4">
            <h2 className="text-lg font-semibold text-slate-100">
              Payroll Report
            </h2>
            <Button variant="outline" size="sm" onClick={exportCSV}>
              <FileDown className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
          </div>
          <div className="p-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Total Hours</TableHead>
                  <TableHead>Sessions</TableHead>
                  <TableHead>Approved</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.userName}>
                    <TableCell className="font-medium text-slate-100">
                      {row.userName}
                    </TableCell>
                    <TableCell className="text-slate-400">
                      {row.department}
                    </TableCell>
                    <TableCell className="text-slate-400">
                      {row.totalHours.toFixed(2)}h
                    </TableCell>
                    <TableCell className="text-slate-400">
                      {row.totalSessions}
                    </TableCell>
                    <TableCell className="text-slate-400">
                      {row.approvedSessions}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
}
