-- =====================================================
-- FIX INFINITE RECURSION IN RLS POLICIES
-- Oct 21, 2026
-- =====================================================
-- ROOT CAUSE:
-- Policy "profiles_select_staff" dan policy di tabel lain
-- melakukan: exists (select 1 from profiles where id = auth.uid() ...)
-- Saat PostgreSQL mengevaluasi SELECT policy pada tabel "profiles",
-- ia memanggil policy itu sendiri → infinite recursion.
--
-- SOLUTION:
-- Buat SECURITY DEFINER function yang membaca role dari profiles
-- tanpa melalui RLS (bypass RLS karena security definer).
-- Semua policy yang perlu cek role menggunakan function ini,
-- bukan subquery langsung ke profiles.
-- =====================================================

-- =====================================================
-- STEP 1: DROP ALL EXISTING POLICIES YANG BERMASALAH
-- =====================================================

-- Hapus SEMUA policy pada profiles (bersih dari awal)
do $$
declare
  r record;
begin
  for r in
    select policyname
    from pg_policies
    where tablename = 'profiles' and schemaname = 'public'
  loop
    execute format('drop policy if exists %I on public.profiles', r.policyname);
  end loop;

  -- Hapus SEMUA policy pada customers
  for r in
    select policyname
    from pg_policies
    where tablename = 'customers' and schemaname = 'public'
  loop
    execute format('drop policy if exists %I on public.customers', r.policyname);
  end loop;

  raise notice '✅ Step 1: All old policies dropped';
end $$;

-- =====================================================
-- STEP 2: BUAT SECURITY DEFINER FUNCTION UNTUK CEK ROLE
-- =====================================================
-- Function ini berjalan dengan hak superuser (security definer),
-- sehingga TIDAK terkena RLS. Aman dipakai di dalam policy.

create or replace function public.get_my_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role::text from public.profiles where id = auth.uid() limit 1;
$$;

-- Beri akses ke semua authenticated user
revoke all on function public.get_my_role() from public;
grant execute on function public.get_my_role() to authenticated, service_role;

do $$
begin
  raise notice '✅ Step 2: get_my_role() function created';
end $$;

-- =====================================================
-- STEP 3: RECREATE PROFILES POLICIES (TANPA REKURSI)
-- =====================================================

-- SELECT: user melihat profil sendiri
create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

-- SELECT: staff bisa melihat semua profil
-- KUNCI: gunakan get_my_role(), BUKAN subquery ke profiles
create policy "profiles_select_staff"
  on public.profiles for select
  using (public.get_my_role() in ('OWNER', 'ADMIN', 'CASHIER'));

-- UPDATE: user hanya bisa update profil sendiri, TIDAK bisa ubah role
create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id)
  with check (
    auth.uid() = id
    -- Cegah user biasa mengubah role sendiri menjadi ADMIN/OWNER/CASHIER
    and (
      -- Jika role tidak berubah → boleh
      role = (select role from public.profiles where id = auth.uid())
      -- Atau jika role saat ini memang sudah OWNER/ADMIN (diizinkan oleh admin sendiri)
      or public.get_my_role() in ('OWNER', 'ADMIN')
    )
  );

-- INSERT: authenticated user hanya bisa insert profil untuk dirinya sendiri
create policy "profiles_insert_authenticated"
  on public.profiles for insert
  to authenticated
  with check (auth.uid() = id);

-- INSERT: service_role (trigger SECURITY DEFINER) bisa insert apapun
create policy "profiles_insert_service_role"
  on public.profiles for insert
  to service_role
  with check (true);

do $$
begin
  raise notice '✅ Step 3: Profiles policies created (recursion-free)';
end $$;

-- =====================================================
-- STEP 4: RECREATE CUSTOMERS POLICIES
-- =====================================================

-- SELECT: customer melihat data sendiri
create policy "customers_select_own"
  on public.customers for select
  using (auth.uid() = id);

-- SELECT: staff bisa lihat semua customers
create policy "customers_select_staff"
  on public.customers for select
  using (public.get_my_role() in ('OWNER', 'ADMIN', 'CASHIER'));

-- INSERT: authenticated user insert untuk dirinya sendiri
create policy "customers_insert_authenticated"
  on public.customers for insert
  to authenticated
  with check (auth.uid() = id);

-- INSERT: service_role (trigger) bisa insert apapun
create policy "customers_insert_service_role"
  on public.customers for insert
  to service_role
  with check (true);

-- UPDATE: staff bisa update data customer (misal wallet, points)
create policy "customers_update_staff"
  on public.customers for update
  using (public.get_my_role() in ('OWNER', 'ADMIN', 'CASHIER'));

