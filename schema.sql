-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- USERS TABLE
create table public.users (
  id uuid default uuid_generate_v4() primary key,
  email text unique not null,
  name text not null,
  role text not null check (role in ('Administrador', 'Coordenador', 'Supervisor', 'Motorista', 'Van')),
  status text default 'Ativo',
  phone text,
  admission_date date default current_date,
  avatar_url text
  -- Note: Password auth should be handled by Supabase Auth, but for this simple migration we might keep a password field if not using Auth yet.
  -- For better security, use Supabase Auth. For this demo preserving "password" column as plain text is risky but matches current app logic. 
  -- Ideally, migrating to Supabase Auth is better. 
  -- I will include a 'password' column here just to match the current mock logic, but recommend Auth later.
  , password text
);

-- RESIDENTS TABLE
create table public.residents (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  seal text,
  phone text,
  origin_street text,
  origin_number text,
  origin_neighborhood text,
  origin_city text,
  destination_street text,
  destination_number text,
  destination_neighborhood text,
  destination_city text,
  notes text,
  total_moves int default 0,
  last_move_date date,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- HELPERS TABLE
create table public.helpers (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  pix_key text,
  active boolean default true
);

-- MOVES TABLE
create table public.moves (
  id uuid default uuid_generate_v4() primary key,
  -- Use a text ID for display like 'OS-001' or generate it? 
  -- The app uses 'OS-xxx'. We can keep a display_id or just use UUIDs.
  -- Let's keep UUID for primary key and maybe a serial or manual field for OS ID if needed.
  -- For now, we will map the app's 'id' to this uuid.
  
  resident_id uuid references public.residents(id),
  resident_name text, -- Denormalized for ease, or always join
  
  origin_address text,
  destination_address text,
  date date,
  time time, -- or text
  status text default 'Pendente', -- Enum: Pendente, Aprovado, Em Rota, Concluído
  items_volume numeric,
  estimated_cost numeric,
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  
  -- Staff assignments
  coordinator_id uuid references public.users(id),
  supervisor_id uuid references public.users(id),
  driver_id uuid references public.users(id),
  van_id uuid references public.users(id),
  
  -- Confirmations
  driver_confirmation text default 'PENDING',
  van_confirmation text default 'PENDING',
  
  -- Volume Validation
  volume_validation_status text,
  contested_volume numeric,
  contestation_notes text
);

-- LOGS TABLE
create table public.logs (
  id uuid default uuid_generate_v4() primary key,
  timestamp timestamp with time zone default timezone('utc'::text, now()),
  user_id uuid references public.users(id),
  user_name text,
  action text,
  details text
);

-- FINANCIAL RECORDS
create table public.financial_records (
  id uuid default uuid_generate_v4() primary key,
  type text not null check (type in ('income', 'expense')),
  amount numeric not null,
  description text,
  date date,
  category text,
  status text default 'Pendente'
);

-- OPERATIONAL RECORDS (Daily summaries)
create table public.operational_records (
  id uuid default uuid_generate_v4() primary key,
  date date,
  supervisor_id uuid references public.users(id),
  driver_id uuid references public.users(id),
  total_trips int default 0,
  total_lunches int default 0,
  helper_names text[], -- Array of strings
  cost_truck numeric,
  cost_helpers numeric,
  cost_supervisor numeric,
  cost_lunch numeric,
  total_cost numeric
);

-- OUTPUT SOME MOCK DATA (Optional, just for initial setup)
-- Users
INSERT INTO public.users (email, name, role, status, phone, password) VALUES 
('admin@telemim.com', 'Admin Silva', 'Administrador', 'Ativo', '(11) 99999-1000', '123'),
('carlos@telemim.com', 'Carlos Motorista', 'Motorista', 'Ativo', '(11) 98888-2000', '123'),
('julia@telemim.com', 'Julia Coord', 'Coordenador', 'Ativo', '(11) 97777-3000', '123'),
('marcos@telemim.com', 'Marcos Supervisor', 'Supervisor', 'Ativo', '(11) 96666-4000', '123');

-- ATTENDANCE TABLE
create table public.attendance (
  id uuid default uuid_generate_v4() primary key,
  date date not null,
  helper_id uuid references public.helpers(id),
  is_present boolean default false,
  recorded_by uuid references public.users(id),
  recorded_by_name text,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  unique(date, helper_id)
);

-- NOTIFICATIONS TABLE
create table public.notifications (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users(id),
  title text,
  message text,
  is_read boolean default false,
  timestamp timestamp with time zone default timezone('utc'::text, now()),
  type text default 'info'
);

-- SETTINGS TABLE (Single row intended)
create table public.settings (
  id int primary key default 1,
  truck_first_trip numeric,
  truck_additional_trip numeric,
  helper_base numeric,
  helper_additional_trip numeric,
  supervisor_daily numeric,
  lunch_unit_cost numeric,
  constraint single_row check (id = 1)
);

INSERT INTO public.settings (id, truck_first_trip, truck_additional_trip, helper_base, helper_additional_trip, supervisor_daily, lunch_unit_cost)
VALUES (1, 270.00, 110.00, 50.00, 25.00, 100.00, 20.00)
ON CONFLICT (id) DO NOTHING;

