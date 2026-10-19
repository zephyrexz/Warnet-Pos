-- =====================================================
-- RECREATE MISSING TABLES ONLY (SAFE - NO DROP)
-- =====================================================
-- Script ini hanya membuat ulang tabel yang belum ada
-- TIDAK akan menghapus data yang sudah ada
-- Safe untuk dijalankan kapan saja

-- Create types if not exists
do $$ begin
  create type user_role as enum ('OWNER', 'ADMIN', 'CASHIER', 'TECHNICIAN', 'CUSTOMER');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type computer_status as enum ('AVAILABLE', 'RESERVED', 'IN_USE', 'MAINTENANCE', 'DISABLED');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type billing_type as enum ('PREPAID', 'POSTPAID');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type reservation_status as enum ('PENDING', 'CONFIRMED', 'CHECKED_IN', 'COMPLETED', 'CANCELLED', 'EXPIRED', 'NO_SHOW');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type payment_method as enum ('CASH', 'QRIS', 'TRANSFER', 'WALLET');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type payment_status as enum ('PENDING', 'PAID', 'FAILED', 'VOIDED', 'REFUNDED', 'PARTIALLY_REFUNDED');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type maintenance_status as enum ('OPEN', 'IN_PROGRESS', 'WAITING_PARTS', 'RESOLVED', 'CLOSED');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type inventory_movement_type as enum ('IN', 'OUT', 'ADJUSTMENT', 'SALE', 'PURCHASE', 'REFUND');
exception when duplicate_object then null;
end $$;

-- Profiles table (if not exists)
create table if not exists profiles (
  id uuid primary key references auth.users on delete cascade,
  email text unique not null,
  username text unique,
  full_name text not null,
  phone text,
  role user_role not null default 'CUSTOMER',
  avatar_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- App settings
create table if not exists app_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references profiles(id)
);

