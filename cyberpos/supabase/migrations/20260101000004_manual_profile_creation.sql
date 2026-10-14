-- Manual profile creation function to bypass trigger issues
create or replace function public.create_user_profile(
  user_id uuid,
  user_email text,
  user_full_name text,
  user_username text default null,
  user_phone text default null
)
returns void as $$
declare
  v_member_number text;
begin
  v_member_number := 'MBR-' || lpad(nextval('member_number_seq')::text, 8, '0');
  
  insert into public.profiles (id, email, full_name, username, phone, role)
  values (user_id, user_email, user_full_name, user_username, user_phone, 'CUSTOMER')
  on conflict (id) do nothing;
  
  insert into public.customers (id, member_number)
  values (user_id, v_member_number)
  on conflict (id) do nothing;
end;
$$ language plpgsql security definer;
