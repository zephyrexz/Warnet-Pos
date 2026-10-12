-- Fix for handle_new_user function with better error handling

-- Drop existing trigger and function
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();

-- Recreate sequence
create sequence if not exists member_number_seq start 1;

-- Improved function with error handling
create or replace function public.handle_new_user()
returns trigger as $$
declare
  v_member_number text;
begin
  -- Generate member number
  v_member_number := 'MBR-' || lpad(nextval('member_number_seq')::text, 8, '0');
  
  -- Insert profile
  insert into public.profiles (id, email, full_name, username, role)
  values (
    new.id, 
    new.email, 
    coalesce(new.raw_user_meta_data->>'full_name', 'User'),
    coalesce(new.raw_user_meta_data->>'username', null),
    'CUSTOMER'
  )
  on conflict (id) do nothing;
  
  -- Insert customer record
  insert into public.customers (id, member_number)
  values (new.id, v_member_number)
  on conflict (id) do nothing;
  
  return new;
exception
  when others then
    -- Log error but don't fail the auth user creation
    raise warning 'Error creating profile/customer for user %: %', new.id, sqlerrm;
    return new;
end;
$$ language plpgsql security definer set search_path = public;

-- Recreate trigger
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Grant necessary permissions
grant usage on sequence member_number_seq to authenticated;
grant usage on sequence member_number_seq to service_role;
