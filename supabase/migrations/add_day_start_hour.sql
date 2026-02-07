-- Add day_start_hour to user_preferences
-- This setting controls when the "day" resets (default 6am)
-- Tasks completed between midnight and this hour count as the previous day

ALTER TABLE user_preferences 
ADD COLUMN IF NOT EXISTS day_start_hour INTEGER DEFAULT 6 CHECK (day_start_hour >= 0 AND day_start_hour <= 23);
