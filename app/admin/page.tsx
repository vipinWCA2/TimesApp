import { createClient } from "@/lib/supabase/server";
import { TeamActivity } from "@/components/activity/TeamActivity";
import { Users, Activity, FolderKanban, ClipboardCheck, Building2 } from "lucide-react";

function StatsCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: number;
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

export default async function AdminDashboardPage() {
  let totalUsers = 13;
  let activeNow = 4;
  let totalProjects = 6;
  let pendingApprovals = 3;
  let departments = [
    { id: "d1", name: "Engineering" },
    { id: "d2", name: "Sales" },
    { id: "d3", name: "Support" },
  ];

  try {
    const supabase = await createClient();

    const { count: u } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true });
    if (u !== null) totalUsers = u;

    const { count: a } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("is_online", true);
    if (a !== null) activeNow = a;

    const { count: p } = await supabase
      .from("projects")
      .select("*", { count: "exact", head: true });
    if (p !== null) totalProjects = p;

    const { count: pa } = await supabase
      .from("time_logs")
      .select("*", { count: "exact", head: true })
      .eq("approved", false)
      .not("clock_out", "is", null);
    if (pa !== null) pendingApprovals = pa;

    const { data: depts } = await supabase.from("departments").select("*");
    if (depts && depts.length > 0) departments = depts;
  } catch {}

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Admin Overview</h1>
        <p className="mt-1 text-sm text-slate-500">Global organization dashboard</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard label="Total Users" value={totalUsers} icon={Users} color="indigo" />
        <StatsCard label="Active Now" value={activeNow} icon={Activity} color="green" />
        <StatsCard label="Projects" value={totalProjects} icon={FolderKanban} color="violet" />
        <StatsCard label="Pending Approvals" value={pendingApprovals} icon={ClipboardCheck} color="amber" />
      </div>

      <div>
        <div className="mb-4 flex items-center gap-2">
          <Building2 className="h-4 w-4 text-slate-500" />
          <h2 className="text-sm font-semibold text-slate-200">Departments</h2>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {departments.map((dept) => (
            <div
              key={dept.id}
              className="rounded-xl border border-slate-800 bg-slate-900/50 p-4"
            >
              <p className="font-medium text-slate-100">{dept.name}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Team Activity — employee progress, time, screenshots */}
      <TeamActivity />
    </div>
  );
}
