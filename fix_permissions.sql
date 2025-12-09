-- DISABLE ROW LEVEL SECURITY to allow all operations
-- Run this in the Supabase SQL Editor

ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.residents DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.moves DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.helpers DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_records DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.operational_records DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings DISABLE ROW LEVEL SECURITY;

-- Just in case, grant permissions to public/anon (standard Supabase roles)
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
