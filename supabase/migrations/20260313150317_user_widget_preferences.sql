-- Add widget-specific columns to the existing user_preferences table
ALTER TABLE public.user_preferences 
ADD COLUMN IF NOT EXISTS widget_layout JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS weather_location JSONB DEFAULT null,
ADD COLUMN IF NOT EXISTS crypto_coins JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS anime_tracked JSONB DEFAULT '[]'::jsonb;
