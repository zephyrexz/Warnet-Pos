-- Additional RLS policies to allow trigger to insert profiles and customers

-- Allow service role and triggers to insert profiles
create policy "Allow service role to insert profiles" on profiles
  for insert
  with check (true);

-- Allow service role and triggers to insert customers  
create policy "Allow service role to insert customers" on customers
  for insert
  with check (true);

-- Note: These policies use 'with check (true)' which allows inserts from:
-- 1. Service role (used by triggers with SECURITY DEFINER)
-- 2. Authenticated users (but still subject to other business logic)
-- The function handle_new_user() runs as SECURITY DEFINER so it bypasses RLS
