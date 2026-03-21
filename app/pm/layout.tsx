import { createClient } from "@/lib/supabase/server";
import { DashboardShell } from "@/components/layout/DashboardShell";
import type { Role } from "@/lib/types/database";

export default async function PMLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let role: Role = "admin";
  let fullName = "Vipin M";

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role, full_name")
        .eq("user_id", user.id)
        .single();
      if (profile) {
        role = profile.role as Role;
        fullName = profile.full_name;
      }
    }
  } catch {}

  return (
    <DashboardShell role={role} fullName={fullName}>
      {children}
    </DashboardShell>
  );
}
