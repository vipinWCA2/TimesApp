"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import * as faceapi from "face-api.js";
import { loadFaceModels } from "@/lib/faceapi/loadModels";
import { computeMatchScore, isMatch } from "@/lib/faceapi/matchFace";
import { Button } from "@/components/ui/button";

interface FaceGateProps {
  storedDescriptor: number[];
  onVerified: () => void;
}

const ROLLING_WINDOW = 5;
const DETECTION_OPTIONS = new faceapi.SsdMobilenetv1Options({ minConfidence: 0.3 });

export function FaceGate({ storedDescriptor, onVerified }: FaceGateProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number>(0);
  const [score, setScore] = useState<number>(0);
  const [verified, setVerified] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const storedFloat32 = useRef(new Float32Array(storedDescriptor));
  const recentScores = useRef<number[]>([]);

  // Cleanup camera on unmount — CRITICAL per CLAUDE.md
  useEffect(() => {
    return () => {
      cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  const startCamera = useCallback(async () => {
    try {
      await loadFaceModels();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: 640, height: 480 },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setLoading(false);
    } catch (err) {
      setError("Camera access denied. Please allow camera permissions.");
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    startCamera();
  }, [startCamera]);

  // RAF-based face detection loop (per CLAUDE.md — not setInterval)
  const detect = useCallback(async () => {
    if (!videoRef.current || verified) return;

    const video = videoRef.current;
    if (video.readyState !== 4) {
      rafRef.current = requestAnimationFrame(detect);
      return;
    }

    const detection = await faceapi
      .detectSingleFace(video, DETECTION_OPTIONS)
      .withFaceLandmarks()
      .withFaceDescriptor();

    if (detection) {
      const matchScore = computeMatchScore(
        detection.descriptor,
        storedFloat32.current
      );

      // Rolling average over last N frames to smooth out noise
      recentScores.current.push(matchScore);
      if (recentScores.current.length > ROLLING_WINDOW) {
        recentScores.current.shift();
      }
      const avgScore =
        recentScores.current.reduce((a, b) => a + b, 0) /
        recentScores.current.length;

      setScore(avgScore);

      if (isMatch(avgScore)) {
        setVerified(true);
        // Stop camera after verification
        streamRef.current?.getTracks().forEach((track) => track.stop());
        return;
      }
    }

    rafRef.current = requestAnimationFrame(detect);
  }, [verified]);

  useEffect(() => {
    if (!loading && !error) {
      rafRef.current = requestAnimationFrame(detect);
    }
    return () => cancelAnimationFrame(rafRef.current);
  }, [loading, error, detect]);

  const scorePercent = Math.round(score * 100);

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative overflow-hidden rounded-lg border border-slate-700">
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className="h-64 w-80 object-cover"
        />
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-900/80">
            <p className="text-sm text-slate-400">Loading camera...</p>
          </div>
        )}
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      {!error && (
        <div className="flex flex-col items-center gap-2">
          <div className="flex items-center gap-2">
            <div className="h-2 w-32 overflow-hidden rounded-full bg-slate-700">
              <div
                className="h-full transition-all duration-300"
                style={{
                  width: `${scorePercent}%`,
                  backgroundColor: verified ? "#22c55e" : scorePercent > 70 ? "#eab308" : "#6366f1",
                }}
              />
            </div>
            <span className="text-sm text-slate-400">{scorePercent}%</span>
          </div>

          <Button
            onClick={onVerified}
            disabled={!verified}
            className="w-full"
          >
            {verified ? "Identity Verified — Clock In" : "Verifying Face..."}
          </Button>
        </div>
      )}
    </div>
  );
}
