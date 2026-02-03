-- Feature 1: Custom Recurrence Intervals
-- Expands recurrence options from daily/weekly/monthly to include quarterly, annually, and custom intervals

-- Remove the old constraint
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_recurrence_check;

-- Add new recurrence options
ALTER TABLE tasks 
  ADD CONSTRAINT tasks_recurrence_check 
  CHECK (recurrence IN ('daily', 'weekly', 'fortnightly', 'monthly', 'quarterly', 'annually', 'custom'));

-- Add custom interval field (number of days for custom recurrence)
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS recurrence_interval_days INTEGER;

-- Ensure custom interval is only set when recurrence is 'custom'
-- (This is a soft constraint, enforced in application logic)
