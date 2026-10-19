-- Patch untuk migration 20260101000008 - handle existing policies
-- Jalankan ini SEBELUM migration 20260101000008 atau sebagai pengganti

-- 1. Drop ALL existing insert policies untuk profiles dan customers
do $$ 
begin
  -- Drop policies untuk profiles
  drop policy if exists "Allow service role to insert profiles" on profiles;
  drop policy if exists "Allow service role to insert any profile" on profiles;
  drop policy if exists "Allow authenticated to insert own profile" on profiles;
  drop policy if exists "Allow authenticated insert own profile" on profiles;
  
  -- Drop policies untuk customers
  drop policy if exists "Allow service role to insert customers" on customers;
  drop policy if exists "Allow service role to insert any customer" on customers;
  drop policy if exists "Allow authenticated to insert own customer" on customers;
  drop policy if exists "Allow authenticated insert own customer" on customers;
exception
  when others then
    raise notice 'Error dropping policies: %', sqlerrm;
end $$;

-- 2. Create fresh insert policies for profiles
create policy "profiles_insert_authenticated" on profiles
  for insert
  to authenticated
  with check (auth.uid() = id);

create policy "profiles_insert_service_role" on profiles
  for insert
  to service_role
  with check (true);

-- 3. Create fresh insert policies for customers
create policy "customers_insert_authenticated" on customers
  for insert
  to authenticated
  with check (auth.uid() = id);

create policy "customers_insert_service_role" on customers
  for insert
  to service_role
  with check (true);

-- 4. Improve trigger function with username conflict resolution
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user() cascade;

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

-- Recreate trigger
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 5. Update repair function with better username handling
drop function if exists public.repair_missing_profiles() cascade;

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

-- 6. Add index for faster username lookup (only if not exists)
do $$
begin
  if not exists (
    select 1 from pg_indexes 
    where tablename = 'profiles' and indexname = 'idx_profiles_username'
  ) then
    create index idx_profiles_username on profiles(username) where username is not null;
  end if;
end $$;

-- 7. Add unique constraint for email (case-insensitive, only if not exists)
do $$
begin
  if not exists (
    select 1 from pg_indexes 
    where tablename = 'profiles' and indexname = 'idx_profiles_email_unique'
  ) then
    create unique index idx_profiles_email_unique on profiles(lower(email));
  end if;
end $$;

-- Success message
do $$
begin
  raise notice '==============================================';
  raise notice 'Migration completed successfully!';
  raise notice 'Trigger: on_auth_user_created - READY';
  raise notice 'RLS Policies: profiles and customers - READY';
  raise notice 'Indexes: username and email - READY';
  raise notice 'Repair function: repair_missing_profiles - READY';
  raise notice '==============================================';
end $$;