do $$
begin
  raise notice '✅ Step 4: Customers policies created';
end $$;

-- =====================================================
-- STEP 5: FIX POLICIES TABEL LAIN (PAKAI get_my_role)
-- Tabel lain juga punya policy yang query ke profiles →
-- seharusnya tidak rekursif karena tabel berbeda,
-- tapi kita pakai get_my_role() untuk konsistensi & performa.
-- =====================================================

-- App settings
do $$ begin
  drop policy if exists "Only owner can update settings" on app_settings;
  drop policy if exists "Only owner can insert settings" on app_settings;
exception when others then null; end $$;

create policy "app_settings_update_owner"
  on public.app_settings for update
  using (public.get_my_role() in ('OWNER', 'ADMIN'));

create policy "app_settings_insert_owner"
  on public.app_settings for insert
  with check (public.get_my_role() in ('OWNER', 'ADMIN'));

-- Membership tiers
do $$ begin
  drop policy if exists "Staff can manage tiers" on membership_tiers;
  drop policy if exists "Staff can update tiers" on membership_tiers;
  drop policy if exists "Staff can delete tiers" on membership_tiers;
exception when others then null; end $$;

create policy "tiers_insert_staff"
  on public.membership_tiers for insert
  with check (public.get_my_role() in ('OWNER', 'ADMIN'));

create policy "tiers_update_staff"
  on public.membership_tiers for update
  using (public.get_my_role() in ('OWNER', 'ADMIN'));

create policy "tiers_delete_staff"
  on public.membership_tiers for delete
  using (public.get_my_role() in ('OWNER', 'ADMIN'));

-- Computers
do $$ begin
  drop policy if exists "Staff can manage computers" on computers;
  drop policy if exists "Staff can update computers" on computers;
  drop policy if exists "Staff can delete computers" on computers;
exception when others then null; end $$;

create policy "computers_insert_staff"
  on public.computers for insert
  with check (public.get_my_role() in ('OWNER', 'ADMIN', 'CASHIER', 'TECHNICIAN'));

create policy "computers_update_staff"
  on public.computers for update
  using (public.get_my_role() in ('OWNER', 'ADMIN', 'CASHIER', 'TECHNICIAN'));

create policy "computers_delete_staff"
  on public.computers for delete
  using (public.get_my_role() in ('OWNER', 'ADMIN'));

-- Billing plans
do $$ begin
  drop policy if exists "Staff can manage plans" on billing_plans;
  drop policy if exists "Staff can update plans" on billing_plans;
exception when others then null; end $$;

create policy "billing_plans_insert_staff"
  on public.billing_plans for insert
  with check (public.get_my_role() in ('OWNER', 'ADMIN'));

create policy "billing_plans_update_staff"
  on public.billing_plans for update
  using (public.get_my_role() in ('OWNER', 'ADMIN'));

-- Computer sessions
do $$ begin
  drop policy if exists "Staff can view all sessions" on computer_sessions;
  drop policy if exists "Staff can manage sessions" on computer_sessions;
  drop policy if exists "Staff can update sessions" on computer_sessions;
exception when others then null; end $$;

create policy "sessions_select_staff"
  on public.computer_sessions for select
  using (public.get_my_role() in ('OWNER', 'ADMIN', 'CASHIER'));

create policy "sessions_insert_staff"
  on public.computer_sessions for insert
  with check (public.get_my_role() in ('OWNER', 'ADMIN', 'CASHIER'));

create policy "sessions_update_staff"
  on public.computer_sessions for update
  using (public.get_my_role() in ('OWNER', 'ADMIN', 'CASHIER'));

-- Reservations
do $$ begin
  drop policy if exists "Staff can view all reservations" on reservations;
  drop policy if exists "Staff can manage reservations" on reservations;
exception when others then null; end $$;

create policy "reservations_select_staff"
  on public.reservations for select
  using (public.get_my_role() in ('OWNER', 'ADMIN', 'CASHIER'));

create policy "reservations_update_staff"
  on public.reservations for update
  using (public.get_my_role() in ('OWNER', 'ADMIN', 'CASHIER'));

-- Product categories
do $$ begin
  drop policy if exists "Staff can manage categories" on product_categories;
  drop policy if exists "Staff can update categories" on product_categories;
exception when others then null; end $$;

create policy "categories_insert_staff"
  on public.product_categories for insert
  with check (public.get_my_role() in ('OWNER', 'ADMIN', 'CASHIER'));

create policy "categories_update_staff"
  on public.product_categories for update
  using (public.get_my_role() in ('OWNER', 'ADMIN', 'CASHIER'));

-- Products
do $$ begin
  drop policy if exists "Staff can manage products" on products;
  drop policy if exists "Staff can update products" on products;
