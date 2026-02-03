-- Migration: Convert existing subtasks to child tasks (hierarchy system)
-- This migration copies data from the legacy 'subtasks' table into the 'tasks' table
-- as child tasks with proper parent_task_id relationships.

-- Step 1: Migrate existing subtasks to child tasks
INSERT INTO tasks (user_id, title, completed, parent_task_id, depth, created_at)
SELECT 
    user_id, 
    title, 
    completed, 
    task_id AS parent_task_id,  -- The subtask's task_id becomes the parent reference
    1 AS depth,                  -- Depth 1 = first level child
    created_at
FROM subtasks
ON CONFLICT DO NOTHING;  -- Prevent duplicate inserts if run multiple times

-- Step 2: Verify migration (optional - can be run separately to check)
-- SELECT COUNT(*) as migrated_count FROM tasks WHERE depth = 1;
-- SELECT COUNT(*) as original_count FROM subtasks;

-- Note: The subtasks table is kept for backup purposes.
-- To clean up after verifying successful migration:
-- DROP TABLE IF EXISTS subtasks;
