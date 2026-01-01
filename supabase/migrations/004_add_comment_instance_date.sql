-- Migration: Add instance_date to comments for recurring task instances
-- Run this in your Supabase SQL Editor

ALTER TABLE comments ADD COLUMN IF NOT EXISTS instance_date DATE;

-- Create index for efficient querying by instance
CREATE INDEX IF NOT EXISTS idx_comments_instance_date ON comments(task_id, instance_date);
