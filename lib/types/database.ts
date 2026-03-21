export type Role = "admin" | "pm" | "employee" | "tester";

export interface Department {
  id: string;
  name: string;
}

export interface Profile {
  user_id: string;
  full_name: string;
  role: Role;
  dept_id: string | null;
  face_descriptor: number[] | null;
  is_online: boolean;
  last_active_at: string | null;
  created_at: string;
}

export interface Project {
  id: string;
  name: string;
  dept_id: string | null;
  pm_id: string | null;
  created_at: string;
}

export interface TimeLog {
  id: string;
  user_id: string;
  project_id: string | null;
  task_id: string | null;
  clock_in: string;
  clock_out: string | null;
  notes: string | null;
  approved: boolean;
  created_at: string;
}

export type TaskStatus = "pending" | "in_progress" | "on_hold" | "testing" | "completed";
export type TaskPriority = "low" | "medium" | "high";

export interface Task {
  id: string;
  title: string;
  description: string | null;
  project_id: string | null;
  assigned_to: string | null;
  assigned_by: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  estimated_hours: number | null;
  actual_hours: number | null;
  due_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface ActivityPing {
  id: string;
  user_id: string;
  time_log_id: string;
  mouse_x: number | null;
  mouse_y: number | null;
  is_idle: boolean;
  created_at: string;
}
