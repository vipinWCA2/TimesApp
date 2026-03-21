-- Screenshots table (stores small base64 thumbnails for activity tracking)
CREATE TABLE screenshots (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid REFERENCES profiles(user_id) ON DELETE CASCADE,
  time_log_id uuid REFERENCES time_logs(id) ON DELETE CASCADE,
  task_id     uuid REFERENCES tasks(id) ON DELETE SET NULL,
  thumbnail   text NOT NULL,
  created_at  timestamptz DEFAULT now()
);

CREATE INDEX idx_screenshots_user_id ON screenshots(user_id);
CREATE INDEX idx_screenshots_time_log_id ON screenshots(time_log_id);
