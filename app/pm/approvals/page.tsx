"use client";

import { useEffect, useState } from "react";
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
import { CheckCircle, Clock } from "lucide-react";

interface PendingLog {
  id: string;
  clock_in: string;
  clock_out: string;
  notes: string | null;
  approved: boolean;
  profiles: { full_name: string };
  projects: { name: string } | null;
}

export default function ApprovalsPage() {
  const [logs, setLogs] = useState<PendingLog[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("dept_id")
      .eq("user_id", user.id)
      .single();

    if (!profile?.dept_id) {
      setLoading(false);
      return;
    }

    const { data } = await supabase
      .from("time_logs")
      .select("*, profiles!inner(full_name, dept_id), projects(name)")
      .eq("profiles.dept_id", profile.dept_id)
      .not("clock_out", "is", null)
      .eq("approved", false)
      .order("clock_in", { ascending: false });

    if (data) {
      setLogs(data as unknown as PendingLog[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const handleApprove = async (logId: string) => {
    const supabase = createClient();
    await supabase
      .from("time_logs")
      .update({ approved: true })
      .eq("id", logId);
    setLogs((prev) => prev.filter((l) => l.id !== logId));
  };

  function computeDuration(clockIn: string, clockOut: string): string {
    const ms = new Date(clockOut).getTime() - new Date(clockIn).getTime();
    const hours = Math.floor(ms / 3600000);
    const minutes = Math.floor((ms % 3600000) / 60000);
    return `${hours}h ${minutes}m`;
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Approvals</h1>
        <p className="text-sm text-slate-400">Review and approve time logs</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Pending</p>
              <p className="mt-1 text-2xl font-bold text-amber-400">{logs.length}</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10 ring-1 ring-amber-500/20">
              <Clock className="h-5 w-5 text-amber-400" />
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Action Required</p>
              <p className="mt-1 text-2xl font-bold text-slate-100">{loading ? "..." : logs.length > 0 ? "Yes" : "None"}</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10 ring-1 ring-green-500/20">
              <CheckCircle className="h-5 w-5 text-green-400" />
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-900/50">
        <div className="border-b border-slate-800 p-4">
          <h2 className="text-lg font-semibold text-slate-100">
            Pending Approvals ({logs.length})
          </h2>
        </div>
        <div className="p-4">
          {loading ? (
            <p className="text-sm text-slate-400">Loading...</p>
          ) : logs.length === 0 ? (
            <p className="text-sm text-slate-400">No pending approvals.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-medium text-slate-100">
                      {log.profiles.full_name}
                    </TableCell>
                    <TableCell className="text-slate-400">
                      {log.projects?.name ?? "-"}
                    </TableCell>
                    <TableCell className="text-slate-400">
                      {new Date(log.clock_in).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-slate-400">
                      {computeDuration(log.clock_in, log.clock_out)}
                    </TableCell>
                    <TableCell className="max-w-48 truncate text-slate-400">
                      {log.notes ?? "-"}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        onClick={() => handleApprove(log.id)}
                      >
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Approve
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
    </div>
  );
}
