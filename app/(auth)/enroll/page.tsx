"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { EnrollFace } from "@/components/biometric/EnrollFace";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function EnrollPage() {
  const router = useRouter();
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleEnroll = async (descriptor: number[]) => {
    setStatus("Saving face descriptor...");
    const supabase = createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("Not authenticated");
      return;
    }

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ face_descriptor: descriptor })
      .eq("user_id", user.id);

    if (updateError) {
      setError(updateError.message);
      setStatus(null);
      return;
    }

    setStatus("Face enrolled successfully!");
    setTimeout(() => router.push("/dashboard"), 1500);
  };

  return (
    <Card className="border-slate-700 bg-slate-800">
      <CardHeader className="text-center">
        <CardTitle className="text-xl font-bold text-indigo-500">
          Enroll Your Face
        </CardTitle>
        <p className="text-sm text-slate-400">
          Position your face in the camera and capture your biometric descriptor
        </p>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-4">
        {!status && <EnrollFace onEnroll={handleEnroll} />}
        {status && <p className="text-sm text-green-400">{status}</p>}
        {error && <p className="text-sm text-red-400">{error}</p>}
      </CardContent>
    </Card>
  );
}
