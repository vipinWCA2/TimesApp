"use client";

import { useEffect, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import html2canvas from "html2canvas";

interface ActivityTrackerProps {
  userId: string;
  timeLogId: string;
  taskId: string | null;
  isRunning: boolean;
}

// Local IndexedDB for screenshots
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

async function saveScreenshotLocal(data: {
  user_id: string;
  time_log_id: string;
  task_id: string | null;
  thumbnail: string;
}) {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, "readwrite");
  tx.objectStore(STORE_NAME).add({
    ...data,
    created_at: new Date().toISOString(),
  });
  return new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getLocalScreenshots(userId: string, limit = 12): Promise<
  { id: number; thumbnail: string; created_at: string; task_id: string | null }[]
> {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, "readonly");
  const store = tx.objectStore(STORE_NAME);
  const index = store.index("user_id");

  return new Promise((resolve, reject) => {
    const req = index.getAll(userId);
    req.onsuccess = () => {
      const all = req.result;
      // Sort by created_at desc, take limit
      all.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      resolve(all.slice(0, limit));
    };
    req.onerror = () => reject(req.error);
  });
}

/**
 * Runs in background while timer is active:
 * - Sends mouse position pings every 60s
 * - Takes screenshots every 5 minutes (saved locally + Supabase)
 * - Detects idle (no mouse movement for 60s+)
 */
export function ActivityTracker({ userId, timeLogId, taskId, isRunning }: ActivityTrackerProps) {
  const supabase = createClient();
  const lastMouseRef = useRef({ x: 0, y: 0, moved: false });
  const pingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const screenshotIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Track mouse movement
  useEffect(() => {
    if (!isRunning) return;
    const handleMouseMove = (e: MouseEvent) => {
      lastMouseRef.current = { x: e.clientX, y: e.clientY, moved: true };
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [isRunning]);

  // Send activity pings every 60 seconds
  const sendPing = useCallback(async () => {
    const { x, y, moved } = lastMouseRef.current;
    const isIdle = !moved;
    await supabase.from("activity_pings").insert({
      user_id: userId,
      time_log_id: timeLogId,
      mouse_x: x,
      mouse_y: y,
      is_idle: isIdle,
    });
    lastMouseRef.current.moved = false;
  }, [userId, timeLogId, supabase]);

  // Take screenshot using html2canvas
  const takeScreenshot = useCallback(async () => {
    try {
      const canvas = await html2canvas(document.body, {
        scale: 0.4,
        logging: false,
        useCORS: true,
        width: window.innerWidth,
        height: window.innerHeight,
      });

      const thumbnail = canvas.toDataURL("image/jpeg", 0.6);

      // Save locally (IndexedDB)
      await saveScreenshotLocal({
        user_id: userId,
        time_log_id: timeLogId,
        task_id: taskId,
        thumbnail,
      });

      // Also save to Supabase
      await supabase.from("screenshots").insert({
        user_id: userId,
        time_log_id: timeLogId,
        task_id: taskId,
        thumbnail,
      }).then(() => {}, () => {});
    } catch {
      // Silently skip if capture fails
    }
  }, [userId, timeLogId, taskId, supabase]);

  // Start/stop intervals
  useEffect(() => {
    if (!isRunning) {
      if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
      if (screenshotIntervalRef.current) clearInterval(screenshotIntervalRef.current);
      return;
    }

    sendPing();
    pingIntervalRef.current = setInterval(sendPing, 60_000);

    // First screenshot after 10 seconds, then every 5 minutes
    const firstScreenshot = setTimeout(takeScreenshot, 10_000);
    screenshotIntervalRef.current = setInterval(takeScreenshot, 5 * 60_000);

    return () => {
      if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
      if (screenshotIntervalRef.current) clearInterval(screenshotIntervalRef.current);
      clearTimeout(firstScreenshot);
    };
  }, [isRunning, sendPing, takeScreenshot]);

  return null;
}
