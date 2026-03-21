"use client";

import { useEffect } from "react";
import { useNeutralino } from "@/lib/neutralino/useNeutralino";
import { setupTray } from "@/lib/neutralino/setupTray";
import { useActivityTracker } from "@/lib/hooks/useActivityTracker";

export function AppInitializer() {
  const { available } = useNeutralino();

  useEffect(() => {
    if (available) {
      setupTray();
    }
  }, [available]);

  // Activity tracker runs automatically when timer is active
  useActivityTracker();

  return null;
}
