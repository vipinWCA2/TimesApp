"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useTimerStore } from "@/lib/store/timerStore";

export function useOnlineStatus(userId: string) {
  const isRunning = useTimerStore((s) => s.isRunning);

  useEffect(() => {
    const supabase = createClient();

    const updateStatus = async (online: boolean) => {
      await supabase
        .from("profiles")
        .update({
          is_online: online,
          ...(online ? { last_active_at: new Date().toISOString() } : {}),
        })
        .eq("user_id", userId);
    };

    updateStatus(isRunning);

    // Update last_active_at every 60s while running
    if (!isRunning) return;

    const interval = setInterval(() => {
      updateStatus(true);
    }, 60_000);

    return () => clearInterval(interval);
  }, [isRunning, userId]);
}
