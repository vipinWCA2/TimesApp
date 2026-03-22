"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FolderKanban, Plus, Trash2, Building2 } from "lucide-react";

interface Project {
  id: string;
  name: string;
  dept_id: string | null;
  pm_id: string | null;
  created_at: string;
  departments?: { name: string } | null;
  profiles?: { full_name: string } | null;
}

interface Department {
  id: string;
  name: string;
}

interface PMProfile {
  user_id: string;
  full_name: string;
}

export default function AdminProjectsPage() {
  const supabase = createClient();
  const [projects, setProjects] = useState<Project[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [pms, setPms] = useState<PMProfile[]>([]);
  const [showDialog, setShowDialog] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form
  const [name, setName] = useState("");
  const [deptId, setDeptId] = useState("");
  const [pmId, setPmId] = useState("");

  const loadData = useCallback(async () => {
    const { data: projs } = await supabase
      .from("projects")
      .select("*, departments(name), profiles(full_name)")
      .order("created_at", { ascending: false });
    if (projs) setProjects(projs);

    const { data: depts } = await supabase.from("departments").select("*");
    if (depts) setDepartments(depts);

    const { data: pmProfiles } = await supabase
      .from("profiles")
      .select("user_id, full_name")
      .in("role", ["pm", "admin"]);
    if (pmProfiles) setPms(pmProfiles);
  }, [supabase]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreate = async () => {
    if (!name.trim()) return;
    setSaving(true);

    await supabase.from("projects").insert({
      name: name.trim(),
      dept_id: deptId || null,
      pm_id: pmId || null,
    });

    setName("");
    setDeptId("");
    setPmId("");
    setShowDialog(false);
    setSaving(false);
    await loadData();
  };

  const handleDelete = async (id: string) => {
    await supabase.from("projects").delete().eq("id", id);
    await loadData();
  };

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Projects</h1>
          <p className="mt-1 text-sm text-slate-500">Create and manage projects</p>
        </div>
        <Button onClick={() => setShowDialog(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          New Project
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Total Projects</p>
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
              <p className="text-sm text-slate-500">Departments</p>
              <p className="mt-1 text-2xl font-bold text-slate-100">{departments.length}</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-500/10 ring-1 ring-violet-500/20">
              <Building2 className="h-5 w-5 text-violet-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Projects Table */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/50">
        <Table>
          <TableHeader>
            <TableRow className="border-slate-800 hover:bg-transparent">
              <TableHead className="text-xs font-medium text-slate-500">Project Name</TableHead>
              <TableHead className="text-xs font-medium text-slate-500">Department</TableHead>
              <TableHead className="text-xs font-medium text-slate-500">Manager</TableHead>
              <TableHead className="text-xs font-medium text-slate-500">Created</TableHead>
              <TableHead className="text-xs font-medium text-slate-500">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {projects.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-sm text-slate-500">
                  No projects yet. Create your first project.
                </TableCell>
              </TableRow>
            ) : (
              projects.map((project) => (
                <TableRow key={project.id} className="border-slate-800/50 hover:bg-slate-800/30">
                  <TableCell className="font-medium text-slate-200">{project.name}</TableCell>
                  <TableCell>
                    {project.departments?.name ? (
                      <Badge variant="secondary" className="border-0 bg-slate-800 text-slate-300">
                        {project.departments.name}
                      </Badge>
                    ) : (
                      <span className="text-slate-600">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-slate-400">
                    {project.profiles?.full_name ?? "—"}
                  </TableCell>
                  <TableCell className="text-xs text-slate-500">
                    {new Date(project.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(project.id)}
                      className="h-8 w-8 text-slate-500 hover:bg-red-500/10 hover:text-red-400"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Create Project Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="border-slate-800 bg-slate-900">
          <DialogHeader>
            <DialogTitle className="text-slate-100">Create New Project</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-4">
            <div className="flex flex-col gap-2">
              <Label className="text-slate-400">Project Name</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Client Portal Redesign"
                className="border-slate-700 bg-slate-800/50"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label className="text-slate-400">Department</Label>
              <Select value={deptId} onValueChange={(v) => setDeptId(v ?? "")}>
                <SelectTrigger className="border-slate-700 bg-slate-800/50">
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((d) => (
                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label className="text-slate-400">Project Manager</Label>
              <Select value={pmId} onValueChange={(v) => setPmId(v ?? "")}>
                <SelectTrigger className="border-slate-700 bg-slate-800/50">
                  <SelectValue placeholder="Select manager" />
                </SelectTrigger>
                <SelectContent>
                  {pms.map((p) => (
                    <SelectItem key={p.user_id} value={p.user_id}>{p.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setShowDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={saving || !name.trim()} className="gap-2">
              <Plus className="h-4 w-4" />
              {saving ? "Creating..." : "Create Project"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
