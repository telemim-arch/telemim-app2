-- FIX RESIDENT DELETION (Error: update or delete on table "residents" violates foreign key constraint "moves_resident_id_fkey")
-- We want to automatically delete moves when a resident is deleted.

ALTER TABLE public.moves
DROP CONSTRAINT IF EXISTS moves_resident_id_fkey;

ALTER TABLE public.moves
ADD CONSTRAINT moves_resident_id_fkey
FOREIGN KEY (resident_id)
REFERENCES public.residents(id)
ON DELETE CASCADE;

-- FIX EMPLOYEE DELETION (Prevent errors when deleting a user/employee)
-- We want to KEEP the records (moves, logs, etc.) but set the user reference to NULL.

-- 1. Moves references
ALTER TABLE public.moves
DROP CONSTRAINT IF EXISTS moves_coordinator_id_fkey,
DROP CONSTRAINT IF EXISTS moves_supervisor_id_fkey,
DROP CONSTRAINT IF EXISTS moves_driver_id_fkey,
DROP CONSTRAINT IF EXISTS moves_van_id_fkey;

ALTER TABLE public.moves
ADD CONSTRAINT moves_coordinator_id_fkey FOREIGN KEY (coordinator_id) REFERENCES public.users(id) ON DELETE SET NULL,
ADD CONSTRAINT moves_supervisor_id_fkey FOREIGN KEY (supervisor_id) REFERENCES public.users(id) ON DELETE SET NULL,
ADD CONSTRAINT moves_driver_id_fkey FOREIGN KEY (driver_id) REFERENCES public.users(id) ON DELETE SET NULL,
ADD CONSTRAINT moves_van_id_fkey FOREIGN KEY (van_id) REFERENCES public.users(id) ON DELETE SET NULL;

-- 2. Logs references (Keep logs even if user is deleted)
ALTER TABLE public.logs
DROP CONSTRAINT IF EXISTS logs_user_id_fkey;

ALTER TABLE public.logs
ADD CONSTRAINT logs_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES public.users(id)
ON DELETE SET NULL;

-- 3. Operational Records references
ALTER TABLE public.operational_records
DROP CONSTRAINT IF EXISTS operational_records_supervisor_id_fkey,
DROP CONSTRAINT IF EXISTS operational_records_driver_id_fkey;

ALTER TABLE public.operational_records
ADD CONSTRAINT operational_records_supervisor_id_fkey FOREIGN KEY (supervisor_id) REFERENCES public.users(id) ON DELETE SET NULL,
ADD CONSTRAINT operational_records_driver_id_fkey FOREIGN KEY (driver_id) REFERENCES public.users(id) ON DELETE SET NULL;

-- 4. Notifications (Delete notifications if user is deleted)
ALTER TABLE public.notifications
DROP CONSTRAINT IF EXISTS notifications_user_id_fkey;

ALTER TABLE public.notifications
ADD CONSTRAINT notifications_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES public.users(id)
ON DELETE CASCADE;
