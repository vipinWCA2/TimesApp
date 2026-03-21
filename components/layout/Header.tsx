"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { GlobalTimer } from "@/components/timer/GlobalTimer";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut, ChevronDown } from "lucide-react";

interface HeaderProps {
  fullName: string;
  role: string;
}

export function Header({ fullName, role }: HeaderProps) {
  const router = useRouter();

  const handleSignOut = async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase
        .from("profiles")
        .update({ is_online: false })
        .eq("user_id", user.id);
    }
    await supabase.auth.signOut();
    router.push("/login");
  };

  const initials = fullName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-card/50 px-8 backdrop-blur-sm">
      <GlobalTimer />
      <div className="flex items-center gap-4">
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-4 rounded-lg px-2 py-1 transition-colors hover:bg-accent">
            <div className="text-right">
              <p className="text-sm font-medium text-foreground">{fullName}</p>
              <p className="text-xs capitalize text-muted-foreground">{role}</p>
            </div>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 text-sm font-semibold text-primary ring-1 ring-primary/30">
              {initials}
            </div>
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={handleSignOut} className="gap-2 text-destructive focus:text-destructive">
              <LogOut className="h-4 w-4" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
