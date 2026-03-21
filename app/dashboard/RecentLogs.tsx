"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Clock, FileText } from "lucide-react";

interface TimeLogWithProject {
  id: string;
  clock_in: string;
  clock_out: string | null;
  notes: string | null;
  approved: boolean;
  projects: { name: string } | null;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function computeDuration(clockIn: string, clockOut: string | null): string {
  if (!clockOut) return "In progress";
  const ms = new Date(clockOut).getTime() - new Date(clockIn).getTime();
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  return `${hours}h ${minutes}m`;
}

export function RecentLogs({ logs }: { logs: TimeLogWithProject[] }) {
  if (logs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-slate-800 bg-slate-900/50 p-16 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-800">
          <FileText className="h-6 w-6 text-slate-600" />
        </div>
        <p className="mt-4 text-sm text-slate-500">No time logs yet</p>
        <p className="text-xs text-slate-600">Clock in to get started</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/50">
      <div className="flex items-center gap-2 border-b border-slate-800 px-4 py-4">
        <Clock className="h-4 w-4 text-slate-500" />
        <h3 className="text-sm font-semibold text-slate-200">Recent Time Logs</h3>
      </div>
      <Table>
        <TableHeader>
          <TableRow className="border-slate-800 hover:bg-transparent">
            <TableHead className="text-xs font-medium text-slate-500">Date</TableHead>
            <TableHead className="text-xs font-medium text-slate-500">Project</TableHead>
            <TableHead className="text-xs font-medium text-slate-500">In</TableHead>
            <TableHead className="text-xs font-medium text-slate-500">Out</TableHead>
            <TableHead className="text-xs font-medium text-slate-500">Duration</TableHead>
            <TableHead className="text-xs font-medium text-slate-500">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {logs.map((log) => (
            <TableRow key={log.id} className="border-slate-800/50 hover:bg-slate-800/30">
              <TableCell className="text-sm text-slate-300">
                {formatDate(log.clock_in)}
              </TableCell>
              <TableCell>
                <span className="inline-flex items-center rounded-md bg-slate-800 px-2 py-1 text-xs font-medium text-slate-300">
                  {log.projects?.name ?? "No project"}
                </span>
              </TableCell>
              <TableCell className="font-mono text-xs text-slate-400">
                {formatTime(log.clock_in)}
              </TableCell>
              <TableCell className="font-mono text-xs text-slate-400">
                {log.clock_out ? formatTime(log.clock_out) : "-"}
              </TableCell>
              <TableCell className="text-sm font-medium text-slate-300">
                {computeDuration(log.clock_in, log.clock_out)}
              </TableCell>
              <TableCell>
                {!log.clock_out ? (
                  <Badge variant="default" className="border-0 bg-indigo-500/15 text-indigo-400">
                    Active
                  </Badge>
                ) : log.approved ? (
                  <Badge variant="default" className="border-0 bg-green-500/15 text-green-400">
                    Approved
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="border-0 bg-amber-500/15 text-amber-400">
                    Pending
                  </Badge>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
