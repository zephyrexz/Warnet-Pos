-- ⚠️⚠️⚠️ RESET DATABASE - HAPUS SEMUA DATA ⚠️⚠️⚠️
-- WARNING: Script ini akan menghapus SEMUA data di database!
-- BACKUP database sebelum menjalankan script ini!
-- Jalankan dengan SANGAT HATI-HATI!

-- ==================================================
-- STEP 1: DROP ALL TABLES, TRIGGERS, AND FUNCTIONS
-- ==================================================

-- Drop all triggers first
drop trigger if exists on_auth_user_created on auth.users;
drop trigger if exists update_profiles_updated_at on profiles;
drop trigger if exists update_computers_updated_at on computers;
drop trigger if exists update_products_updated_at on products;
drop trigger if exists update_reservations_updated_at on reservations;

-- Drop all functions
drop function if exists public.handle_new_user() cascade;
drop function if exists public.repair_missing_profiles() cascade;
drop function if exists update_updated_at() cascade;
drop function if exists start_computer_session cascade;
drop function if exists stop_computer_session cascade;
drop function if exists process_pos_checkout cascade;

-- Drop all sequences
drop sequence if exists invoice_seq cascade;
drop sequence if exists member_number_seq cascade;

-- Drop all tables in reverse dependency order
drop table if exists audit_logs cascade;
drop table if exists notifications cascade;
drop table if exists wallet_transactions cascade;
drop table if exists loyalty_point_transactions cascade;
drop table if exists vouchers cascade;
drop table if exists maintenance_tickets cascade;
drop table if exists expenses cascade;
drop table if exists cashier_shifts cascade;
drop table if exists sale_items cascade;
drop table if exists sales cascade;
drop table if exists suppliers cascade;
drop table if exists inventory_movements cascade;
drop table if exists products cascade;
drop table if exists product_categories cascade;
drop table if exists reservations cascade;
drop table if exists computer_sessions cascade;
drop table if exists billing_plans cascade;
drop table if exists computers cascade;
drop table if exists customers cascade;
drop table if exists membership_tiers cascade;
drop table if exists app_settings cascade;
drop table if exists profiles cascade;

-- Drop all types
drop type if exists inventory_movement_type cascade;
drop type if exists maintenance_status cascade;
drop type if exists payment_status cascade;
drop type if exists payment_method cascade;
drop type if exists reservation_status cascade;
drop type if exists billing_type cascade;
drop type if exists computer_status cascade;
drop type if exists user_role cascade;

-- Success message
do $$
begin
  raise notice '✅ Step 1 completed: All tables, triggers, and functions dropped';
end $$;

-- ==================================================
-- STEP 2: RECREATE SCHEMA FROM INITIAL MIGRATION
-- ==================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Enable RLS
alter default privileges revoke execute on functions from public;

-- Create enum types
create type user_role as enum ('OWNER', 'ADMIN', 'CASHIER', 'TECHNICIAN', 'CUSTOMER');
create type computer_status as enum ('AVAILABLE', 'RESERVED', 'IN_USE', 'MAINTENANCE', 'DISABLED');
create type billing_type as enum ('PREPAID', 'POSTPAID');
create type reservation_status as enum ('PENDING', 'CONFIRMED', 'CHECKED_IN', 'COMPLETED', 'CANCELLED', 'EXPIRED', 'NO_SHOW');
create type payment_method as enum ('CASH', 'QRIS', 'TRANSFER', 'WALLET');
create type payment_status as enum ('PENDING', 'PAID', 'FAILED', 'VOIDED', 'REFUNDED', 'PARTIALLY_REFUNDED');
create type maintenance_status as enum ('OPEN', 'IN_PROGRESS', 'WAITING_PARTS', 'RESOLVED', 'CLOSED');
create type inventory_movement_type as enum ('IN', 'OUT', 'ADJUSTMENT', 'SALE', 'PURCHASE', 'REFUND');

-- Profiles table
create table profiles (
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

-- RLS for profiles
alter table profiles enable row level security;
create policy "Users can view own profile" on profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on profiles for update using (auth.uid() = id);
create policy "Staff can view all profiles" on profiles for select using (
  exists (select 1 from profiles where id = auth.uid() and role in ('OWNER', 'ADMIN', 'CASHIER'))
);
create policy "profiles_insert_authenticated" on profiles
  for insert to authenticated with check (auth.uid() = id);
create policy "profiles_insert_service_role" on profiles
  for insert to service_role with check (true);

-- App settings
create table app_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references profiles(id)
);