-- Membership tiers
create table if not exists membership_tiers (
  id uuid primary key default uuid_generate_v4(),
  name text not null unique,
  min_points integer not null default 0,
  discount_percent numeric(5,2) not null default 0,
  benefits jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Customers
create table if not exists customers (
  id uuid primary key references profiles(id) on delete cascade,
  member_number text unique not null,
  membership_tier_id uuid references membership_tiers(id),
  total_points integer not null default 0,
  wallet_balance numeric(12,2) not null default 0 check (wallet_balance >= 0),
  created_at timestamptz not null default now()
);

-- Computers
create table if not exists computers (
  id uuid primary key default uuid_generate_v4(),
  code text not null unique,
  name text not null,
  location text,
  specs jsonb,
  hourly_rate numeric(10,2) not null,
  status computer_status not null default 'AVAILABLE',
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Billing plans
create table if not exists billing_plans (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  billing_type billing_type not null,
  duration_minutes integer,
  price numeric(10,2) not null,
  description text,
  is_active boolean not null default true,
  valid_from timestamptz,
  valid_until timestamptz,
  created_at timestamptz not null default now()
);

-- Computer sessions
create table if not exists computer_sessions (
  id uuid primary key default uuid_generate_v4(),
  computer_id uuid not null references computers(id),
  customer_id uuid references customers(id),
  billing_plan_id uuid references billing_plans(id),
  started_by uuid not null references profiles(id),
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  planned_end_at timestamptz,
  hourly_rate numeric(10,2) not null,
  discount_percent numeric(5,2) not null default 0,
  notes text,
  created_at timestamptz not null default now()
);

-- Reservations
create table if not exists reservations (
  id uuid primary key default uuid_generate_v4(),
  customer_id uuid not null references customers(id),
  computer_id uuid references computers(id),
  start_time timestamptz not null,
  duration_minutes integer not null,
  end_time timestamptz not null,
  estimated_price numeric(10,2) not null,
  status reservation_status not null default 'PENDING',
  notes text,
  cancelled_reason text,
  session_id uuid references computer_sessions(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Product categories
create table if not exists product_categories (
  id uuid primary key default uuid_generate_v4(),
  name text not null unique,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Products
create table if not exists products (
  id uuid primary key default uuid_generate_v4(),
  sku text not null unique,
  barcode text unique,
  name text not null,
  description text,
  category_id uuid references product_categories(id),
  cost_price numeric(12,2) not null,
  sell_price numeric(12,2) not null,
  stock integer not null default 0 check (stock >= 0),
  min_stock integer not null default 0,
  unit text not null default 'pcs',
  image_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Inventory movements
create table if not exists inventory_movements (
  id uuid primary key default uuid_generate_v4(),
  product_id uuid not null references products(id),
  movement_type inventory_movement_type not null,
  quantity integer not null,
  stock_before integer not null,
  stock_after integer not null,
  reference_id uuid,
  reason text,
  created_by uuid not null references profiles(id),
  created_at timestamptz not null default now()
);

-- Suppliers
create table if not exists suppliers (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  contact_person text,
  phone text,
  email text,
  address text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Sales
create table if not exists sales (
  id uuid primary key default uuid_generate_v4(),
  invoice_number text not null unique,
  customer_id uuid references customers(id),
  cashier_id uuid not null references profiles(id),
  session_id uuid references computer_sessions(id),
  subtotal numeric(12,2) not null,
  discount_percent numeric(5,2) not null default 0,
  discount_amount numeric(12,2) not null default 0,
  total numeric(12,2) not null,
  payment_method payment_method not null,
  payment_status payment_status not null default 'PENDING',
  paid_amount numeric(12,2),
  change_amount numeric(12,2),
  notes text,
  created_at timestamptz not null default now()
);

-- Sale items
create table if not exists sale_items (
  id uuid primary key default uuid_generate_v4(),
  sale_id uuid not null references sales(id) on delete cascade,
  product_id uuid not null references products(id),
  product_name text not null,
  quantity integer not null,
  unit_price numeric(12,2) not null,
  subtotal numeric(12,2) not null,
  created_at timestamptz not null default now()
);

-- Cashier shifts
create table if not exists cashier_shifts (
  id uuid primary key default uuid_generate_v4(),
  cashier_id uuid not null references profiles(id),
  opened_at timestamptz not null default now(),
  closed_at timestamptz,
  opening_balance numeric(12,2) not null,
  expected_balance numeric(12,2),
  actual_balance numeric(12,2),
  difference numeric(12,2),
  notes text,
  created_at timestamptz not null default now()
);

-- Expenses
create table if not exists expenses (
  id uuid primary key default uuid_generate_v4(),
  category text not null,
  amount numeric(12,2) not null,
  description text not null,
  date date not null default current_date,
  receipt_url text,
  created_by uuid not null references profiles(id),
  created_at timestamptz not null default now()
);

-- Maintenance tickets
create table if not exists maintenance_tickets (
  id uuid primary key default uuid_generate_v4(),
  ticket_number text not null unique,
  computer_id uuid not null references computers(id),
  title text not null,
  description text not null,
  priority text not null default 'MEDIUM',
  status maintenance_status not null default 'OPEN',
  technician_id uuid references profiles(id),
  reported_by uuid not null references profiles(id),
  reported_at timestamptz not null default now(),
  started_at timestamptz,
  resolved_at timestamptz,
  resolution_notes text,
  cost numeric(10,2),
  created_at timestamptz not null default now()
);

-- Vouchers
create table if not exists vouchers (
  id uuid primary key default uuid_generate_v4(),
  code text not null unique,
  name text not null,
  discount_type text not null check (discount_type in ('PERCENT', 'FIXED')),
  discount_value numeric(10,2) not null,
  max_discount numeric(10,2),
  min_transaction numeric(10,2),
  valid_from timestamptz not null,
  valid_until timestamptz not null,
  usage_limit integer,
  usage_count integer not null default 0,
  per_customer_limit integer,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Loyalty point transactions
create table if not exists loyalty_point_transactions (
  id uuid primary key default uuid_generate_v4(),
  customer_id uuid not null references customers(id),
  points integer not null,
  balance_before integer not null,
  balance_after integer not null,
  transaction_type text not null,
  reference_id uuid,
  description text,
  created_at timestamptz not null default now()
);

-- Wallet transactions
create table if not exists wallet_transactions (
  id uuid primary key default uuid_generate_v4(),
  customer_id uuid not null references customers(id),
  amount numeric(12,2) not null,
  balance_before numeric(12,2) not null,
  balance_after numeric(12,2) not null,
  transaction_type text not null,
  reference_id uuid,
  description text,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

-- Notifications
create table if not exists notifications (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles(id) on delete cascade,
  title text not null,
  message text not null,
  type text not null,
  is_read boolean not null default false,
  metadata jsonb,
  created_at timestamptz not null default now()
);

-- Audit logs
create table if not exists audit_logs (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references profiles(id),
  action text not null,
  table_name text not null,
  record_id uuid,
  old_data jsonb,
  new_data jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz not null default now()
);

-- Success message
do $$
begin
  raise notice '==============================================';
  raise notice '✅ Tables recreated successfully!';
  raise notice '==============================================';
  raise notice 'All missing tables have been created.';
  raise notice 'Existing tables and data are preserved.';
  raise notice '';
  raise notice 'Next: Run migration 20260101000009 to setup:';
  raise notice '- RLS policies';
  raise notice '- Trigger handle_new_user()';
  raise notice '- Indexes';
  raise notice '==============================================';
end $$;
