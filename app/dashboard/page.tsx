import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { RecentLogs } from "./RecentLogs";
import { MyTasks } from "./MyTasks";
import { ActivityProgress } from "@/components/activity/ActivityProgress";
import { YearlyActivity } from "@/components/activity/YearlyActivity";
import type { Profile, Project } from "@/lib/types/database";
import { Clock, FolderKanban, CalendarCheck, TrendingUp } from "lucide-react";

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
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-1 text-2xl font-bold text-foreground">{value}</p>
        </div>
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${c.bg} ring-1 ${c.ring}`}>
          <Icon className={`h-5 w-5 ${c.text}`} />
        </div>
      </div>
    </div>
  );
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: dbProfile } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (!dbProfile) redirect("/login");

  const profile = dbProfile as Profile;

  const { data: logs } = await supabase
    .from("time_logs")
    .select("*, projects(name)")
    .eq("user_id", profile.user_id)
    .order("clock_in", { ascending: false })
    .limit(10);

  const recentLogs = logs ?? [];

  let projects: Project[] = [];
  if (profile.dept_id) {
    const { data: projs } = await supabase
      .from("projects")
      .select("*")
      .eq("dept_id", profile.dept_id);
    projects = projs ?? [];
  } else {
    const { data: projs } = await supabase.from("projects").select("*");
    projects = projs ?? [];
  }

  const totalHours = recentLogs.reduce((acc, log) => {
    if (!log.clock_out) return acc;
    return acc + (new Date(log.clock_out).getTime() - new Date(log.clock_in).getTime()) / 3600000;
  }, 0);

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Welcome back, {profile.full_name}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard label="Total Hours" value={`${totalHours.toFixed(1)}h`} icon={Clock} color="indigo" />
        <StatsCard label="Sessions" value={String(recentLogs.length)} icon={CalendarCheck} color="green" />
        <StatsCard label="Projects" value={String(projects.length)} icon={FolderKanban} color="violet" />
        <StatsCard label="Approved" value={String(recentLogs.filter((l) => l.approved).length)} icon={TrendingUp} color="amber" />
      </div>

      {/* Tasks */}
      <MyTasks userId={profile.user_id} userRole={profile.role} />

      {/* Activity Progress & Screenshots */}
      <ActivityProgress userId={profile.user_id} showScreenshots />

      {/* Yearly Activity */}
      <YearlyActivity userId={profile.user_id} />

      {/* Recent Logs */}
      <RecentLogs logs={recentLogs} />
    </div>
  );
}
