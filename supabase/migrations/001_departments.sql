-- Departments table
CREATE TABLE departments (
  id    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name  text NOT NULL UNIQUE
);

-- Seed departments
INSERT INTO departments (name) VALUES ('Engineering'), ('Sales'), ('Support');

-- RLS
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_read_departments" ON departments
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "admin_manage_departments" ON departments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid() AND profiles.role = 'admin'
    )
  );
