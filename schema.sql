-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- USERS TABLE
create table if not exists public.users (
  id uuid default uuid_generate_v4() primary key,
  email text unique not null,
  name text not null,
  role text not null check (role in ('Administrador', 'Coordenador', 'Supervisor', 'Motorista', 'Van')),
  status text default 'Ativo',
  phone text,
  admission_date date default current_date,
  avatar_url text,
  password text
);

-- RESIDENTS TABLE
create table if not exists public.residents (
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
create table if not exists public.helpers (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  pix_key text,
  active boolean default true
);

-- MOVES TABLE
create table if not exists public.moves (
  id uuid default uuid_generate_v4() primary key,
  resident_id uuid references public.residents(id),
  resident_name text,
  origin_address text,
  destination_address text,
  date date,
  time time,
  status text default 'Pendente',
  items_volume numeric,
  estimated_cost numeric,
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  coordinator_id uuid references public.users(id),
  supervisor_id uuid references public.users(id),
  driver_id uuid references public.users(id),
  van_id uuid references public.users(id),
  driver_confirmation text default 'PENDING',
  van_confirmation text default 'PENDING',
  volume_validation_status text,
  contested_volume numeric,
  contestation_notes text
);

-- LOGS TABLE
create table if not exists public.logs (
  id uuid default uuid_generate_v4() primary key,
  timestamp timestamp with time zone default timezone('utc'::text, now()),
  user_id uuid references public.users(id),
  user_name text,
  action text,
  details text
);

-- FINANCIAL RECORDS
create table if not exists public.financial_records (
  id uuid default uuid_generate_v4() primary key,
  type text not null check (type in ('income', 'expense')),
  amount numeric not null,
  description text,
  date date,
  category text,
  status text default 'Pendente'
);

-- OPERATIONAL RECORDS
create table if not exists public.operational_records (
  id uuid default uuid_generate_v4() primary key,
  date date,
  supervisor_id uuid references public.users(id),
  driver_id uuid references public.users(id),
  total_trips int default 0,
  total_lunches int default 0,
  helper_names text[],
  cost_truck numeric,
  cost_helpers numeric,
  cost_supervisor numeric,
  cost_lunch numeric,
  total_cost numeric
);

-- ATTENDANCE TABLE
create table if not exists public.attendance (
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
create table if not exists public.notifications (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users(id),
  title text,
  message text,
  is_read boolean default false,
  timestamp timestamp with time zone default timezone('utc'::text, now()),
  type text default 'info'
);

-- SETTINGS TABLE
create table if not exists public.settings (
  id int primary key default 1,
  truck_first_trip numeric,
  truck_additional_trip numeric,
  helper_base numeric,
  helper_additional_trip numeric,
  supervisor_daily numeric,
  lunch_unit_cost numeric,
  constraint single_row check (id = 1)
);

-- Initial Data
INSERT INTO public.users (email, name, role, status, phone, password) VALUES 
('admin@telemim.com', 'Admin Silva', 'Administrador', 'Ativo', '(11) 99999-1000', '123'),
('carlos@telemim.com', 'Carlos Motorista', 'Motorista', 'Ativo', '(11) 98888-2000', '123'),
('julia@telemim.com', 'Julia Coord', 'Coordenador', 'Ativo', '(11) 97777-3000', '123'),
('marcos@telemim.com', 'Marcos Supervisor', 'Supervisor', 'Ativo', '(11) 96666-4000', '123')
ON CONFLICT (email) DO NOTHING;

INSERT INTO public.settings (id, truck_first_trip, truck_additional_trip, helper_base, helper_additional_trip, supervisor_daily, lunch_unit_cost)
VALUES (1, 450.00, 110.00, 50.00, 25.00, 100.00, 20.00)
ON CONFLICT (id) DO NOTHING;


