"use client";

import { useEffect, useRef } from "react";
import { useTimerStore } from "@/lib/store/timerStore";
import { useActivityStore } from "@/lib/store/activityStore";
import { createClient } from "@/lib/supabase/client";
import html2canvas from "html2canvas";

const PING_INTERVAL = 60_000; // 60 seconds
const IDLE_THRESHOLD = 300_000; // 5 minutes
const SCREENSHOT_INTERVAL = 5 * 60_000; // 5 minutes
const FIRST_SCREENSHOT_DELAY = 10_000; // 10 seconds

// IndexedDB for local screenshot storage
const DB_NAME = "apextime_screenshots";
const STORE_NAME = "screenshots";

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "id", autoIncrement: true });
        store.createIndex("user_id", "user_id", { unique: false });
        store.createIndex("created_at", "created_at", { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export function useActivityTracker() {
  const isRunning = useTimerStore((s) => s.isRunning);
  const activeTimeLogId = useTimerStore((s) => s.activeTimeLogId);
  const activeTaskId = useTimerStore((s) => s.activeTaskId);
  const { updateMousePosition, setIdle } = useActivityStore();
  const pingIntervalRef = useRef<ReturnType<typeof setInterval>>(null);
  const screenshotIntervalRef = useRef<ReturnType<typeof setInterval>>(null);
  const screenshotTimeoutRef = useRef<ReturnType<typeof setTimeout>>(null);

  // Track mouse movement
  useEffect(() => {
    if (!isRunning) return;

    const handleMouseMove = (e: MouseEvent) => {
      updateMousePosition(e.clientX, e.clientY);
    };

    const handleKeyDown = () => {
      updateMousePosition(
        useActivityStore.getState().lastMouseX,
        useActivityStore.getState().lastMouseY
      );
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isRunning, updateMousePosition]);

  // Send pings every 60s and check idle
  useEffect(() => {
    if (!isRunning || !activeTimeLogId) return;

    const sendPing = async () => {
      const state = useActivityStore.getState();
      const now = Date.now();
      const idle = now - state.lastActivityAt > IDLE_THRESHOLD;

      setIdle(idle);

      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Log activity ping
      await supabase.from("activity_pings").insert({
        user_id: user.id,
        time_log_id: activeTimeLogId,
        mouse_x: state.lastMouseX,
        mouse_y: state.lastMouseY,
        is_idle: idle,
      });

      // Update online status
      await supabase
        .from("profiles")
        .update({ is_online: true, last_active_at: new Date().toISOString() })
        .eq("user_id", user.id);
    };

    sendPing();
    pingIntervalRef.current = setInterval(sendPing, PING_INTERVAL);

    return () => {
      if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
    };
  }, [isRunning, activeTimeLogId, setIdle]);

  // Take screenshots while timer is running
  useEffect(() => {
    if (!isRunning || !activeTimeLogId) return;

    const takeScreenshot = async () => {
      try {
        const canvas = await html2canvas(document.body, {
          scale: 0.4,
          logging: false,
          useCORS: true,
          width: window.innerWidth,
          height: window.innerHeight,
        });

        const thumbnail = canvas.toDataURL("image/jpeg", 0.5);
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Save to IndexedDB
        try {
          const db = await openDB();
          const tx = db.transaction(STORE_NAME, "readwrite");
          tx.objectStore(STORE_NAME).add({
            user_id: user.id,
            time_log_id: activeTimeLogId,
            task_id: activeTaskId ?? null,
            thumbnail,
            created_at: new Date().toISOString(),
          });
        } catch {
          // IndexedDB not available
        }

        // Save to Supabase
        await supabase.from("screenshots").insert({
          user_id: user.id,
          time_log_id: activeTimeLogId,
          task_id: activeTaskId ?? null,
          thumbnail,
        }).then(() => {}, () => {});
      } catch {
        // Silently skip if capture fails
      }
    };

    // First screenshot after 10s, then every 5 minutes
    screenshotTimeoutRef.current = setTimeout(takeScreenshot, FIRST_SCREENSHOT_DELAY);
    screenshotIntervalRef.current = setInterval(takeScreenshot, SCREENSHOT_INTERVAL);

    return () => {
      if (screenshotTimeoutRef.current) clearTimeout(screenshotTimeoutRef.current);
      if (screenshotIntervalRef.current) clearInterval(screenshotIntervalRef.current);
    };
  }, [isRunning, activeTimeLogId, activeTaskId]);

  // Set offline when timer stops
  useEffect(() => {
    if (isRunning) return;

    const setOffline = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from("profiles")
          .update({ is_online: false })
          .eq("user_id", user.id);
      }
    };

    setOffline();
  }, [isRunning]);
}
