-- UPDATE FINANCIAL SETTINGS
-- Update Van/Truck daily cost to R$ 450.00

INSERT INTO public.settings (id, truck_first_trip, truck_additional_trip, helper_base, helper_additional_trip, supervisor_daily, lunch_unit_cost)
VALUES (1, 450.00, 110.00, 50.00, 25.00, 100.00, 20.00)
ON CONFLICT (id) DO UPDATE
SET truck_first_trip = 450.00;