alter table app_settings enable row level security;
create policy "Anyone can read settings" on app_settings for select using (true);
create policy "Only owner can update settings" on app_settings for update using (
  exists (select 1 from profiles where id = auth.uid() and role = 'OWNER')
);
create policy "Only owner can insert settings" on app_settings for insert with check (
  exists (select 1 from profiles where id = auth.uid() and role = 'OWNER')
);

-- Membership tiers
create table membership_tiers (
  id uuid primary key default uuid_generate_v4(),
  name text not null unique,
  min_points integer not null default 0,
  discount_percent numeric(5,2) not null default 0,
  benefits jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table membership_tiers enable row level security;
create policy "Anyone can read active tiers" on membership_tiers for select using (is_active = true);
create policy "Staff can manage tiers" on membership_tiers for insert with check (
  exists (select 1 from profiles where id = auth.uid() and role in ('OWNER', 'ADMIN'))
);
create policy "Staff can update tiers" on membership_tiers for update using (
  exists (select 1 from profiles where id = auth.uid() and role in ('OWNER', 'ADMIN'))
);
create policy "Staff can delete tiers" on membership_tiers for delete using (
  exists (select 1 from profiles where id = auth.uid() and role in ('OWNER', 'ADMIN'))
);

-- Customers (extends profiles)
create table customers (
  id uuid primary key references profiles(id) on delete cascade,
  member_number text unique not null,
  membership_tier_id uuid references membership_tiers(id),
  total_points integer not null default 0,
  wallet_balance numeric(12,2) not null default 0 check (wallet_balance >= 0),
  created_at timestamptz not null default now()
);

alter table customers enable row level security;
create policy "Customers can view own data" on customers for select using (auth.uid() = id);
create policy "Staff can view all customers" on customers for select using (
  exists (select 1 from profiles where id = auth.uid() and role in ('OWNER', 'ADMIN', 'CASHIER'))
);
create policy "customers_insert_authenticated" on customers
  for insert to authenticated with check (auth.uid() = id);
create policy "customers_insert_service_role" on customers
  for insert to service_role with check (true);

-- Computers
create table computers (
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

alter table computers enable row level security;
create policy "Anyone can view active computers" on computers for select using (is_active = true);
create policy "Staff can manage computers" on computers for insert with check (
  exists (select 1 from profiles where id = auth.uid() and role in ('OWNER', 'ADMIN', 'CASHIER', 'TECHNICIAN'))
);
create policy "Staff can update computers" on computers for update using (
  exists (select 1 from profiles where id = auth.uid() and role in ('OWNER', 'ADMIN', 'CASHIER', 'TECHNICIAN'))
);
create policy "Staff can delete computers" on computers for delete using (
  exists (select 1 from profiles where id = auth.uid() and role in ('OWNER', 'ADMIN'))
);

-- Billing plans
create table billing_plans (
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

alter table billing_plans enable row level security;
create policy "Anyone can view active plans" on billing_plans for select using (is_active = true);
create policy "Staff can manage plans" on billing_plans for insert with check (
  exists (select 1 from profiles where id = auth.uid() and role in ('OWNER', 'ADMIN'))
);
create policy "Staff can update plans" on billing_plans for update using (
  exists (select 1 from profiles where id = auth.uid() and role in ('OWNER', 'ADMIN'))
);

-- Computer sessions
create table computer_sessions (
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
  created_at timestamptz not null default now(),
  constraint no_overlap unique (computer_id, started_at) deferrable initially deferred
);

alter table computer_sessions enable row level security;
create policy "Customers can view own sessions" on computer_sessions for select using (auth.uid() = customer_id);
create policy "Staff can view all sessions" on computer_sessions for select using (
  exists (select 1 from profiles where id = auth.uid() and role in ('OWNER', 'ADMIN', 'CASHIER'))
);
create policy "Staff can manage sessions" on computer_sessions for insert with check (
  exists (select 1 from profiles where id = auth.uid() and role in ('OWNER', 'ADMIN', 'CASHIER'))
);
create policy "Staff can update sessions" on computer_sessions for update using (
  exists (select 1 from profiles where id = auth.uid() and role in ('OWNER', 'ADMIN', 'CASHIER'))
);

-- Reservations
create table reservations (
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

alter table reservations enable row level security;
create policy "Customers can view own reservations" on reservations for select using (auth.uid() = customer_id);
create policy "Customers can create reservations" on reservations for insert with check (auth.uid() = customer_id);
create policy "Customers can cancel own reservations" on reservations for update using (
  auth.uid() = customer_id and status in ('PENDING', 'CONFIRMED')
);
create policy "Staff can view all reservations" on reservations for select using (
  exists (select 1 from profiles where id = auth.uid() and role in ('OWNER', 'ADMIN', 'CASHIER'))
);
create policy "Staff can manage reservations" on reservations for update using (
  exists (select 1 from profiles where id = auth.uid() and role in ('OWNER', 'ADMIN', 'CASHIER'))
);

-- Product categories
create table product_categories (
  id uuid primary key default uuid_generate_v4(),
  name text not null unique,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table product_categories enable row level security;
create policy "Anyone can view active categories" on product_categories for select using (is_active = true);
create policy "Staff can manage categories" on product_categories for insert with check (
  exists (select 1 from profiles where id = auth.uid() and role in ('OWNER', 'ADMIN', 'CASHIER'))
);
create policy "Staff can update categories" on product_categories for update using (
  exists (select 1 from profiles where id = auth.uid() and role in ('OWNER', 'ADMIN', 'CASHIER'))
);

-- Products
create table products (
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

alter table products enable row level security;
create policy "Anyone can view active products" on products for select using (is_active = true);
create policy "Staff can manage products" on products for insert with check (
  exists (select 1 from profiles where id = auth.uid() and role in ('OWNER', 'ADMIN', 'CASHIER'))
);
create policy "Staff can update products" on products for update using (
  exists (select 1 from profiles where id = auth.uid() and role in ('OWNER', 'ADMIN', 'CASHIER'))
);

-- Inventory movements
create table inventory_movements (
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

alter table inventory_movements enable row level security;
create policy "Staff can view movements" on inventory_movements for select using (
  exists (select 1 from profiles where id = auth.uid() and role in ('OWNER', 'ADMIN', 'CASHIER'))
);
create policy "Staff can create movements" on inventory_movements for insert with check (
  exists (select 1 from profiles where id = auth.uid() and role in ('OWNER', 'ADMIN', 'CASHIER'))
);

-- Suppliers
create table suppliers (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  contact_person text,
  phone text,
  email text,
  address text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table suppliers enable row level security;
create policy "Staff can view suppliers" on suppliers for select using (
  exists (select 1 from profiles where id = auth.uid() and role in ('OWNER', 'ADMIN', 'CASHIER'))
);
create policy "Staff can manage suppliers" on suppliers for insert with check (
  exists (select 1 from profiles where id = auth.uid() and role in ('OWNER', 'ADMIN'))
);
create policy "Staff can update suppliers" on suppliers for update using (
  exists (select 1 from profiles where id = auth.uid() and role in ('OWNER', 'ADMIN'))
);

-- Sales
create table sales (
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

alter table sales enable row level security;
create policy "Customers can view own sales" on sales for select using (auth.uid() = customer_id);
create policy "Staff can view all sales" on sales for select using (
  exists (select 1 from profiles where id = auth.uid() and role in ('OWNER', 'ADMIN', 'CASHIER'))
);
create policy "Staff can create sales" on sales for insert with check (
  exists (select 1 from profiles where id = auth.uid() and role in ('OWNER', 'ADMIN', 'CASHIER'))
);

-- Sale items
create table sale_items (
  id uuid primary key default uuid_generate_v4(),
  sale_id uuid not null references sales(id) on delete cascade,
  product_id uuid not null references products(id),
  product_name text not null,
  quantity integer not null,
  unit_price numeric(12,2) not null,
  subtotal numeric(12,2) not null,
  created_at timestamptz not null default now()
);

alter table sale_items enable row level security;
create policy "Customers can view own sale items" on sale_items for select using (
  exists (select 1 from sales where id = sale_id and customer_id = auth.uid())
);
create policy "Staff can view all sale items" on sale_items for select using (
  exists (select 1 from profiles where id = auth.uid() and role in ('OWNER', 'ADMIN', 'CASHIER'))
);
create policy "Staff can create sale items" on sale_items for insert with check (
  exists (select 1 from profiles where id = auth.uid() and role in ('OWNER', 'ADMIN', 'CASHIER'))
);

-- Cashier shifts
create table cashier_shifts (
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

alter table cashier_shifts enable row level security;
create policy "Cashiers can view own shifts" on cashier_shifts for select using (auth.uid() = cashier_id);
create policy "Cashiers can manage own shifts" on cashier_shifts for insert with check (auth.uid() = cashier_id);
create policy "Cashiers can update own shifts" on cashier_shifts for update using (auth.uid() = cashier_id);
create policy "Owners can view all shifts" on cashier_shifts for select using (
  exists (select 1 from profiles where id = auth.uid() and role in ('OWNER', 'ADMIN'))
);

-- Expenses
create table expenses (
  id uuid primary key default uuid_generate_v4(),
  category text not null,
  amount numeric(12,2) not null,
  description text not null,
  date date not null default current_date,
  receipt_url text,
  created_by uuid not null references profiles(id),
  created_at timestamptz not null default now()
);

alter table expenses enable row level security;
create policy "Staff can view expenses" on expenses for select using (
  exists (select 1 from profiles where id = auth.uid() and role in ('OWNER', 'ADMIN', 'CASHIER'))
);
create policy "Staff can create expenses" on expenses for insert with check (
  exists (select 1 from profiles where id = auth.uid() and role in ('OWNER', 'ADMIN', 'CASHIER'))
);

-- Maintenance tickets
create table maintenance_tickets (
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

alter table maintenance_tickets enable row level security;
create policy "Staff can view tickets" on maintenance_tickets for select using (
  exists (select 1 from profiles where id = auth.uid() and role in ('OWNER', 'ADMIN', 'CASHIER', 'TECHNICIAN'))
);
create policy "Staff can create tickets" on maintenance_tickets for insert with check (
  exists (select 1 from profiles where id = auth.uid() and role in ('OWNER', 'ADMIN', 'CASHIER', 'TECHNICIAN'))
);
create policy "Technicians can update assigned tickets" on maintenance_tickets for update using (
  auth.uid() = technician_id or exists (select 1 from profiles where id = auth.uid() and role in ('OWNER', 'ADMIN'))
);

-- Vouchers
create table vouchers (
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

alter table vouchers enable row level security;
create policy "Anyone can view active vouchers" on vouchers for select using (
  is_active = true and now() between valid_from and valid_until
);
create policy "Staff can manage vouchers" on vouchers for insert with check (
  exists (select 1 from profiles where id = auth.uid() and role in ('OWNER', 'ADMIN'))
);
create policy "Staff can update vouchers" on vouchers for update using (
  exists (select 1 from profiles where id = auth.uid() and role in ('OWNER', 'ADMIN'))
);

-- Loyalty point transactions
create table loyalty_point_transactions (
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

alter table loyalty_point_transactions enable row level security;
create policy "Customers can view own points" on loyalty_point_transactions for select using (auth.uid() = customer_id);
create policy "Staff can view all points" on loyalty_point_transactions for select using (
  exists (select 1 from profiles where id = auth.uid() and role in ('OWNER', 'ADMIN', 'CASHIER'))
);

-- Wallet transactions
create table wallet_transactions (
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

alter table wallet_transactions enable row level security;
create policy "Customers can view own wallet" on wallet_transactions for select using (auth.uid() = customer_id);
create policy "Staff can view all wallets" on wallet_transactions for select using (
  exists (select 1 from profiles where id = auth.uid() and role in ('OWNER', 'ADMIN', 'CASHIER'))
);

-- Notifications
create table notifications (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles(id) on delete cascade,
  title text not null,
  message text not null,
  type text not null,
  is_read boolean not null default false,
  metadata jsonb,
  created_at timestamptz not null default now()
);

alter table notifications enable row level security;
create policy "Users can view own notifications" on notifications for select using (auth.uid() = user_id);
create policy "Users can update own notifications" on notifications for update using (auth.uid() = user_id);

-- Audit logs
create table audit_logs (
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

alter table audit_logs enable row level security;
create policy "Only owners can view audit logs" on audit_logs for select using (
  exists (select 1 from profiles where id = auth.uid() and role = 'OWNER')
);

-- Success message
do $$
begin
  raise notice '✅ Step 2 completed: All tables recreated with RLS policies';
end $$;

-- ==================================================
-- STEP 3: CREATE FUNCTIONS AND TRIGGERS
-- ==================================================

-- Sequence for member numbers
create sequence if not exists member_number_seq start 1;

-- Sequence for invoice numbers
create sequence if not exists invoice_seq start 1;

-- Function: Update timestamp
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Apply update triggers
create trigger update_profiles_updated_at before update on profiles for each row execute procedure update_updated_at();
create trigger update_computers_updated_at before update on computers for each row execute procedure update_updated_at();
create trigger update_products_updated_at before update on products for each row execute procedure update_updated_at();
create trigger update_reservations_updated_at before update on reservations for each row execute procedure update_updated_at();

-- Function: Create profile on signup (with username conflict resolution)
create or replace function public.handle_new_user()
returns trigger as $$
declare
  v_member_number text;
  v_profile_exists boolean;
  v_username text;
  v_username_suffix integer;
begin
  -- Check if profile already exists (idempotency)
  select exists(select 1 from public.profiles where id = new.id) into v_profile_exists;
  
  if v_profile_exists then
    return new;
  end if;
  
  -- Generate member number
  v_member_number := 'MBR-' || lpad(nextval('member_number_seq')::text, 8, '0');
  
  -- Handle username conflicts by appending suffix if needed
  v_username := coalesce(new.raw_user_meta_data->>'username', null);
  
  if v_username is not null then
    v_username_suffix := 0;
    -- Check if username exists and find available one
    while exists(select 1 from public.profiles where username = v_username) loop
      v_username_suffix := v_username_suffix + 1;
      v_username := (new.raw_user_meta_data->>'username') || v_username_suffix::text;
      -- Safety limit to prevent infinite loop
      if v_username_suffix > 999 then
        v_username := null;
        exit;
      end if;
    end loop;
  end if;
  
  -- Insert profile with conflict-safe username
  insert into public.profiles (id, email, full_name, username, phone, role)
  values (
    new.id, 
    new.email, 
    coalesce(new.raw_user_meta_data->>'full_name', 'User'),
    v_username,
    coalesce(new.raw_user_meta_data->>'phone', null),
    'CUSTOMER'
  );
  
  -- Insert customer record
  insert into public.customers (id, member_number)
  values (new.id, v_member_number);
  
  return new;
exception
  when unique_violation then
    -- Handle any remaining unique constraint violations
    raise warning 'Unique constraint violation creating profile for user %: %', new.id, sqlerrm;
    -- Try again without username
    insert into public.profiles (id, email, full_name, username, phone, role)
    values (
      new.id, 
      new.email, 
      coalesce(new.raw_user_meta_data->>'full_name', 'User'),
      null, -- Skip username to avoid conflict
      coalesce(new.raw_user_meta_data->>'phone', null),
      'CUSTOMER'
    )
    on conflict (id) do nothing;
    
    insert into public.customers (id, member_number)
    values (new.id, v_member_number)
    on conflict (id) do nothing;
    
    return new;
  when others then
    -- Log the actual error for debugging
    raise warning 'Failed to create profile for user %: % (SQLSTATE: %)', new.id, sqlerrm, sqlstate;
    -- Re-raise to prevent silent failures
    raise;
end;
$$ language plpgsql security definer set search_path = public;

-- Trigger
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Function: Repair missing profiles
create or replace function public.repair_missing_profiles()
returns table(user_id uuid, email text, status text) as $$
declare
  v_user record;
  v_member_number text;
  v_username text;
  v_username_suffix integer;
begin
  -- Find auth users without profiles
  for v_user in 
    select au.id, au.email, au.raw_user_meta_data
    from auth.users au
    left join public.profiles p on p.id = au.id
    where p.id is null
    order by au.created_at
  loop
    begin
      v_member_number := 'MBR-' || lpad(nextval('member_number_seq')::text, 8, '0');
      
      -- Handle username conflicts
      v_username := coalesce(v_user.raw_user_meta_data->>'username', null);
      
      if v_username is not null then
        v_username_suffix := 0;
        while exists(select 1 from public.profiles where username = v_username) loop
          v_username_suffix := v_username_suffix + 1;
          v_username := (v_user.raw_user_meta_data->>'username') || v_username_suffix::text;
          if v_username_suffix > 999 then
            v_username := null;
            exit;
          end if;
        end loop;
      end if;
      
      insert into public.profiles (id, email, full_name, username, phone, role)
      values (
        v_user.id,
        v_user.email,
        coalesce(v_user.raw_user_meta_data->>'full_name', 'User'),
        v_username,
        coalesce(v_user.raw_user_meta_data->>'phone', null),
        'CUSTOMER'
      );
      
      insert into public.customers (id, member_number)
      values (v_user.id, v_member_number);
      
      user_id := v_user.id;
      email := v_user.email;
      status := 'success';
      return next;
    exception
      when others then
        user_id := v_user.id;
        email := v_user.email;
        status := 'failed: ' || sqlerrm;
        return next;
    end;
  end loop;
end;
$$ language plpgsql security definer set search_path = public;

-- Grant execute on repair function
grant execute on function public.repair_missing_profiles to service_role;

-- Grant sequence usage
grant usage on sequence member_number_seq to authenticated;
grant usage on sequence member_number_seq to service_role;
grant usage on sequence invoice_seq to authenticated;
grant usage on sequence invoice_seq to service_role;

-- Success message
do $$
begin
  raise notice '✅ Step 3 completed: Functions and triggers created';
end $$;

-- ==================================================
-- STEP 4: ADD INDEXES FOR PERFORMANCE
-- ==================================================

-- Indexes for username and email
create index if not exists idx_profiles_username on profiles(username) where username is not null;
create unique index if not exists idx_profiles_email_unique on profiles(lower(email));

-- Success message
do $$
begin
  raise notice '✅ Step 4 completed: Performance indexes added';
end $$;

-- ==================================================
-- STEP 5: INSERT DEFAULT DATA
-- ==================================================

-- Insert default membership tiers
insert into membership_tiers (name, min_points, discount_percent, benefits) values
('Regular', 0, 0, '{"features": ["Basic membership"]}'),
('Silver', 100, 5, '{"features": ["5% discount", "Priority support"]}'),
('Gold', 500, 10, '{"features": ["10% discount", "Priority support", "Free 1 hour monthly"]}'),
('Platinum', 1000, 15, '{"features": ["15% discount", "Priority support", "Free 2 hours monthly", "Birthday bonus"]}');

-- Insert default settings
insert into app_settings (key, value) values
('warnet_name', '"CyberPOS Warnet"'),
('warnet_address', '"Jl. Contoh No. 123, Jakarta"'),
('warnet_phone', '"021-12345678"'),
('warnet_email', '"info@cyberpos.com"'),
('timezone', '"Asia/Jakarta"'),
('currency', '"IDR"'),
('tax_enabled', 'false'),
('tax_rate', '0');

-- Success message
do $$
begin
  raise notice '✅ Step 5 completed: Default data inserted';
end $$;

-- ==================================================
-- FINAL MESSAGE
-- ==================================================

do $$
begin
  raise notice '==============================================';
  raise notice '✅✅✅ DATABASE RESET COMPLETED ✅✅✅';
  raise notice '==============================================';
  raise notice '';
  raise notice 'Summary:';
  raise notice '- All tables, triggers, and functions recreated';
  raise notice '- RLS policies configured';
  raise notice '- Trigger handle_new_user() active';
  raise notice '- Repair function available';
  raise notice '- Default membership tiers inserted';
  raise notice '- Default app settings inserted';
  raise notice '';
  raise notice 'Next steps:';
  raise notice '1. Test registrasi akun baru';
  raise notice '2. Verifikasi profil otomatis dibuat';
  raise notice '3. Test login dengan akun baru';
  raise notice '';
  raise notice 'Database is now CLEAN and READY!';
  raise notice '==============================================';
end $$;
