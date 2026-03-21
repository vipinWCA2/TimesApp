-- Activity Pings table (60s mouse position logging)
CREATE TABLE activity_pings (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid REFERENCES profiles(user_id) ON DELETE CASCADE,
  time_log_id uuid REFERENCES time_logs(id) ON DELETE CASCADE,
  mouse_x    integer,
  mouse_y    integer,
  is_idle    boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE activity_pings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "employee_own_pings" ON activity_pings
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "pm_dept_pings" ON activity_pings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
        AND profiles.role = 'pm'
        AND profiles.dept_id = (
          SELECT dept_id FROM profiles WHERE user_id = activity_pings.user_id
        )
    )
  );

CREATE POLICY "admin_all_pings" ON activity_pings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid() AND profiles.role = 'admin'
    )
  );
