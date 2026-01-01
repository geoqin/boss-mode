-- Add recurrence column to tasks table
ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS recurrence TEXT CHECK (recurrence IN ('daily', 'weekly', 'monthly'));

-- Refresh the schema cache (optional, PostgREST usually handles this)
NOTIFY pgrst, 'reload config';
