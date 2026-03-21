-- Projects table
CREATE TABLE projects (
  id       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name     text NOT NULL,
  dept_id  uuid REFERENCES departments(id),
  pm_id    uuid REFERENCES profiles(user_id),
  created_at timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_read_projects" ON projects
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "pm_manage_own_dept_projects" ON projects
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
        AND profiles.role = 'pm'
        AND profiles.dept_id = projects.dept_id
    )
  );

CREATE POLICY "admin_all_projects" ON projects
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid() AND profiles.role = 'admin'
    )
  );
