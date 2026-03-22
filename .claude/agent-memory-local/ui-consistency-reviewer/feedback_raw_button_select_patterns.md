---
name: Raw button and select element patterns in ApexTime
description: Specific files and contexts where raw HTML button/select elements appear instead of shadcn/ui components
type: feedback
---

Raw `<button>` and `<select>` elements recur in these specific contexts across the codebase.

**Raw `<button>` — acceptable vs flagged:**
- Toggle/expand-collapse interactive wrappers (e.g. accordion-like rows in `TeamActivity`, `TeamYearlyActivity`, `ActivityProgress`) — these wrap large content regions, not just text. shadcn/ui `Button` is technically usable but these are more like `<div role="button">` patterns.
- Icon-only destructive row actions (delete icon in table rows): `admin/projects/page.tsx` line 181, `admin/tasks/page.tsx` line 247 — should use `<Button variant="ghost" size="icon">` from shadcn/ui.
- Tab navigation buttons in `widget/page.tsx` lines 513 and 529 — should use shadcn/ui `Tabs` component.
- Sign-out icon button in `widget/page.tsx` line 458 — should use `<Button variant="ghost" size="icon">`.
- `ThemeToggle.tsx` mode buttons — acceptable as micro-interaction custom control.

**Raw `<select>` — all flagged:**
- `admin/projects/page.tsx` lines 213 and 226 — Department and PM selects inside Dialog. shadcn/ui `Select` is already imported on this page for other uses. Replace with `<Select>`.
- `admin/tasks/page.tsx` lines 353, 366, 381 — Project, Assign To, Priority selects inside Dialog. Same situation — `Select` not used here but shadcn/ui `Select` is available. Replace all three.

**Why:** The raw `<select>` pattern in dialogs is inconsistent with the rest of the codebase which uses shadcn/ui `<Select>` correctly (e.g., `admin/users/[id]/page.tsx`, `ProjectSelector.tsx`). The raw buttons in tables lack accessible focus rings and hover state consistency.

**How to apply:** Any time a new dialog or table is written, require shadcn/ui `Select` for all dropdowns and `Button variant="ghost" size="icon"` for icon-only row actions.
