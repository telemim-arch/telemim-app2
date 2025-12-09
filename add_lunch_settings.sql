-- ADD LUNCH SETTINGS FOR TRUCK AND HELPER
-- Add columns to settings table for Truck and Helper lunch costs

ALTER TABLE public.settings 
ADD COLUMN IF NOT EXISTS truck_lunch numeric default 0,
ADD COLUMN IF NOT EXISTS helper_lunch numeric default 0;

-- Update with default values (optional)
UPDATE public.settings 
SET truck_lunch = 25.00, helper_lunch = 25.00 
WHERE id = 1;
