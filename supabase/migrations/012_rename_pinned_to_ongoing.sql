-- Rename 'pinned' column to 'ongoing' for better semantics
-- 'Ongoing' tasks are a distinct type that always show in the daily view

ALTER TABLE tasks RENAME COLUMN pinned TO ongoing;

-- Add comment explaining the field
COMMENT ON COLUMN tasks.ongoing IS 'Ongoing tasks always show in daily view regardless of due date or completion status. Used for persistent checklists like groceries.';
