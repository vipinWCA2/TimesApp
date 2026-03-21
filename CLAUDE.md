# CLAUDE.md — ApexTime

This file defines the project rules, architecture, and constraints for the **ApexTime** time-tracking desktop application. Claude must follow every rule in this document when generating, editing, or reviewing code.

---

## Project Overview

ApexTime is a biometric-gated, desktop time-tracking application for a 13-person organization. It is built as a web app (Next.js) wrapped in a native desktop shell (Neutralinojs) and backed by Supabase. Employees must pass a live face-recognition check (score > 0.90) before they can clock in.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15 (App Router), Tailwind CSS, shadcn/ui |
| Desktop Bridge | Neutralinojs — native OS access via `window.Neutralino` |
| Backend / Database | Supabase (PostgreSQL + Auth + Realtime) |
| AI / Biometrics | `face-api.js` (SSD MobileNet V1 model) |
| State Management | Zustand (global timer — must persist across route changes) |

---

## Organization Structure

| Role | Count | Access Scope |
|---|---|---|
| Super Admin | 1 | Full global read/write on all tables |
| Project Manager (PM) | 2 | Restricted to own `dept_id` via PostgreSQL RLS |
| Employee | 10 | Restricted to own `user_id` data only |

**Departments:** Engineering · Sales · Support (3 distinct units)

---

## Engineering & UI Standards

### Spacing
- Use the **strict 8px Tailwind spacing scale** at all times.
- Allowed classes: `p-2`, `p-4`, `p-8`, `m-4`, `gap-8`, `w-16`, etc.
- Never use arbitrary values like `p-[13px]` or `mt-[22px]`.

### Theme
- **Dark mode by default.** All components must be dark-mode-first.
- Color palette: **Indigo / Slate** only.
  - Primary actions: `indigo-500` / `indigo-600`
  - Backgrounds: `slate-900`, `slate-800`, `slate-700`
  - Text: `slate-100`, `slate-400`
  - Borders: `slate-700`, `slate-600`

### Component Library
- Use **shadcn/ui** for all UI primitives (Button, Input, Dialog, Table, etc.).
- Do not build custom primitives when a shadcn/ui component exists.

### State Management
- The global countdown/elapsed timer **must** use **Zustand**.
- The Zustand store must be initialized outside of any React component so it persists through route changes.
- Timer state shape (minimum):
  ```ts
  interface TimerStore {
    isRunning: boolean
    startedAt: string | null   // ISO string from Supabase now()
    elapsedSeconds: number
    startTimer: (startedAt: string) => void
    stopTimer: () => void
    tick: () => void
  }
  ```

---

## Biometric Gate — Critical Rules

1. The **"Clock In" button MUST be `disabled`** until `face-api.js` returns a match with score **> 0.90**.
2. Load the SSD MobileNet V1 model from `/public/models/` (bundled locally — never from a CDN at runtime).
3. Run detection in a `requestAnimationFrame` loop, not `setInterval`.
4. **Always call `track.stop()`** on every `MediaStreamTrack` when the biometric component unmounts. Failure to do so wastes CPU and holds the camera open.
   ```ts
   useEffect(() => {
     return () => {
       streamRef.current?.getTracks().forEach(track => track.stop())
     }
   }, [])
   ```
5. Only use `euclideanDistance(descriptor1, descriptor2)` to compute the match score. Distance < 0.1 corresponds to a score > 0.90 — map accordingly.

---

## Security & Privacy Rules

### Face Data
- **NEVER upload or store raw webcam images** — not in Supabase Storage, not in any database column, not in logs.
- Only store the **128-float `Float32Array` face descriptor** (serialized as a `float8[]` or `jsonb` array) in the `profiles` table.
- Column name: `profiles.face_descriptor` (`float8[]`, nullable).

### Timestamp Integrity
- **Always use `now()` from Postgres/Supabase** for `clock_in` and `clock_out` timestamps.
- **Never use the user's local `Date.now()` or `new Date()`** for time-integrity columns.
- Correct pattern:
  ```sql
  INSERT INTO time_logs (user_id, clock_in) VALUES (auth.uid(), now());
  ```
- In the client, display elapsed time using the Supabase-returned `startedAt` timestamp, not a locally generated one.

### Neutralino Native Permissions
- `neutralino.config.json` must set `nativeAllowList` to **only**:
  ```json
  "nativeAllowList": ["os.*", "window.*", "computer.*"]
  ```
