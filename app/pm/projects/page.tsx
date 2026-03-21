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
import { FolderKanban, Clock, Users } from "lucide-react";

interface ProjectSummary {
  id: string;
  name: string;
  totalHours: number;
  activeUsers: number;
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProjects = async () => {
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

      const { data: deptProjects } = await supabase
        .from("projects")
        .select("*")
        .eq("dept_id", profile.dept_id);

      if (!deptProjects || deptProjects.length === 0) {
        setLoading(false);
        return;
      }

      const summaries: ProjectSummary[] = await Promise.all(
        deptProjects.map(async (project) => {
          const { data: logs } = await supabase
            .from("time_logs")
            .select("clock_in, clock_out, user_id")
            .eq("project_id", project.id);

          let totalMs = 0;
          const activeUsers = new Set<string>();

          logs?.forEach((log) => {
            if (log.clock_out) {
              totalMs += new Date(log.clock_out).getTime() - new Date(log.clock_in).getTime();
            } else {
              activeUsers.add(log.user_id);
            }
          });

          return {
            id: project.id,
            name: project.name,
            totalHours: Math.round((totalMs / 3600000) * 10) / 10,
            activeUsers: activeUsers.size,
          };
        })
      );

      setProjects(summaries);
      setLoading(false);
    };

    fetchProjects();
  }, []);

  const totalHours = projects.reduce((sum, p) => sum + p.totalHours, 0);
  const totalActive = projects.reduce((sum, p) => sum + p.activeUsers, 0);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Projects</h1>
        <p className="text-sm text-slate-400">Project hours summary</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Projects</p>
              <p className="mt-1 text-2xl font-bold text-slate-100">{projects.length}</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-500/10 ring-1 ring-indigo-500/20">
              <FolderKanban className="h-5 w-5 text-indigo-400" />
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Total Hours</p>
              <p className="mt-1 text-2xl font-bold text-slate-100">{totalHours.toFixed(1)}h</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-500/10 ring-1 ring-violet-500/20">
              <Clock className="h-5 w-5 text-violet-400" />
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Active Users</p>
              <p className="mt-1 text-2xl font-bold text-green-400">{totalActive}</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10 ring-1 ring-green-500/20">
              <Users className="h-5 w-5 text-green-400" />
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-900/50">
        <div className="border-b border-slate-800 p-4">
          <h2 className="text-lg font-semibold text-slate-100">
            Department Projects
          </h2>
        </div>
        <div className="p-4">
          {loading ? (
            <p className="text-sm text-slate-400">Loading...</p>
          ) : projects.length === 0 ? (
            <p className="text-sm text-slate-400">No projects found.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Project</TableHead>
                  <TableHead>Total Hours</TableHead>
                  <TableHead>Active Users</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {projects.map((project) => (
                  <TableRow key={project.id}>
                    <TableCell className="font-medium text-slate-100">
                      <div className="flex items-center gap-2">
                        <FolderKanban className="h-4 w-4 text-slate-500" />
                        {project.name}
                      </div>
                    </TableCell>
                    <TableCell className="text-slate-400">
                      {project.totalHours}h
                    </TableCell>
                    <TableCell className="text-slate-400">
                      {project.activeUsers}
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
