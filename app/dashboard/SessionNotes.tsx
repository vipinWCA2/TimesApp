"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useTimerStore } from "@/lib/store/timerStore";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export function SessionNotes() {
  const [notes, setNotes] = useState("");
  const [saved, setSaved] = useState(false);
  const activeTimeLogId = useTimerStore((s) => s.activeTimeLogId);

  const handleSave = async () => {
    if (!activeTimeLogId) return;
    const supabase = createClient();

    await supabase
      .from("time_logs")
      .update({ notes })
      .eq("id", activeTimeLogId);

    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="flex flex-col gap-2">
      <Label>Session Notes</Label>
      <Textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="What are you working on?"
        className="min-h-24 resize-none"
      />
      <Button variant="secondary" size="sm" onClick={handleSave}>
        {saved ? "Saved!" : "Save Notes"}
      </Button>
    </div>
  );
}
