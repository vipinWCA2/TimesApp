"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import * as faceapi from "face-api.js";
import { loadFaceModels } from "@/lib/faceapi/loadModels";
import { Button } from "@/components/ui/button";

interface EnrollFaceProps {
  onEnroll: (descriptor: number[]) => void;
}

const DETECTION_OPTIONS = new faceapi.SsdMobilenetv1Options({ minConfidence: 0.3 });
const ENROLL_SAMPLES = 3;

export function EnrollFace({ onEnroll }: EnrollFaceProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [faceDetected, setFaceDetected] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const rafRef = useRef<number>(0);

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
    } catch {
      setError("Camera access denied. Please allow camera permissions.");
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    startCamera();
  }, [startCamera]);

  // RAF-based face detection loop
  const detect = useCallback(async () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    if (video.readyState !== 4) {
      rafRef.current = requestAnimationFrame(detect);
      return;
    }

    const detection = await faceapi
      .detectSingleFace(video, DETECTION_OPTIONS)
      .withFaceLandmarks()
      .withFaceDescriptor();

    setFaceDetected(!!detection);
    rafRef.current = requestAnimationFrame(detect);
  }, []);

  useEffect(() => {
    if (!loading && !error) {
      rafRef.current = requestAnimationFrame(detect);
    }
    return () => cancelAnimationFrame(rafRef.current);
  }, [loading, error, detect]);

  const handleCapture = async () => {
    if (!videoRef.current) return;
    setCapturing(true);

    // Capture multiple samples and average for a more robust descriptor
    const descriptors: Float32Array[] = [];
    for (let i = 0; i < ENROLL_SAMPLES; i++) {
      const detection = await faceapi
        .detectSingleFace(videoRef.current, DETECTION_OPTIONS)
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (detection) {
        descriptors.push(detection.descriptor);
      }
      // Brief delay between samples for slight natural variation
      if (i < ENROLL_SAMPLES - 1) {
        await new Promise((r) => setTimeout(r, 300));
      }
    }

    if (descriptors.length > 0) {
      // Average all captured descriptors for a stable enrollment
      const avg = new Float32Array(128);
      for (const d of descriptors) {
        for (let j = 0; j < 128; j++) avg[j] += d[j];
      }
      for (let j = 0; j < 128; j++) avg[j] /= descriptors.length;

      // Only store the 128-float descriptor — NEVER raw images
      const descriptor = Array.from(avg);
      streamRef.current?.getTracks().forEach((track) => track.stop());
      cancelAnimationFrame(rafRef.current);
      onEnroll(descriptor);
    } else {
      setCapturing(false);
    }
  };

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
          <p className="text-sm text-slate-400">
            {faceDetected
              ? "Face detected — ready to capture"
              : "Position your face in the camera"}
          </p>
          <Button
            onClick={handleCapture}
            disabled={!faceDetected || capturing}
            className="w-full"
          >
            {capturing ? "Capturing..." : "Capture Face Descriptor"}
          </Button>
        </div>
      )}
    </div>
  );
}
