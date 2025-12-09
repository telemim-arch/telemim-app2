-- ADD VAN SETTINGS
-- Add columns to settings table for Van cost configuration

ALTER TABLE public.settings 
ADD COLUMN IF NOT EXISTS van_daily numeric default 0,
ADD COLUMN IF NOT EXISTS van_lunch numeric default 0;

-- Update with default values (optional, can be done via UI)
UPDATE public.settings 
SET van_daily = 200.00, van_lunch = 25.00 
WHERE id = 1;
