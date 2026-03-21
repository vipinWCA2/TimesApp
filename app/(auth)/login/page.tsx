"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { EnrollFace } from "@/components/biometric/EnrollFace";
import { FaceGate } from "@/components/biometric/FaceGate";
import { Timer, LogIn, ScanFace, SkipForward } from "lucide-react";

type LoginStep = "credentials" | "enroll" | "verify";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<LoginStep>("credentials");
  const [userId, setUserId] = useState<string | null>(null);
  const [storedDescriptor, setStoredDescriptor] = useState<number[] | null>(null);
  const [hasWebcam, setHasWebcam] = useState(true);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    if (!authData.user) {
      setError("Login failed");
      setLoading(false);
      return;
    }

    setUserId(authData.user.id);

    // Check if profile exists, create if not
    const { data: profile } = await supabase
      .from("profiles")
      .select("user_id, face_descriptor")
      .eq("user_id", authData.user.id)
      .maybeSingle();

    if (!profile) {
      const fullName =
        authData.user.user_metadata?.full_name ||
        email.split("@")[0].replace(/[._]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

      await supabase.from("profiles").insert({
        user_id: authData.user.id,
        full_name: fullName,
        role: "employee",
      });
    }

    // Check webcam availability
    let webcamAvailable = true;
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      webcamAvailable = devices.some((d) => d.kind === "videoinput");
    } catch {
      webcamAvailable = false;
    }
    setHasWebcam(webcamAvailable);

    if (!webcamAvailable) {
      // No webcam — skip face, go directly to dashboard
      await supabase
        .from("profiles")
        .update({ is_online: true, last_active_at: new Date().toISOString() })
        .eq("user_id", authData.user.id);
      setLoading(false);
      router.push("/dashboard");
      return;
    }

    const descriptor = profile?.face_descriptor;

    if (descriptor && Array.isArray(descriptor) && descriptor.length === 128) {
      // Has face enrolled — verify
      setStoredDescriptor(descriptor);
      setStep("verify");
    } else {
      // First time — enroll face
      setStep("enroll");
    }
    setLoading(false);
  };

  const handleEnroll = async (descriptor: number[]) => {
    if (!userId) return;

    // Save face descriptor to profiles (NEVER raw images)
    await supabase
      .from("profiles")
      .update({ face_descriptor: descriptor })
      .eq("user_id", userId);

    // Set online
    await supabase
      .from("profiles")
      .update({ is_online: true, last_active_at: new Date().toISOString() })
      .eq("user_id", userId);

    router.push("/dashboard");
  };

  const handleVerified = async () => {
    if (!userId) return;

    // Set online
    await supabase
      .from("profiles")
      .update({ is_online: true, last_active_at: new Date().toISOString() })
      .eq("user_id", userId);

    router.push("/dashboard");
  };

  const handleSkipEnroll = async () => {
    if (!userId) return;

    await supabase
      .from("profiles")
      .update({ is_online: true, last_active_at: new Date().toISOString() })
      .eq("user_id", userId);

    router.push("/dashboard");
  };

  return (
    <div className="flex flex-col items-center gap-8">
      {/* Branding */}
      <div className="flex flex-col items-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary shadow-lg shadow-primary/25">
          <Timer className="h-8 w-8 text-primary-foreground" />
        </div>
        <div className="text-center">
          <h1 className="text-3xl font-bold text-foreground">
            Apex<span className="text-primary">Time</span>
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Biometric-gated time tracking
          </p>
        </div>
      </div>

      {/* Step: Credentials */}
      {step === "credentials" && (
        <div className="w-full rounded-xl border border-border bg-card/80 p-8 shadow-xl shadow-black/10 backdrop-blur-sm">
          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Your password"
                required
              />
            </div>
            {error && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}
            <Button type="submit" disabled={loading} className="mt-2 w-full gap-2">
              <LogIn className="h-4 w-4" />
              {loading ? "Signing in..." : "Sign In"}
            </Button>
          </form>
        </div>
      )}

      {/* Step: Enroll Face (first time) */}
      {step === "enroll" && (
        <div className="w-full rounded-xl border border-border bg-card/80 p-8 shadow-xl shadow-black/10 backdrop-blur-sm">
          <div className="mb-4 flex flex-col items-center gap-2">
            <ScanFace className="h-8 w-8 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Set Up Face Recognition</h2>
            <p className="text-center text-sm text-muted-foreground">
              This is your first login. Please capture your face for future logins.
            </p>
          </div>
          <EnrollFace onEnroll={handleEnroll} />
          <div className="mt-4 flex justify-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSkipEnroll}
              className="gap-2 text-muted-foreground"
            >
              <SkipForward className="h-4 w-4" />
              Skip for now
            </Button>
          </div>
        </div>
      )}

      {/* Step: Verify Face (returning user) */}
      {step === "verify" && storedDescriptor && (
        <div className="w-full rounded-xl border border-border bg-card/80 p-8 shadow-xl shadow-black/10 backdrop-blur-sm">
          <div className="mb-4 flex flex-col items-center gap-2">
            <ScanFace className="h-8 w-8 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Verify Your Identity</h2>
            <p className="text-center text-sm text-muted-foreground">
              Look at the camera to verify your face
            </p>
          </div>
          <FaceGate storedDescriptor={storedDescriptor} onVerified={handleVerified} />
        </div>
      )}

      <div className="flex items-center gap-4">
        <p className="text-xs text-muted-foreground">ApexTime v1.0</p>
        <ThemeToggle />
      </div>
    </div>
  );
}
