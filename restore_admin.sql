-- RESTORE ADMIN USER
-- This script will insure the admin user exists and is active.

INSERT INTO public.users (email, name, role, status, phone, password)
VALUES (
    'admin@telemim.com', 
    'Admin Silva', 
    'Administrador', 
    'Ativo', 
    '(11) 99999-1000', 
    '123'
)
ON CONFLICT (email) DO UPDATE 
SET 
    status = 'Ativo',
    role = 'Administrador',
    password = '123';
