-- Time Logs table
CREATE TABLE time_logs (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid REFERENCES profiles(user_id) ON DELETE CASCADE,
  project_id uuid REFERENCES projects(id),
  clock_in   timestamptz NOT NULL DEFAULT now(),
  clock_out  timestamptz,
  notes      text,
  approved   boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE time_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "employee_own_time_logs" ON time_logs
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "pm_dept_time_logs" ON time_logs
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

CREATE POLICY "pm_approve_dept_time_logs" ON time_logs
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
        AND profiles.dept_id = (
          SELECT dept_id FROM profiles WHERE user_id = time_logs.user_id
        )
        AND profiles.role = 'pm'
    )
  );

CREATE POLICY "admin_all_time_logs" ON time_logs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid() AND profiles.role = 'admin'
    )
  );
