-- Feature 3: Task Hierarchy
-- Allow tasks to have parent-child relationships for nested organization

-- Add parent_task_id for hierarchy (self-referencing foreign key)
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS parent_task_id UUID REFERENCES tasks(id) ON DELETE CASCADE;

-- Add depth field to track nesting level (0 = top-level, 1 = child, 2 = grandchild)
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS depth INTEGER DEFAULT 0;

-- Add flag to control whether child tasks appear independently in timeline
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS show_children_in_timeline BOOLEAN DEFAULT FALSE;

-- Create index for efficient parent lookups
CREATE INDEX IF NOT EXISTS idx_tasks_parent ON tasks(parent_task_id) WHERE parent_task_id IS NOT NULL;

-- Add constraint to limit depth to 2 levels max (parent -> child -> grandchild)
ALTER TABLE tasks ADD CONSTRAINT tasks_depth_check CHECK (depth >= 0 AND depth <= 2);

-- Migrate existing subtasks to child tasks
-- This should be run separately after the main schema changes are applied
-- INSERT INTO tasks (user_id, title, completed, parent_task_id, depth, created_at)
-- SELECT user_id, title, completed, task_id, 1, created_at
-- FROM subtasks;

-- Note: The subtasks table will be deprecated but not dropped immediately
-- to allow for a gradual migration and data verification
