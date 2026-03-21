# ApexTime — Full Application Documentation

## Overview

ApexTime is a biometric-gated desktop time-tracking application for a 13-person organization. Built as a web app (Next.js 15) wrapped in a native desktop shell (Neutralinojs), backed by Supabase. Employees must pass a live face-recognition check (score > 0.90) before they can clock in.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15 (App Router), Tailwind CSS, shadcn/ui |
| Desktop Shell | Neutralinojs (wraps web app in native window) |
| Backend / Database | Supabase (PostgreSQL + Auth + Realtime) |
| Biometrics | face-api.js (SSD MobileNet V1) |
| State Management | Zustand (global timer persists across routes) |
| Screenshots | html2canvas (captures app window every 5 min) |
| Theme | next-themes (dark/light mode) |

---

## User Roles

| Role | Count | Access |
|---|---|---|
| Admin | 1 | Full global read/write on all tables |
| Project Manager (PM) | 2 | Restricted to own department via RLS |
| Employee | 10 | Restricted to own data only |
| Tester | — | Can move tasks to "completed" status |

---

## Login Flow

```
User opens app
  ↓
Step 1: Email + Password authentication (Supabase Auth)
  ↓
Step 2: Check webcam availability
  ├── No webcam → Skip face, go to dashboard
  └── Webcam available ↓
        ↓
Step 3: Check face_descriptor in profiles table
  ├── No descriptor (first login) → Show EnrollFace camera
  │     ├── User captures face → Save 128-float descriptor to DB
  │     └── User clicks "Skip for now" → Go to dashboard
  └── Has descriptor (returning user) → Show FaceGate camera
        ├── Face matches (score > 0.90) → Go to dashboard
        └── Face doesn't match → Keep trying until match
```

**Important:** Only the 128-float face descriptor is stored. Raw webcam images are NEVER saved anywhere.

---

## Application Routes

### Authentication
| Route | Description |
|---|---|
| `/login` | Email/password + face enrollment/verification |
| `/enroll` | Standalone face enrollment page |

### Employee Dashboard
| Route | Description |
|---|---|
| `/dashboard` | Main dashboard: stats, tasks, activity, logs |
| `/dashboard/tasks` | Full task board (for tester role) |

### Admin Panel
| Route | Description |
|---|---|
| `/admin` | Overview: team stats, department cards |
| `/admin/users` | User management table |
| `/admin/users/[id]` | Edit individual user |
| `/admin/departments` | Department management |
| `/admin/projects` | Create/manage projects |
| `/admin/tasks` | Kanban board: assign tasks with time estimates |
| `/admin/reports` | Payroll reports + CSV export |

### PM Panel
| Route | Description |
|---|---|
| `/pm` | Department overview stats |
| `/pm/team` | Live team status (realtime) |
| `/pm/projects` | Department project hours |
| `/pm/approvals` | Approve/reject time logs |

### Desktop Widget
| Route | Description |
|---|---|
| `/widget` | Compact 420x680 widget: login, tasks, timer |

---

## Task Management Flow

### Admin Creates Tasks
```
Admin → /admin/tasks → "New Task" button
  ↓
Fill form: Title, Description, Project, Assign To, Priority, Estimated Hours, Due Date
  ↓
Task created with status "pending"
```

### Task Status Flow (Kanban Board)
```
┌──────────┐    ┌──────────────┐    ┌──────────┐    ┌──────────┐    ┌──────────────┐
│ PENDING  │ →  │ IN PROGRESS  │ →  │ ON HOLD  │ →  │ TESTING  │ →  │  COMPLETED   │
└──────────┘    └──────────────┘    └──────────┘    └──────────┘    └──────────────┘
```

**Who can move tasks:**
- **Employee** → Can move between: Pending, In Progress, On Hold, Testing (NOT to Completed)
- **Admin / Tester** → Can move to any status including Completed

### Task Timer Flow
```
Employee sees assigned task in "My Tasks" or Widget
  ↓
Clicks "Start Timer" on a specific task
  ↓
Creates time_log entry with task_id + clock_in = now()
  ↓
Timer runs (Zustand store), activity pings every 60s
  ↓
Screenshots captured every 5 minutes (html2canvas)
  ↓
Employee clicks "Stop Timer"
  ↓
Sets clock_out = now(), calculates actual_hours
  ↓
Task appears in "In Progress" on Kanban board
```

