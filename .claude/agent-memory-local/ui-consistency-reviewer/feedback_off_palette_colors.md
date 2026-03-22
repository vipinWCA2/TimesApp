---
name: Off-palette color usage patterns in ApexTime
description: Recurring off-palette color patterns across the codebase — semantic status colors, error states, priority indicators
type: feedback
---

The Indigo/Slate-only palette rule is violated throughout the codebase with a consistent semantic color system. Understanding what each off-palette color represents helps prioritize fixes.

**Semantic status colors (green/amber/red) — used as a system:**
- `green-*`: online presence, active sessions, success states, face enrollment confirmed
- `amber-*`: warnings, pending approvals, medium alert states
- `red-*`: errors, destructive actions, high-priority indicators
- `violet-*`: secondary metric category in stats cards (e.g., "Projects" count)
- `orange-*`: "on hold" task status column dot
- `cyan-*`: "testing" task status column dot

These appear in: every stats card grid, ClockInPanel active state, TeamActivity, widget/page.tsx, approvals, users, tasks board.

**Hard rule violations (not even semantic justification):**
- `text-white` and `text-white/60` in `components/activity/ActivityProgress.tsx` lines 250 and 256 — screenshot overlay caption text. Should be `text-slate-100` and `text-slate-400`.
- `bg-blue-100 text-blue-700` in `app/dashboard/MyTasks.tsx` line 37 — light-mode medium priority badge classes. These are the light-mode half of a dark:... conditional. The light-mode half uses `bg-blue-100 text-blue-700` which would be visible without dark mode active. Needs replacement.
- `text-yellow-400` in `app/admin/users/[id]/page.tsx` line 176 — "No face descriptor enrolled" text. Should be `text-amber-400` (which itself is off-palette, but at least consistent with the semantic system used elsewhere).
- `bg-green-600` (solid green background, not a tint) in `admin/users/page.tsx` lines 140 and 147, `pm/team/page.tsx` line 100 — Badge backgrounds. Should be `bg-green-500/15` tint with `text-green-400` to match the pattern used in `RecentLogs.tsx`.

**Why:** The semantic color system (green/amber/red for status) is used so pervasively that it appears intentional. However, `text-white`, `bg-blue-100`, `text-blue-700`, and `bg-green-600` are genuinely inconsistent with even the semantic system used in the rest of the app.

**How to apply:** Correct the hard violations first. Raise with user whether the semantic status color system (green/amber/red) should be formalized as an approved exception to the Indigo/Slate palette, or replaced with tinted indigo/slate variants.
