"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, UserCheck, UserX, Shield } from "lucide-react";
import type { Profile, Department } from "@/lib/types/database";

export default function UsersPage() {
  const [users, setUsers] = useState<(Profile & { departments: Department | null })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUsers = async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("profiles")
        .select("*, departments(name)")
        .order("full_name");

      if (data) {
        setUsers(data as unknown as (Profile & { departments: Department | null })[]);
      }
      setLoading(false);
    };
    fetchUsers();
  }, []);

  const adminCount = users.filter((u) => u.role === "admin").length;
  const onlineCount = users.filter((u) => u.is_online).length;
  const enrolledCount = users.filter((u) => u.face_descriptor && u.face_descriptor.length > 0).length;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">User Management</h1>
        <p className="text-sm text-slate-400">Manage all organization users</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Total Users</p>
              <p className="mt-1 text-2xl font-bold text-slate-100">{users.length}</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-500/10 ring-1 ring-indigo-500/20">
              <Users className="h-5 w-5 text-indigo-400" />
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Online</p>
              <p className="mt-1 text-2xl font-bold text-green-400">{onlineCount}</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10 ring-1 ring-green-500/20">
              <UserCheck className="h-5 w-5 text-green-400" />
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Face Enrolled</p>
              <p className="mt-1 text-2xl font-bold text-slate-100">{enrolledCount}</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-500/10 ring-1 ring-violet-500/20">
              <UserX className="h-5 w-5 text-violet-400" />
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Admins</p>
              <p className="mt-1 text-2xl font-bold text-slate-100">{adminCount}</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10 ring-1 ring-amber-500/20">
              <Shield className="h-5 w-5 text-amber-400" />
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-900/50">
        <div className="border-b border-slate-800 p-4">
          <h2 className="text-lg font-semibold text-slate-100">
            All Users ({users.length})
          </h2>
        </div>
        <div className="p-4">
          {loading ? (
            <p className="text-sm text-slate-400">Loading...</p>
          ) : users.length === 0 ? (
            <p className="text-sm text-slate-400">No users found.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Face Enrolled</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.user_id}>
                    <TableCell className="font-medium text-slate-100">
                      {user.full_name}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={user.role === "admin" ? "default" : "secondary"}
                        className={user.role === "admin" ? "bg-indigo-600" : ""}
                      >
                        {user.role}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-slate-400">
                      {user.departments?.name ?? "Unassigned"}
                    </TableCell>
                    <TableCell>
                      {user.face_descriptor && user.face_descriptor.length > 0 ? (
                        <Badge variant="default" className="bg-green-600">Yes</Badge>
                      ) : (
                        <Badge variant="secondary">No</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {user.is_online ? (
                        <Badge variant="default" className="bg-green-600">Online</Badge>
                      ) : (
                        <Badge variant="secondary">Offline</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Link href={`/admin/users/${user.user_id}`}>
                        <Button variant="outline" size="sm">
                          Edit
                        </Button>
                      </Link>
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
