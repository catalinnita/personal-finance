-- Add moving_average_period column to user_settings table
ALTER TABLE user_settings 
ADD COLUMN IF NOT EXISTS moving_average_period INTEGER DEFAULT 6;