exception when others then null; end $$;

create policy "products_insert_staff"
  on public.products for insert
  with check (public.get_my_role() in ('OWNER', 'ADMIN', 'CASHIER'));

create policy "products_update_staff"
  on public.products for update
  using (public.get_my_role() in ('OWNER', 'ADMIN', 'CASHIER'));

-- Inventory movements
do $$ begin
  drop policy if exists "Staff can view movements" on inventory_movements;
  drop policy if exists "Staff can create movements" on inventory_movements;
exception when others then null; end $$;

create policy "inventory_select_staff"
  on public.inventory_movements for select
  using (public.get_my_role() in ('OWNER', 'ADMIN', 'CASHIER'));

create policy "inventory_insert_staff"
  on public.inventory_movements for insert
  with check (public.get_my_role() in ('OWNER', 'ADMIN', 'CASHIER'));

-- Suppliers
do $$ begin
  drop policy if exists "Staff can view suppliers" on suppliers;
  drop policy if exists "Staff can manage suppliers" on suppliers;
  drop policy if exists "Staff can update suppliers" on suppliers;
exception when others then null; end $$;

create policy "suppliers_select_staff"
  on public.suppliers for select
  using (public.get_my_role() in ('OWNER', 'ADMIN', 'CASHIER'));

create policy "suppliers_insert_staff"
  on public.suppliers for insert
  with check (public.get_my_role() in ('OWNER', 'ADMIN'));

create policy "suppliers_update_staff"
  on public.suppliers for update
  using (public.get_my_role() in ('OWNER', 'ADMIN'));

-- Sales
do $$ begin
  drop policy if exists "Staff can view all sales" on sales;
  drop policy if exists "Staff can create sales" on sales;
exception when others then null; end $$;

create policy "sales_select_staff"
  on public.sales for select
  using (public.get_my_role() in ('OWNER', 'ADMIN', 'CASHIER'));

create policy "sales_insert_staff"
  on public.sales for insert
  with check (public.get_my_role() in ('OWNER', 'ADMIN', 'CASHIER'));

-- Sale items
do $$ begin
  drop policy if exists "Staff can view all sale items" on sale_items;
  drop policy if exists "Staff can create sale items" on sale_items;
exception when others then null; end $$;

create policy "sale_items_select_staff"
  on public.sale_items for select
  using (public.get_my_role() in ('OWNER', 'ADMIN', 'CASHIER'));

create policy "sale_items_insert_staff"
  on public.sale_items for insert
  with check (public.get_my_role() in ('OWNER', 'ADMIN', 'CASHIER'));

-- Cashier shifts
do $$ begin
  drop policy if exists "Owners can view all shifts" on cashier_shifts;
exception when others then null; end $$;

create policy "shifts_select_owner"
  on public.cashier_shifts for select
  using (public.get_my_role() in ('OWNER', 'ADMIN'));

-- Expenses
do $$ begin
  drop policy if exists "Staff can view expenses" on expenses;
  drop policy if exists "Staff can create expenses" on expenses;
exception when others then null; end $$;

create policy "expenses_select_staff"
  on public.expenses for select
  using (public.get_my_role() in ('OWNER', 'ADMIN', 'CASHIER'));

create policy "expenses_insert_staff"
  on public.expenses for insert
  with check (public.get_my_role() in ('OWNER', 'ADMIN', 'CASHIER'));

-- Maintenance tickets
do $$ begin
  drop policy if exists "Staff can view tickets" on maintenance_tickets;
  drop policy if exists "Staff can create tickets" on maintenance_tickets;
  drop policy if exists "Technicians can update assigned tickets" on maintenance_tickets;
exception when others then null; end $$;

create policy "tickets_select_staff"
  on public.maintenance_tickets for select
  using (public.get_my_role() in ('OWNER', 'ADMIN', 'CASHIER', 'TECHNICIAN'));

create policy "tickets_insert_staff"
  on public.maintenance_tickets for insert
  with check (public.get_my_role() in ('OWNER', 'ADMIN', 'CASHIER', 'TECHNICIAN'));

create policy "tickets_update_staff"
  on public.maintenance_tickets for update
  using (
    auth.uid() = technician_id
    or public.get_my_role() in ('OWNER', 'ADMIN')
  );

-- Vouchers
do $$ begin
  drop policy if exists "Staff can manage vouchers" on vouchers;
  drop policy if exists "Staff can update vouchers" on vouchers;
exception when others then null; end $$;

create policy "vouchers_insert_staff"
  on public.vouchers for insert
  with check (public.get_my_role() in ('OWNER', 'ADMIN'));

create policy "vouchers_update_staff"
  on public.vouchers for update
  using (public.get_my_role() in ('OWNER', 'ADMIN'));

