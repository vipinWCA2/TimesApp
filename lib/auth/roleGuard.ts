import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Role, Profile } from "@/lib/types/database";

export async function requireAuth(): Promise<Profile> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (!profile) {
    redirect("/enroll");
  }

  return profile as Profile;
}

export async function requireRole(...roles: Role[]): Promise<Profile> {
  const profile = await requireAuth();

  if (!roles.includes(profile.role)) {
    redirect("/dashboard");
  }

  return profile;
}
