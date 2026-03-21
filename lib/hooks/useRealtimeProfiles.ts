"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/types/database";

export function useRealtimeProfiles(deptId?: string) {
  const [profiles, setProfiles] = useState<Profile[]>([]);

  useEffect(() => {
    const supabase = createClient();

    // Initial fetch
    const fetch = async () => {
      let query = supabase.from("profiles").select("*");
      if (deptId) {
        query = query.eq("dept_id", deptId);
      }
      const { data } = await query;
      if (data) setProfiles(data as Profile[]);
    };
    fetch();

    // Subscribe to realtime changes
    const channel = supabase
      .channel("profiles-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "profiles",
          ...(deptId ? { filter: `dept_id=eq.${deptId}` } : {}),
        },
        (payload) => {
          if (payload.eventType === "UPDATE") {
            setProfiles((prev) =>
              prev.map((p) =>
                p.user_id === (payload.new as Profile).user_id
                  ? (payload.new as Profile)
                  : p
              )
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [deptId]);

  return profiles;
}
