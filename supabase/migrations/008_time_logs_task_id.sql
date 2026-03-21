-- Link time logs to specific tasks
ALTER TABLE time_logs ADD COLUMN task_id uuid REFERENCES tasks(id) ON DELETE SET NULL;
CREATE INDEX idx_time_logs_task_id ON time_logs(task_id);
