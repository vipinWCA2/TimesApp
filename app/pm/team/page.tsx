"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRealtimeProfiles } from "@/lib/hooks/useRealtimeProfiles";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Users, UserCheck } from "lucide-react";

export default function TeamPage() {
  const [deptId, setDeptId] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("dept_id")
        .eq("user_id", user.id)
        .single();

      if (profile?.dept_id) {
        setDeptId(profile.dept_id);
      }
    };
    fetchProfile();
  }, []);

  const profiles = useRealtimeProfiles(deptId ?? undefined);
  const onlineCount = profiles.filter((p) => p.is_online).length;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Team</h1>
        <p className="text-sm text-slate-400">Live employee status</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Team Size</p>
              <p className="mt-1 text-2xl font-bold text-slate-100">{profiles.length}</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-500/10 ring-1 ring-indigo-500/20">
              <Users className="h-5 w-5 text-indigo-400" />
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Online Now</p>
              <p className="mt-1 text-2xl font-bold text-green-400">{onlineCount}</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10 ring-1 ring-green-500/20">
              <UserCheck className="h-5 w-5 text-green-400" />
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-900/50">
        <div className="border-b border-slate-800 p-4">
          <h2 className="text-lg font-semibold text-slate-100">Team Members</h2>
        </div>
        <div className="p-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Active</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {profiles.map((profile) => (
                <TableRow key={profile.user_id}>
                  <TableCell className="font-medium text-slate-100">
                    {profile.full_name}
                  </TableCell>
                  <TableCell className="capitalize text-slate-400">
                    {profile.role}
                  </TableCell>
                  <TableCell>
                    {profile.is_online ? (
                      <Badge variant="default" className="bg-green-600">Online</Badge>
                    ) : (
                      <Badge variant="secondary">Offline</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-slate-400">
                    {profile.last_active_at
                      ? new Date(profile.last_active_at).toLocaleString()
                      : "Never"}
                  </TableCell>
                </TableRow>
              ))}
              {profiles.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-slate-400">
                    No team members found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
