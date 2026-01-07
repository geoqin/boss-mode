-- Migration: Add recurring_task_completions table for habit-tracker style recurring tasks
-- This table tracks individual completions for each instance of a recurring task

CREATE TABLE IF NOT EXISTS recurring_task_completions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  instance_date DATE NOT NULL,           -- Which occurrence (YYYY-MM-DD)
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(task_id, instance_date)         -- One completion record per task per day
);

-- Enable Row Level Security
ALTER TABLE recurring_task_completions ENABLE ROW LEVEL SECURITY;

-- RLS Policies (use DROP IF EXISTS + CREATE to avoid conflicts on re-run)
DROP POLICY IF EXISTS "Users can view their completions" ON recurring_task_completions;
CREATE POLICY "Users can view their completions" ON recurring_task_completions
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their completions" ON recurring_task_completions;
CREATE POLICY "Users can insert their completions" ON recurring_task_completions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their completions" ON recurring_task_completions;
CREATE POLICY "Users can delete their completions" ON recurring_task_completions
  FOR DELETE USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_completions_task_id ON recurring_task_completions(task_id);
CREATE INDEX IF NOT EXISTS idx_completions_user_date ON recurring_task_completions(user_id, instance_date);
CREATE INDEX IF NOT EXISTS idx_completions_instance_date ON recurring_task_completions(instance_date);
