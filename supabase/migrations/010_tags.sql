-- Feature 4: Multi-Tag System
-- Replace single category with flexible multi-tag support

-- Create tags table (similar to categories)
CREATE TABLE IF NOT EXISTS tags (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#8b5cf6',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, name)
);

-- Create junction table for many-to-many relationship
CREATE TABLE IF NOT EXISTS task_tags (
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE NOT NULL,
  tag_id UUID REFERENCES tags(id) ON DELETE CASCADE NOT NULL,
  PRIMARY KEY (task_id, tag_id)
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_tags_user ON tags(user_id);
CREATE INDEX IF NOT EXISTS idx_task_tags_task ON task_tags(task_id);
CREATE INDEX IF NOT EXISTS idx_task_tags_tag ON task_tags(tag_id);

-- Enable RLS on new tables
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_tags ENABLE ROW LEVEL SECURITY;

-- RLS policies for tags table
CREATE POLICY "Users can view their own tags" ON tags 
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own tags" ON tags 
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own tags" ON tags 
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own tags" ON tags 
  FOR DELETE USING (auth.uid() = user_id);

-- RLS policies for task_tags table
CREATE POLICY "Users can view their task_tags" ON task_tags 
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM tasks WHERE tasks.id = task_tags.task_id AND tasks.user_id = auth.uid())
  );
CREATE POLICY "Users can insert their task_tags" ON task_tags 
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM tasks WHERE tasks.id = task_tags.task_id AND tasks.user_id = auth.uid())
  );
CREATE POLICY "Users can delete their task_tags" ON task_tags 
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM tasks WHERE tasks.id = task_tags.task_id AND tasks.user_id = auth.uid())
  );

-- Migrate existing categories to tags
-- This copies category data to the new tags table
INSERT INTO tags (id, user_id, name, color, created_at)
SELECT id, user_id, name, color, created_at 
FROM categories
ON CONFLICT (user_id, name) DO NOTHING;

-- Migrate task-category relationships to task_tags
INSERT INTO task_tags (task_id, tag_id)
SELECT id, category_id 
FROM tasks 
WHERE category_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- Note: category_id column will be kept for backward compatibility initially
-- Can be dropped in a future migration after verification:
-- ALTER TABLE tasks DROP COLUMN category_id;
