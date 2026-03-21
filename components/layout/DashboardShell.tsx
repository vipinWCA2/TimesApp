"use client";

import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import type { Role } from "@/lib/types/database";

interface DashboardShellProps {
  children: React.ReactNode;
  role: Role;
  fullName: string;
}

export function DashboardShell({ children, role, fullName }: DashboardShellProps) {
  return (
    <div className="flex h-screen bg-background">
      <Sidebar role={role} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header fullName={fullName} role={role} />
        <main className="flex-1 overflow-y-auto bg-background p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
