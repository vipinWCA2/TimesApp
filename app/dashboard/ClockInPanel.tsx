"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useTimerStore } from "@/lib/store/timerStore";
import { FaceGate } from "@/components/biometric/FaceGate";
import { ProjectSelector } from "./ProjectSelector";
import { SessionNotes } from "./SessionNotes";
import { Button } from "@/components/ui/button";
import { Play, Square, ScanFace, AlertTriangle } from "lucide-react";
import type { Profile, Project, TimeLog } from "@/lib/types/database";

interface ClockInPanelProps {
  profile: Profile;
  activeLog: TimeLog | null;
  projects: Project[];
}

export function ClockInPanel({ profile, activeLog, projects }: ClockInPanelProps) {
  const router = useRouter();
  const { isRunning, startTimer, stopTimer } = useTimerStore();
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [showFaceGate, setShowFaceGate] = useState(false);
  const [clockingOut, setClockingOut] = useState(false);

  useEffect(() => {
    if (activeLog && !isRunning) {
      startTimer(activeLog.clock_in, activeLog.id, activeLog.project_id);
    }
  }, [activeLog, isRunning, startTimer]);

  const handleClockIn = async () => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("time_logs")
      .insert({
        user_id: profile.user_id,
        project_id: selectedProjectId,
      })
      .select()
      .single();

    if (error || !data) {
      console.error("Clock in failed:", error);
      return;
    }

    await supabase
      .from("profiles")
      .update({ is_online: true, last_active_at: new Date().toISOString() })
      .eq("user_id", profile.user_id);

    startTimer(data.clock_in, data.id, data.project_id);
    setShowFaceGate(false);
    router.refresh();
  };

  const handleClockOut = async () => {
    setClockingOut(true);
    const supabase = createClient();
    const { activeTimeLogId } = useTimerStore.getState();

    if (!activeTimeLogId) return;

    const { error } = await supabase.rpc("clock_out_now", {
      log_id: activeTimeLogId,
    });

    if (error) {
      await supabase
        .from("time_logs")
        .update({ clock_out: new Date().toISOString() })
        .eq("id", activeTimeLogId);
    }

    await supabase
      .from("profiles")
      .update({ is_online: false })
      .eq("user_id", profile.user_id);

    stopTimer();
    setClockingOut(false);
    router.refresh();
  };

  const [noWebcam, setNoWebcam] = useState(false);

  // Check if webcam is available
  useEffect(() => {
    navigator.mediaDevices
      .enumerateDevices()
      .then((devices) => {
        const hasCamera = devices.some((d) => d.kind === "videoinput");
        setNoWebcam(!hasCamera);
      })
      .catch(() => setNoWebcam(true));
  }, []);

  const hasDescriptor = profile.face_descriptor && profile.face_descriptor.length > 0;

  if (isRunning) {
    return (
      <div className="rounded-xl border border-green-500/20 bg-linear-to-b from-green-500/5 to-slate-900/50">
        <div className="flex items-center gap-2 border-b border-green-500/10 px-4 py-4">
          <div className="h-2 w-2 animate-pulse rounded-full bg-green-400" />
          <h3 className="text-sm font-semibold text-green-400">Active Session</h3>
        </div>
        <div className="flex flex-col gap-4 p-4">
          <SessionNotes />
          <Button
            variant="destructive"
            onClick={handleClockOut}
            disabled={clockingOut}
            className="w-full gap-2"
          >
            <Square className="h-4 w-4" />
            {clockingOut ? "Clocking Out..." : "Clock Out"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/50">
      <div className="flex items-center gap-2 border-b border-slate-800 px-4 py-4">
        <Play className="h-4 w-4 text-indigo-400" />
        <h3 className="text-sm font-semibold text-slate-200">Clock In</h3>
      </div>
      <div className="flex flex-col gap-4 p-4">
        {!hasDescriptor && (
          <div className="flex items-start gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 p-4">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
            <p className="text-sm text-amber-300">
              Face not enrolled.{" "}
              <a href="/enroll" className="font-medium text-indigo-400 underline underline-offset-2">
                Enroll now
              </a>
            </p>
          </div>
        )}

        <ProjectSelector
          projects={projects}
          selectedId={selectedProjectId}
          onSelect={setSelectedProjectId}
        />

        {/* Face verification when webcam + descriptor available */}
        {hasDescriptor && !noWebcam && !showFaceGate && (
          <Button onClick={() => setShowFaceGate(true)} className="w-full gap-2">
            <ScanFace className="h-4 w-4" />
            Start Face Verification
          </Button>
        )}

        {hasDescriptor && !noWebcam && showFaceGate && (
          <FaceGate
            storedDescriptor={profile.face_descriptor!}
            onVerified={handleClockIn}
          />
        )}

        {/* Normal clock-in when no webcam or no face enrolled */}
        {(noWebcam || !hasDescriptor) && (
          <div className="flex flex-col gap-2">
            {noWebcam && hasDescriptor && (
              <div className="flex items-start gap-2 rounded-lg border border-slate-700 bg-slate-800/50 p-4">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                <p className="text-xs text-slate-400">
                  No webcam detected. Using manual clock-in.
                </p>
              </div>
            )}
            <Button onClick={handleClockIn} className="w-full gap-2">
              <Play className="h-4 w-4" />
              Clock In
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