---

## Desktop Widget Flow

```
Widget opens (Neutralinojs window, 420x680)
  ↓
Check auth session
  ├── Not logged in → Show compact login form
  └── Logged in ↓
        ↓
Show: User info + "In Progress" tasks + Active timer
  ↓
User can:
  • Start timer on a task → Creates time_log
  • Stop timer → Saves clock_out + actual_hours
  • See task details (project, priority, estimated hours)
  • Timer persists even if widget is closed (Zustand + localStorage)
```

**Widget only shows tasks with status "in_progress".** Completed tasks disappear from widget and only show in dashboard.

---

## Activity Tracking

### What's Tracked
| Data | Interval | Storage |
|---|---|---|
| Mouse position (x, y) | Every 60 seconds | Supabase: activity_pings |
| Idle detection | Every 60 seconds | Supabase: activity_pings |
| Screenshots | Every 5 minutes | IndexedDB (local) + Supabase: screenshots |
| Online status | On login/logout | Supabase: profiles.is_online |
| Last active time | Every 60 seconds | Supabase: profiles.last_active_at |

### How It Works
1. `AppInitializer` mounts in root layout
2. `useActivityTracker` hook runs when timer is active
3. Tracks mouse movement + keyboard activity
4. If no activity for 5 minutes → marks as "idle"
5. Screenshots use `html2canvas` at 40% scale, JPEG 50% quality
6. Screenshots saved to both IndexedDB (instant) and Supabase (remote)

### Where Activity Shows
- **Employee Dashboard** → Activity %, Today hours, Week hours, Active/Idle counts
- **Admin Dashboard** → Team activity overview, individual user activity
- **Admin Reports** → Yearly activity heatmap for all users
- **Screenshots Gallery** → Expandable grid of recent screenshots with timestamps

---

## Database Schema

### profiles
```
user_id (PK)  | full_name | role    | dept_id | face_descriptor | is_online | last_active_at
uuid          | text      | text    | uuid    | float8[]        | boolean   | timestamptz
```

### departments
```
id (PK) | name
uuid    | text (Engineering, Sales, Support)
```

### projects
```
id (PK) | name | dept_id | pm_id | created_at
uuid    | text | uuid    | uuid  | timestamptz
```

### tasks
```
id (PK) | title | description | project_id | assigned_to | assigned_by | status | priority | estimated_hours | actual_hours | due_date | created_at | updated_at
uuid    | text  | text        | uuid       | uuid        | uuid        | text   | text     | numeric(6,2)    | numeric(6,2) | date     | timestamptz | timestamptz
```

Status: `pending` | `in_progress` | `on_hold` | `testing` | `completed`
Priority: `low` | `medium` | `high`

### time_logs
```
id (PK) | user_id | project_id | task_id | clock_in    | clock_out   | notes | approved
uuid    | uuid    | uuid       | uuid    | timestamptz | timestamptz | text  | boolean
```

### activity_pings
```
id (PK) | user_id | time_log_id | mouse_x | mouse_y | is_idle | created_at
uuid    | uuid    | uuid        | integer | integer | boolean | timestamptz
```

### screenshots
```
id (PK) | user_id | time_log_id | task_id | thumbnail | created_at
uuid    | uuid    | uuid        | uuid    | text/bytea | timestamptz
```

---

## File Structure

