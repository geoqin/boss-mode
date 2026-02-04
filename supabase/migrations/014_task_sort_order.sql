-- Migration: Add sort_order field for task rearrangement
-- Allows users to manually order tasks within their type groups

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

-- Index for efficient sorting
CREATE INDEX IF NOT EXISTS idx_tasks_sort_order ON tasks(user_id, sort_order);

-- Initialize sort_order based on created_at for existing tasks
UPDATE tasks SET sort_order = EXTRACT(EPOCH FROM created_at)::INTEGER WHERE sort_order = 0;
