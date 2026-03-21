-- Tasks table — admin assigns tasks to employees with time estimates
CREATE TABLE tasks (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title       text NOT NULL,
  description text,
  project_id  uuid REFERENCES projects(id) ON DELETE CASCADE,
  assigned_to uuid REFERENCES profiles(user_id) ON DELETE SET NULL,
  assigned_by uuid REFERENCES profiles(user_id),
  status      text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
  priority    text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  estimated_hours numeric(6,2),
  actual_hours    numeric(6,2),
  due_date    date,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

-- Index for fast lookups
CREATE INDEX idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX idx_tasks_project_id ON tasks(project_id);
CREATE INDEX idx_tasks_status ON tasks(status);
