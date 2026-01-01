-- Add name columns to user_preferences
ALTER TABLE user_preferences 
ADD COLUMN IF NOT EXISTS first_name TEXT,
ADD COLUMN IF NOT EXISTS last_name TEXT;

-- Refresh schema cache
NOTIFY pgrst, 'reload config';
