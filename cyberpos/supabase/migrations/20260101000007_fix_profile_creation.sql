-- Fix profile creation and RLS policies

-- 1. Ensure RLS policies allow trigger to insert
drop policy if exists "Allow service role to insert profiles" on profiles;
drop policy if exists "Allow service role to insert customers" on customers;

-- Create proper insert policies for profiles
create policy "Allow authenticated to insert own profile" on profiles
  for insert
  to authenticated
  with check (auth.uid() = id);

create policy "Allow service role to insert any profile" on profiles
  for insert
  to service_role
  with check (true);

-- Create proper insert policies for customers
create policy "Allow authenticated to insert own customer" on customers
  for insert
  to authenticated
  with check (auth.uid() = id);

create policy "Allow service role to insert any customer" on customers
  for insert
  to service_role
  with check (true);

-- 2. Fix trigger function to actually throw errors if critical insert fails
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();

create or replace function public.handle_new_user()
returns trigger as $$
declare
  v_member_number text;
  v_profile_exists boolean;
begin
  -- Check if profile already exists
  select exists(select 1 from public.profiles where id = new.id) into v_profile_exists;
  
  if v_profile_exists then
    return new;
  end if;
  
  -- Generate member number
  v_member_number := 'MBR-' || lpad(nextval('member_number_seq')::text, 8, '0');
  
  -- Insert profile (will fail if RLS blocks it)
  insert into public.profiles (id, email, full_name, username, phone, role)
  values (
    new.id, 
    new.email, 
    coalesce(new.raw_user_meta_data->>'full_name', 'User'),
    coalesce(new.raw_user_meta_data->>'username', null),
    coalesce(new.raw_user_meta_data->>'phone', null),
    'CUSTOMER'
  );
  
  -- Insert customer record
  insert into public.customers (id, member_number)
  values (new.id, v_member_number);
  
  return new;
exception
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

-- 3. Create repair function to fix existing users without profiles
create or replace function public.repair_missing_profiles()
returns table(user_id uuid, status text) as $$
declare
  v_user record;
  v_member_number text;
begin
  -- Find auth users without profiles
  for v_user in 
    select au.id, au.email, au.raw_user_meta_data
    from auth.users au
    left join public.profiles p on p.id = au.id
    where p.id is null
  loop
    begin
      v_member_number := 'MBR-' || lpad(nextval('member_number_seq')::text, 8, '0');
      
      insert into public.profiles (id, email, full_name, username, phone, role)
      values (
        v_user.id,
        v_user.email,
        coalesce(v_user.raw_user_meta_data->>'full_name', 'User'),
        coalesce(v_user.raw_user_meta_data->>'username', null),
        coalesce(v_user.raw_user_meta_data->>'phone', null),
        'CUSTOMER'
      );
      
      insert into public.customers (id, member_number)
      values (v_user.id, v_member_number);
      
      user_id := v_user.id;
      status := 'success';
      return next;
    exception
      when others then
        user_id := v_user.id;
        status := 'failed: ' || sqlerrm;
        return next;
    end;
  end loop;
end;
$$ language plpgsql security definer set search_path = public;

-- Grant execute on repair function to service role only (for manual admin use)
grant execute on function public.repair_missing_profiles to service_role;