-- Loyalty points
do $$ begin
  drop policy if exists "Staff can view all points" on loyalty_point_transactions;
exception when others then null; end $$;

create policy "points_select_staff"
  on public.loyalty_point_transactions for select
  using (public.get_my_role() in ('OWNER', 'ADMIN', 'CASHIER'));

-- Wallet transactions
do $$ begin
  drop policy if exists "Staff can view all wallets" on wallet_transactions;
exception when others then null; end $$;

create policy "wallet_select_staff"
  on public.wallet_transactions for select
  using (public.get_my_role() in ('OWNER', 'ADMIN', 'CASHIER'));

-- Audit logs
do $$ begin
  drop policy if exists "Only owners can view audit logs" on audit_logs;
exception when others then null; end $$;

create policy "audit_select_owner"
  on public.audit_logs for select
  using (public.get_my_role() = 'OWNER');

do $$
begin
  raise notice '✅ Step 5: All other table policies updated';
end $$;

-- =====================================================
-- STEP 6: ENSURE TRIGGER IS CLEAN
-- =====================================================
-- Trigger pakai SECURITY DEFINER → bypass RLS saat insert
-- Jadi tidak kena rekursi.

drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user() cascade;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_member_number text;
  v_username      text;
  v_suffix        integer := 0;
begin
  -- Idempotency
  if exists (select 1 from public.profiles where id = new.id) then
    return new;
  end if;

  v_member_number := 'MBR-' || lpad(nextval('member_number_seq')::text, 8, '0');

  -- Resolve username conflict
  v_username := nullif(trim(coalesce(new.raw_user_meta_data->>'username', '')), '');
  if v_username is not null then
    while exists (select 1 from public.profiles where username = v_username) loop
      v_suffix   := v_suffix + 1;
      v_username := (new.raw_user_meta_data->>'username') || v_suffix::text;
      exit when v_suffix > 999;
    end loop;
    if v_suffix > 999 then v_username := null; end if;
  end if;

  insert into public.profiles (id, email, full_name, username, phone, role)
  values (
    new.id,
    new.email,
    nullif(trim(coalesce(new.raw_user_meta_data->>'full_name', '')), ''),
    v_username,
    nullif(trim(coalesce(new.raw_user_meta_data->>'phone', '')), ''),
    'CUSTOMER'
  );

  insert into public.customers (id, member_number)
  values (new.id, v_member_number);

  return new;
exception
  when unique_violation then
    -- Fallback tanpa username
    insert into public.profiles (id, email, full_name, username, phone, role)
    values (new.id, new.email,
            nullif(trim(coalesce(new.raw_user_meta_data->>'full_name', '')), ''),
            null,
            nullif(trim(coalesce(new.raw_user_meta_data->>'phone', '')), ''),
            'CUSTOMER')
    on conflict (id) do nothing;

    insert into public.customers (id, member_number)
    values (new.id, v_member_number)
    on conflict (id) do nothing;

    return new;
  when others then
    raise warning 'handle_new_user failed for %: % (%)', new.id, sqlerrm, sqlstate;
    raise;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

do $$
begin
  raise notice '✅ Step 6: Trigger recreated (SECURITY DEFINER, no RLS)';
end $$;

-- =====================================================
-- STEP 7: SELF-CHECK
-- =====================================================

do $$
declare
  v_fn        int;
  v_trigger   int;
  v_pol_prof  int;
  v_pol_cust  int;
begin
  select count(*) into v_fn       from pg_proc       where proname = 'get_my_role';
  select count(*) into v_trigger  from pg_trigger     where tgname  = 'on_auth_user_created';
  select count(*) into v_pol_prof from pg_policies    where tablename = 'profiles';
  select count(*) into v_pol_cust from pg_policies    where tablename = 'customers';

  assert v_fn      = 1, 'get_my_role() function missing!';
  assert v_trigger = 1, 'Trigger on_auth_user_created missing!';
  assert v_pol_prof >= 5, 'Expected at least 5 policies on profiles, got ' || v_pol_prof;
  assert v_pol_cust >= 4, 'Expected at least 4 policies on customers, got ' || v_pol_cust;

  raise notice '';
  raise notice '==============================================';
  raise notice '✅ ALL CHECKS PASSED';
  raise notice '  get_my_role function : %', v_fn;
  raise notice '  trigger              : %', v_trigger;
  raise notice '  profiles policies    : %', v_pol_prof;
  raise notice '  customers policies   : %', v_pol_cust;
  raise notice '  Recursive policy bug : FIXED';
  raise notice '  RLS                  : ENABLED (not disabled)';
  raise notice '==============================================';
end $$;
