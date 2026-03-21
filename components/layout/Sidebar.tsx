"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  ClipboardCheck,
  FolderKanban,
  BarChart3,
  Building2,
  Activity,
  Timer,
  ClipboardList,
} from "lucide-react";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import type { Role } from "@/lib/types/database";

interface NavItem {
  label: string;
  href: string;
  roles: Role[];
  icon: React.ComponentType<{ className?: string }>;
}

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", roles: ["employee", "pm", "admin", "tester"], icon: LayoutDashboard },
  { label: "Team", href: "/pm/team", roles: ["pm"], icon: Users },
  { label: "Approvals", href: "/pm/approvals", roles: ["pm"], icon: ClipboardCheck },
  { label: "Projects", href: "/pm/projects", roles: ["pm"], icon: FolderKanban },
  { label: "Overview", href: "/admin", roles: ["admin"], icon: Activity },
  { label: "Users", href: "/admin/users", roles: ["admin"], icon: Users },
  { label: "Departments", href: "/admin/departments", roles: ["admin"], icon: Building2 },
  { label: "Projects", href: "/admin/projects", roles: ["admin"], icon: FolderKanban },
  { label: "Tasks", href: "/admin/tasks", roles: ["admin"], icon: ClipboardList },
  { label: "Tasks", href: "/dashboard/tasks", roles: ["tester"], icon: ClipboardList },
  { label: "Reports", href: "/admin/reports", roles: ["admin"], icon: BarChart3 },
];

interface SidebarProps {
  role: Role;
}

export function Sidebar({ role }: SidebarProps) {
  const pathname = usePathname();
  const filteredItems = navItems.filter((item) => item.roles.includes(role));

  return (
    <aside className="flex h-screen w-64 flex-col border-r border-border bg-card">
      {/* Logo */}
      <div className="flex h-16 items-center gap-2 px-8">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
          <Timer className="h-4 w-4 text-primary-foreground" />
        </div>
        <Link href="/dashboard" className="text-xl font-bold text-foreground">
          Apex<span className="text-primary">Time</span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex flex-1 flex-col gap-1 px-4 py-4">
        <p className="mb-2 px-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Menu
        </p>
        {filteredItems.map((item) => {
          const isExactRoute = item.href === "/admin" || item.href === "/dashboard";
          const isActive = isExactRoute
            ? pathname === item.href
            : pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-4 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                isActive
                  ? "bg-primary/15 text-primary shadow-sm"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              }`}
            >
              <Icon className={`h-4 w-4 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-border px-4 py-4">
        <p className="text-xs text-muted-foreground">ApexTime v1.0</p>
        <ThemeToggle />
      </div>
    </aside>
  );
}
