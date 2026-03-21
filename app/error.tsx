"use client";

import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-900">
      <div className="flex flex-col items-center gap-4 text-center">
        <h2 className="text-xl font-bold text-slate-100">Something went wrong</h2>
        <p className="text-sm text-slate-400">{error.message}</p>
        <Button onClick={reset}>Try again</Button>
      </div>
    </div>
  );
}
