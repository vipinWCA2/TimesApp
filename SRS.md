# Software Requirements Specification (SRS)

**Project:** ApexTime AI – Desktop Productivity Tracker  
**Tech Stack:** Next.js 15, Neutralinojs, Supabase (PostgreSQL), face-api.js  
**Version:** 1.0  
**Date:** 2026-03-20

---

## 1. Executive Summary

ApexTime is a high-integrity time-tracking application for a 13-person organization (10 Employees, 2 PMs, 1 Admin). It prevents time-theft by requiring Biometric Facial Recognition for all "Clock-In" events and uses Desktop-level Activity Monitoring to track engagement.

---

## 2. System Roles & Data Scope

| Role | Count | Access Scope |
|------|-------|--------------|
| Super Admin | 1 | Access to all 3 departments. Manages user enrollment and global payroll reports. |
| Project Manager | 2 | Access restricted to their specific `dept_id`. Can view live activity of their 3–4 assigned employees. |
| Employee | 10 | Can only view their own logs. Access to the "Start Timer" button is gated by a face-match. |

---

## 3. Functional Requirements

### 3.1 Biometric Gate (Face-ID)

- **FR-1.1 Verification:** Upon clicking "Clock In," the system must capture a 128-float facial descriptor using `face-api.js` and compare it to the `face_descriptor` stored in Supabase.
- **FR-1.2 Threshold:** A Euclidean distance of `< 0.5` is required for a successful match.
- **FR-1.3 Neutralino Integration:** On match, the app must call `Neutralino.window.minimize()` and start the background tracker.

### 3.2 Desktop Activity Tracking

- **FR-2.1 Idle Detection:** The system shall ping `Neutralino.computer.getMousePos()` every 60 seconds.
- **FR-2.2 Auto-Pause:** If coordinates do not change for 300 seconds (5 minutes), the session must be marked as `"Idle"` in the database.
- **FR-2.3 System Tray:** A native tray menu must provide `"Stop Timer"` and `"Current Status"` options.

### 3.3 Data Persistence (Supabase/Postgres)

- **FR-3.1 Real-time Sync:** Every 60 seconds, the app must update the `last_active_at` timestamp in the `profiles` table.
- **FR-3.2 Privacy:** No raw webcam images are to be stored. Only the mathematical `FLOAT8[]` vector is saved.

---

## 4. Database Schema (PostgreSQL / Supabase)

### Table: `profiles`

| Column | Type | Description |
|--------|------|-------------|
| `id` | `uuid` | Primary Key (Auth.users link) |
| `role` | `text` | `'admin'`, `'pm'`, or `'employee'` |
| `dept_id` | `uuid` | Foreign Key to `departments` |
| `face_descriptor` | `float8[]` | 128-bit facial vector |
| `is_online` | `boolean` | Current status indicator |

### Table: `time_logs`

| Column | Type | Description |
|--------|------|-------------|
| `id` | `uuid` | Primary Key |
| `user_id` | `uuid` | Link to `profiles` |
| `start_time` | `timestamptz` | Exact clock-in time |
| `end_time` | `timestamptz` | Exact clock-out time |
| `activity_score` | `int4` | Percentage of active 60s windows |

---

## 5. Security Requirements

- **SR-1 (RLS):** Implement Supabase Row Level Security. PMs must be blocked from querying `profiles` where `dept_id` does not match their own.
- **SR-2 (Native):** Neutralino `nativeAllowList` must be restricted to `os.*`, `window.*`, and `computer.*`.
