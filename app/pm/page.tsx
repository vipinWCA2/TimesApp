import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Users, Activity, Clock, CheckCircle } from "lucide-react";

function StatsCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}) {
  const colorMap: Record<string, { bg: string; text: string; ring: string }> = {
    indigo: { bg: "bg-indigo-500/10", text: "text-indigo-400", ring: "ring-indigo-500/20" },
    green: { bg: "bg-green-500/10", text: "text-green-400", ring: "ring-green-500/20" },
    amber: { bg: "bg-amber-500/10", text: "text-amber-400", ring: "ring-amber-500/20" },
    violet: { bg: "bg-violet-500/10", text: "text-violet-400", ring: "ring-violet-500/20" },
  };
  const c = colorMap[color] ?? colorMap.indigo;

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500">{label}</p>
          <p className="mt-1 text-2xl font-bold text-slate-100">{value}</p>
        </div>
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${c.bg} ring-1 ${c.ring}`}>
          <Icon className={`h-5 w-5 ${c.text}`} />
        </div>
      </div>
    </div>
  );
}

export default async function PMDashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("dept_id, role")
    .eq("user_id", user.id)
    .single();

  if (!profile) redirect("/login");

  let deptName = "Department";
  let teamCount = 0;
  let activeCount = 0;
  let pendingCount = 0;

  if (profile.dept_id) {
    const { data: dept } = await supabase
      .from("departments")
      .select("*")
      .eq("id", profile.dept_id)
      .single();

    if (dept) deptName = dept.name;

    const { count } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("dept_id", profile.dept_id);
    teamCount = count ?? 0;

    const { data: activeLogs } = await supabase
      .from("time_logs")
      .select("user_id, profiles!inner(dept_id)")
      .is("clock_out", null)
      .eq("profiles.dept_id", profile.dept_id);
    activeCount = activeLogs?.length ?? 0;

    const { count: pending } = await supabase
      .from("time_logs")
      .select("*, profiles!inner(dept_id)", { count: "exact", head: true })
      .eq("approved", false)
      .not("clock_out", "is", null)
      .eq("profiles.dept_id", profile.dept_id);
    pendingCount = pending ?? 0;
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">
          {deptName} Overview
        </h1>
        <p className="mt-1 text-sm text-slate-500">Project Manager Dashboard</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard label="Team Members" value={String(teamCount)} icon={Users} color="indigo" />
        <StatsCard label="Active Now" value={String(activeCount)} icon={Activity} color="green" />
        <StatsCard label="Pending Approvals" value={String(pendingCount)} icon={Clock} color="amber" />
        <StatsCard label="Department" value={deptName} icon={CheckCircle} color="violet" />
      </div>
    </div>
  );
}
