-- Profiles table (extends Supabase auth.users)
CREATE TABLE profiles (
  user_id         uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name       text NOT NULL,
  role            text NOT NULL CHECK (role IN ('admin', 'pm', 'employee')),
  dept_id         uuid REFERENCES departments(id),
  face_descriptor float8[],
  is_online       boolean DEFAULT false,
  last_active_at  timestamptz,
  created_at      timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_read_own_profile" ON profiles
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "users_update_own_profile" ON profiles
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "pm_read_dept_profiles" ON profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles AS p
      WHERE p.user_id = auth.uid()
        AND p.role = 'pm'
        AND p.dept_id = profiles.dept_id
    )
  );

CREATE POLICY "admin_all_profiles" ON profiles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles AS p
      WHERE p.user_id = auth.uid() AND p.role = 'admin'
    )
  );