```
apextime/
├── app/
│   ├── (auth)/login/page.tsx        # Login + face enrollment/verification
│   ├── dashboard/
│   │   ├── page.tsx                 # Employee dashboard
│   │   ├── MyTasks.tsx              # Task list with timer
│   │   ├── RecentLogs.tsx           # Recent time logs
│   │   └── tasks/page.tsx           # Tasks board (tester)
│   ├── admin/
│   │   ├── page.tsx                 # Admin overview
│   │   ├── users/page.tsx           # User management
│   │   ├── departments/page.tsx     # Departments
│   │   ├── projects/page.tsx        # Project CRUD
│   │   ├── tasks/page.tsx           # Kanban task board
│   │   └── reports/page.tsx         # Payroll reports
│   ├── pm/
│   │   ├── page.tsx                 # PM dashboard
│   │   ├── team/page.tsx            # Live team status
│   │   ├── projects/page.tsx        # Dept projects
│   │   └── approvals/page.tsx       # Approve time logs
│   ├── widget/page.tsx              # Desktop widget
│   ├── layout.tsx                   # Root layout
│   └── globals.css                  # Global styles
├── components/
│   ├── biometric/
│   │   ├── FaceGate.tsx             # Face verification (score > 0.90)
│   │   └── EnrollFace.tsx           # Face descriptor capture
│   ├── timer/GlobalTimer.tsx        # Timer display
│   ├── activity/
│   │   ├── ActivityTracker.tsx      # Background activity + screenshots
│   │   ├── ActivityProgress.tsx     # Activity stats + screenshot gallery
│   │   ├── YearlyActivity.tsx       # Year heatmap (user)
│   │   └── TeamYearlyActivity.tsx   # Year heatmap (team)
│   ├── layout/
│   │   ├── DashboardShell.tsx       # Sidebar + header wrapper
│   │   ├── Sidebar.tsx              # Role-based navigation
│   │   └── Header.tsx               # Top bar
│   ├── theme/
│   │   ├── ThemeProvider.tsx        # Dark/light mode
│   │   └── ThemeToggle.tsx          # Toggle button
│   └── ui/                         # shadcn/ui components
├── lib/
│   ├── supabase/
│   │   ├── client.ts               # Browser client
│   │   └── server.ts               # Server client (RSC)
│   ├── store/
│   │   ├── timerStore.ts           # Zustand timer state
│   │   └── activityStore.ts        # Zustand activity state
│   ├── faceapi/
│   │   ├── loadModels.ts           # Load SSD MobileNet V1
│   │   └── matchFace.ts            # Euclidean distance matching
│   ├── hooks/
│   │   ├── useActivityTracker.ts   # Activity + screenshot hook
│   │   ├── useRealtimeProfiles.ts  # Realtime subscriptions
│   │   └── useOnlineStatus.ts      # Online/offline tracking
│   └── types/database.ts          # TypeScript interfaces
├── public/models/                  # face-api.js model weights
├── supabase/migrations/            # SQL migration files (001-009)
├── middleware.ts                   # Auth route protection
├── neutralino.config.json          # Desktop app config
└── CLAUDE.md                       # Project rules
```

---

## Setup & Running

### Development
```bash
cd apextime
npm install          # Install dependencies
npm run dev          # Start Next.js dev server (http://localhost:3000)
```

### Desktop App
```bash
npm install -g @neutralinojs/neu   # Install Neutralino CLI
neu update                          # Download binaries
neu run                             # Launch desktop window
```

### Production Build
```bash
npm run build        # Build Next.js
neu build            # Build desktop executable
```

### Sharing the App
1. Deploy Next.js to Vercel/VPS
2. Update `neutralino.config.json` URL to hosted URL
3. Run `neu build`
4. Share the `.exe` from `dist/` folder

---

## Security Rules

| Rule | Enforcement |
|---|---|
| No raw face images stored | Only 128-float descriptors in `profiles.face_descriptor` |
| Server-side timestamps | `clock_in`/`clock_out` use Supabase `now()`, never client `Date.now()` |
| Face gate required | Clock In disabled until face score > 0.90 |
| Camera cleanup | `track.stop()` called on every unmount |
| RLS on all tables | Row Level Security policies enforce role-based access |
| Minimal native permissions | Only `os.*`, `window.*`, `computer.*` allowed |
| Models bundled locally | face-api.js models in `/public/models/`, never CDN |

---

## CLI Commands

```bash
npm install           # Install dependencies
npm run dev           # Start dev server
npm run build         # Production build
npm test              # Run tests
neu run               # Start desktop app
neu build             # Build desktop executable
neu update            # Download Neutralino binaries
```

---

*ApexTime v1.0 — Generated 2026-03-21*
