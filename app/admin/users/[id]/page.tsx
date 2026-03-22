"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { EnrollFace } from "@/components/biometric/EnrollFace";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Profile, Department } from "@/lib/types/database";

export default function EditUserPage() {
  const params = useParams();
  const router = useRouter();
  const userId = params.id as string;

  const [profile, setProfile] = useState<Profile | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState("");
  const [deptId, setDeptId] = useState("");
  const [saving, setSaving] = useState(false);
  const [showEnroll, setShowEnroll] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const fetch = async () => {
      const supabase = createClient();

      const { data: p } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", userId)
        .single();

      const { data: depts } = await supabase
        .from("departments")
        .select("*");

      if (p) {
        setProfile(p as Profile);
        setFullName(p.full_name);
        setRole(p.role);
        setDeptId(p.dept_id ?? "");
      }
      setDepartments((depts as Department[]) ?? []);
    };
    fetch();
  }, [userId]);

  const handleSave = async () => {
    setSaving(true);
    const supabase = createClient();

    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: fullName,
        role,
        dept_id: deptId || null,
      })
      .eq("user_id", userId);

    if (error) {
      setMessage(`Error: ${error.message}`);
    } else {
      setMessage("User updated successfully.");
    }
    setSaving(false);
  };

  const handleEnroll = async (descriptor: number[]) => {
    const supabase = createClient();
    await supabase
      .from("profiles")
      .update({ face_descriptor: descriptor })
      .eq("user_id", userId);

    setShowEnroll(false);
    setMessage("Face descriptor enrolled successfully.");
  };

  if (!profile) {
    return <p className="text-sm text-slate-400">Loading user...</p>;
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Edit User</h1>
        <p className="text-sm text-slate-400">{profile.full_name}</p>
      </div>

      <Card className="border-slate-700 bg-slate-800">
        <CardHeader>
          <CardTitle className="text-lg text-slate-100">User Details</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label>Full Name</Label>
            <Input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label>Role</Label>
            <Select value={role} onValueChange={(v) => setRole(v ?? "")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="employee">Employee</SelectItem>
                <SelectItem value="pm">Project Manager</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <Label>Department</Label>
            <Select value={deptId} onValueChange={(v) => setDeptId(v ?? "")}>
              <SelectTrigger>
                <SelectValue placeholder="Select department" />
              </SelectTrigger>
              <SelectContent>
                {departments.map((dept) => (
                  <SelectItem key={dept.id} value={dept.id}>
                    {dept.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {message && (
            <p className={`text-sm ${message.startsWith("Error") ? "text-red-400" : "text-green-400"}`}>
              {message}
            </p>
          )}

          <div className="flex gap-4">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : "Save Changes"}
            </Button>
            <Button variant="outline" onClick={() => router.back()}>
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-slate-700 bg-slate-800">
        <CardHeader>
          <CardTitle className="text-lg text-slate-100">Face Enrollment</CardTitle>
        </CardHeader>
        <CardContent>
          {profile.face_descriptor && profile.face_descriptor.length > 0 ? (
            <div className="flex flex-col gap-4">
              <p className="text-sm text-green-400">Face descriptor is enrolled.</p>
              <Button variant="outline" onClick={() => setShowEnroll(true)}>
                Re-enroll Face
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <p className="text-sm text-amber-400">No face descriptor enrolled.</p>
              <Button onClick={() => setShowEnroll(true)}>
                Enroll Face
              </Button>
            </div>
          )}
          {showEnroll && <EnrollFace onEnroll={handleEnroll} />}
        </CardContent>
      </Card>
    </div>
  );
}
