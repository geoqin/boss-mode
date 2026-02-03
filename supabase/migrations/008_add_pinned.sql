-- Feature 2: Pinned Tasks
-- Tasks that always remain visible in the dashboard regardless of completion status

-- Add pinned field to tasks
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS pinned BOOLEAN DEFAULT FALSE;

-- Create index for efficient filtering of pinned tasks
CREATE INDEX IF NOT EXISTS idx_tasks_pinned ON tasks(pinned) WHERE pinned = true;
