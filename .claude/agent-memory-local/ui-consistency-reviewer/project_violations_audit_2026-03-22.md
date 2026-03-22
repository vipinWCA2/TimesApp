---
name: First full codebase audit — 2026-03-22
description: Summary of recurring violation patterns and consistently compliant zones found during the first complete UI audit of ApexTime
type: project
---

Full audit completed 2026-03-22. Key findings:

**Spacing:** Zero arbitrary spacing values found in app code. All spacing uses standard Tailwind scale. Shadcn/ui component internals (badge.tsx, tabs.tsx, dropdown-menu.tsx) contain framework-generated arbitrary values — these are lower priority and acceptable as library internals.

**Theme — recurring off-palette colors (all app code):**
- `green-*`, `amber-*`, `violet-*`, `red-*`, `orange-*`, `cyan-*` used broadly as semantic status colors (online/active/pending/error/priority indicators). These are intentional semantic choices but violate the strict Indigo/Slate palette rule.
- `text-white` and `text-white/60` used in screenshot overlay gradient in `ActivityProgress.tsx`.
- `bg-blue-*` / `text-blue-*` used for "medium" priority badges in `MyTasks.tsx`, `admin/tasks/page.tsx`, and `widget/page.tsx`.
- `text-red-*` used for error states and "high" priority in multiple files.
- `bg-green-600` (not a 500/15 tint) used in Badge components in `admin/users/page.tsx` and `pm/team/page.tsx`.

**Component violations — raw HTML elements where shadcn/ui should be used:**
- Raw `<button>` used as icon-only toggles / expand-collapse triggers in: `ActivityProgress.tsx`, `TeamActivity.tsx`, `TeamYearlyActivity.tsx`, `ThemeToggle.tsx`, `widget/page.tsx` (sign-out, tab buttons), `admin/projects/page.tsx` (delete row icon), `admin/tasks/page.tsx` (delete card icon).
- Raw `<select>` used in dialogs in: `admin/projects/page.tsx` (2 selects), `admin/tasks/page.tsx` (3 selects). shadcn/ui `<Select>` is already imported and used elsewhere in these files.

**Consistently compliant zones:**
- All layout components: `DashboardShell`, `Header`, `Sidebar` — use CSS custom property tokens correctly.
- All auth flows: `login/page.tsx`, `enroll/page.tsx` — proper shadcn/ui usage.
- All biometric components: `FaceGate.tsx`, `EnrollFace.tsx` — clean.
- `ProjectSelector.tsx`, `SessionNotes.tsx`, `GlobalTimer.tsx`, `YearlyActivity.tsx` — clean.
- Loading skeletons, error pages — clean.

**Why:** Palette violations are consistent patterns, not random. The `green/amber/red` trio is used everywhere for status semantics. The raw `<select>` pattern appears specifically in admin dialog forms. These will recur in future features unless addressed at the design token or component level.

**How to apply:** When reviewing new features, immediately flag any `text-green-*`, `text-red-*`, `bg-blue-*`, `text-amber-*` outside of shadcn/ui internals, and any raw `<select>` or `<button>` elements in dialog or table action contexts.
