-- Migration: Add child_task_completions table for recurring parent tasks
-- This table tracks individual completions for child tasks per parent instance date
-- When parent task is recurring, child task completions are tracked instance-by-instance
-- When parent task is ongoing, child tasks use regular completed field (persistent)

CREATE TABLE IF NOT EXISTS child_task_completions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  child_task_id UUID REFERENCES tasks(id) ON DELETE CASCADE NOT NULL,
  parent_task_id UUID REFERENCES tasks(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  instance_date DATE NOT NULL,           -- Which parent occurrence (YYYY-MM-DD)
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(child_task_id, instance_date)   -- One completion record per child per parent instance
);

-- Enable Row Level Security
ALTER TABLE child_task_completions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view their child completions" ON child_task_completions;
CREATE POLICY "Users can view their child completions" ON child_task_completions
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their child completions" ON child_task_completions;
CREATE POLICY "Users can insert their child completions" ON child_task_completions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their child completions" ON child_task_completions;
CREATE POLICY "Users can delete their child completions" ON child_task_completions
  FOR DELETE USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_child_completions_child_id ON child_task_completions(child_task_id);
CREATE INDEX IF NOT EXISTS idx_child_completions_parent_id ON child_task_completions(parent_task_id);
CREATE INDEX IF NOT EXISTS idx_child_completions_user_date ON child_task_completions(user_id, instance_date);
CREATE INDEX IF NOT EXISTS idx_child_completions_instance_date ON child_task_completions(instance_date);
