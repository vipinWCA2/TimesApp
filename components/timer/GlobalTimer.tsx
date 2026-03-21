"use client";

import { useEffect } from "react";
import { useTimerStore } from "@/lib/store/timerStore";
import { Clock } from "lucide-react";

function formatTime(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [hours, minutes, seconds]
    .map((v) => String(v).padStart(2, "0"))
    .join(":");
}

export function GlobalTimer() {
  const { isRunning, elapsedSeconds, tick } = useTimerStore();

  useEffect(() => {
    if (!isRunning) return;
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [isRunning, tick]);

  if (!isRunning) {
    return (
      <div className="flex items-center gap-2 text-slate-500">
        <Clock className="h-4 w-4" />
        <span className="text-sm">No active session</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 rounded-lg border border-indigo-500/20 bg-indigo-500/10 px-4 py-2">
      <div className="h-2 w-2 animate-pulse rounded-full bg-green-400" />
      <span className="font-mono text-lg font-bold tracking-wider text-indigo-300">
        {formatTime(elapsedSeconds)}
      </span>
    </div>
  );
}
