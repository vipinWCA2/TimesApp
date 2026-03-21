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
import { Building2, Users } from "lucide-react";
import type { Department } from "@/lib/types/database";

interface DepartmentWithCount extends Department {
  memberCount: number;
}

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState<DepartmentWithCount[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDepartments = async () => {
      const supabase = createClient();

      const { data: depts } = await supabase
        .from("departments")
        .select("*")
        .order("name");

      if (!depts) {
        setLoading(false);
        return;
      }

      const withCounts = await Promise.all(
        depts.map(async (dept) => {
          const { count } = await supabase
            .from("profiles")
            .select("*", { count: "exact", head: true })
            .eq("dept_id", dept.id);

          return { ...dept, memberCount: count ?? 0 };
        })
      );

      setDepartments(withCounts);
      setLoading(false);
    };

    fetchDepartments();
  }, []);

  const totalMembers = departments.reduce((sum, d) => sum + d.memberCount, 0);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Departments</h1>
        <p className="text-sm text-slate-400">Manage organization departments</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Departments</p>
              <p className="mt-1 text-2xl font-bold text-slate-100">{departments.length}</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-500/10 ring-1 ring-indigo-500/20">
              <Building2 className="h-5 w-5 text-indigo-400" />
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Total Members</p>
              <p className="mt-1 text-2xl font-bold text-slate-100">{totalMembers}</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10 ring-1 ring-green-500/20">
              <Users className="h-5 w-5 text-green-400" />
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-900/50">
        <div className="border-b border-slate-800 p-4">
          <h2 className="text-lg font-semibold text-slate-100">All Departments</h2>
        </div>
        <div className="p-4">
          {loading ? (
            <p className="text-sm text-slate-400">Loading...</p>
          ) : departments.length === 0 ? (
            <p className="text-sm text-slate-400">No departments found.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Department</TableHead>
                  <TableHead>Members</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {departments.map((dept) => (
                  <TableRow key={dept.id}>
                    <TableCell className="font-medium text-slate-100">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-slate-500" />
                        {dept.name}
                      </div>
                    </TableCell>
                    <TableCell className="text-slate-400">
                      {dept.memberCount}
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