- Do not add `filesystem.*`, `app.*`, or any other namespace unless explicitly approved.

### Row Level Security (RLS)
- RLS must be **enabled** on every Supabase table.
- Policy templates:

  **Employee — own rows only:**
  ```sql
  CREATE POLICY "employee_own" ON time_logs
    FOR ALL USING (user_id = auth.uid());
  ```

  **PM — own department only:**
  ```sql
  CREATE POLICY "pm_dept" ON time_logs
    FOR SELECT USING (
      EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.user_id = auth.uid()
          AND profiles.dept_id = (
            SELECT dept_id FROM profiles WHERE user_id = time_logs.user_id
          )
          AND profiles.role = 'pm'
      )
    );
  ```

  **Admin — unrestricted:**
  ```sql
  CREATE POLICY "admin_all" ON time_logs
    FOR ALL USING (
      EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.user_id = auth.uid() AND profiles.role = 'admin'
      )
    );
  ```

---

## Database Schema (Core Tables)

```sql
-- Profiles (extends Supabase auth.users)
CREATE TABLE profiles (
  user_id        uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name      text NOT NULL,
  role           text NOT NULL CHECK (role IN ('admin', 'pm', 'employee')),
  dept_id        uuid REFERENCES departments(id),
  face_descriptor float8[],          -- 128-element array, NEVER raw image
  created_at     timestamptz DEFAULT now()
);

-- Departments
CREATE TABLE departments (
  id    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name  text NOT NULL UNIQUE  -- 'Engineering' | 'Sales' | 'Support'
);

-- Projects
CREATE TABLE projects (
  id       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name     text NOT NULL,
  dept_id  uuid REFERENCES departments(id),
  pm_id    uuid REFERENCES profiles(user_id)
);

-- Time Logs
CREATE TABLE time_logs (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid REFERENCES profiles(user_id) ON DELETE CASCADE,
  project_id uuid REFERENCES projects(id),
  clock_in   timestamptz NOT NULL DEFAULT now(),  -- always server now()
  clock_out  timestamptz,                          -- always server now()
  notes      text,
  approved   boolean DEFAULT false
);
```

---

## File & Folder Conventions

```
apextime/
├── app/                        # Next.js App Router pages
│   ├── (auth)/login/           # Login + face enrollment
│   ├── dashboard/              # Employee dashboard
│   ├── admin/                  # Super admin panel
│   └── pm/                     # PM panel
├── components/
│   ├── biometric/
│   │   ├── FaceGate.tsx        # Webcam + face-api.js gate component
│   │   └── EnrollFace.tsx      # One-time descriptor capture
│   ├── timer/
│   │   └── GlobalTimer.tsx     # Reads from Zustand store
│   └── ui/                     # shadcn/ui re-exports
├── lib/
│   ├── supabase/
│   │   ├── client.ts           # createBrowserClient()
│   │   └── server.ts           # createServerClient()
│   ├── store/
│   │   └── timerStore.ts       # Zustand timer store
│   └── faceapi/
│       └── loadModels.ts       # Loads SSD MobileNet V1 from /public/models
├── public/
│   └── models/                 # face-api.js model weights (bundled, no CDN)
├── neutralino.config.json
├── CLAUDE.md                   # ← this file
└── supabase/
    └── migrations/             # SQL migration files
```

---

## Common CLI Commands

```bash
# Install dependencies
npm install

# Start Next.js dev server (web only)
npm run dev

# Start desktop app (Neutralinojs wrapping the dev server)
neu run

# Production build
npm run build && neu build

# Run tests
npm test
```

---

## What Claude Must Never Do

| Rule | Reason |
|---|---|
| Store raw face images anywhere | Privacy — descriptors only |
| Use `Date.now()` for clock_in / clock_out | Time integrity — use Supabase `now()` |
| Enable Clock In before face score > 0.90 | Biometric gate must be enforced |
| Forget `track.stop()` on unmount | CPU leak + camera stays open |
| Use arbitrary Tailwind spacing | Breaks 8px design system |
| Expand `nativeAllowList` beyond `os.*`, `window.*`, `computer.*` | Security — minimal native surface |
| Disable RLS on any table | Every table must have RLS enabled |
| Fetch face-api.js models from a CDN at runtime | Must be bundled in `/public/models/` |

---

*Last updated: auto-generated from ApexTime Project Rules v1.0*