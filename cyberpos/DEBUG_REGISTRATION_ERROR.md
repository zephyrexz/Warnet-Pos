# DEBUG: Registrasi Gagal - Silakan Hubungi Administrator

## Penyebab Umum Error Ini

Error "Registrasi gagal. Silakan hubungi administrator" bisa disebabkan oleh:

1. **Migration belum dijalankan** ⚠️ PALING SERING
2. **Trigger database gagal execute**
3. **RLS policies memblokir insert profil**
4. **Username atau email constraint conflict**

## LANGKAH DEBUG - WAJIB DILAKUKAN

### Step 1: Cek Apakah Migration Sudah Dijalankan

```sql
-- Jalankan di Supabase SQL Editor
-- Cek trigger exists
select tgname, tgenabled 
from pg_trigger 
where tgname = 'on_auth_user_created';

-- Expected: 1 row dengan tgenabled = 'O'
-- Jika TIDAK ADA HASIL: Migration belum dijalankan!
```

**Jika trigger TIDAK ADA:**

✅ **SOLUSI: Jalankan migration 20260101000009**

1. Buka Supabase Dashboard → SQL Editor
2. Copy isi file `supabase/migrations/20260101000009_fix_existing_policies.sql`
3. Paste dan Run
4. Tunggu message "Migration completed successfully!"
5. Coba registrasi lagi

### Step 2: Cek Logs Database

```sql
-- Cek apakah ada akun Auth tanpa profil (bukti trigger gagal)
select 
  au.id,
  au.email,
  au.created_at,
  p.id as profile_id
from auth.users au
left join public.profiles p on p.id = au.id
order by au.created_at desc
limit 10;

-- Jika ada user dengan profile_id = NULL: trigger gagal
```

**Jika ada user tanpa profil:**

```sql
-- Perbaiki dengan repair function
select * from public.repair_missing_profiles();
```

### Step 3: Test Trigger Manual

```sql
-- Test apakah trigger bisa jalan
do $$
declare
  v_test_id uuid := gen_random_uuid();
begin
  -- Simulate trigger
  insert into public.profiles (id, email, full_name, role)
  values (v_test_id, 'test@example.com', 'Test User', 'CUSTOMER');
  
  insert into public.customers (id, member_number)
  values (v_test_id, 'MBR-TEST001');
  
  raise notice 'Test berhasil - trigger function OK';
  
  -- Cleanup
  delete from public.customers where id = v_test_id;
  delete from public.profiles where id = v_test_id;
exception
  when others then
    raise notice 'Test GAGAL: %', sqlerrm;
end $$;
```

**Jika muncul error:**
- **"permission denied"** → RLS policies bermasalah
- **"violates foreign key"** → Constraint issue
- **"duplicate key"** → Email/username conflict

### Step 4: Cek RLS Policies

```sql
-- Cek policies untuk insert
select 
  schemaname,
  tablename, 
  policyname,
  cmd,
  roles,
  qual
from pg_policies 
where tablename in ('profiles', 'customers') 
  and cmd = 'INSERT'
order by tablename, policyname;

-- Expected: 4 rows (2 untuk profiles, 2 untuk customers)
-- - profiles_insert_authenticated
-- - profiles_insert_service_role
-- - customers_insert_authenticated
-- - customers_insert_service_role
```

**Jika policies TIDAK ADA atau salah:**

Jalankan migration 20260101000009 (lihat Step 1).

### Step 5: Cek Console Browser

Buka browser Developer Tools (F12) saat registrasi:

**Console Tab:**
- Cek error message detail
- Cek log: "Profile verification error"
- Cek log: "User ID"
- Cek log: "Full error"

**Network Tab:**
- Cek request `signUp` → Response
- Cek request `profiles` (query verifikasi) → Response
- Cek status code dan error message

## SOLUSI BERDASARKAN ERROR

### Error: "Profil gagal dibuat: permission denied"

**Penyebab:** RLS policies memblokir insert profil

**Solusi:**
```sql
-- Jalankan migration 20260101000009
-- Atau manual fix:

-- Drop policies lama
drop policy if exists "Allow service role to insert any profile" on profiles;
drop policy if exists "Allow authenticated to insert own profile" on profiles;

-- Buat policy baru
create policy "profiles_insert_service_role" on profiles
  for insert to service_role with check (true);

create policy "profiles_insert_authenticated" on profiles
  for insert to authenticated with check (auth.uid() = id);
```

### Error: "Profil tidak ditemukan setelah registrasi"

**Penyebab:** Trigger tidak execute atau gagal silent

**Solusi:**
1. Pastikan trigger exists (Step 1)
2. Cek Supabase logs: Dashboard → Database → Logs
3. Filter: "warning" atau "error"
4. Cari pesan dari trigger "Failed to create profile for user"

### Error: "duplicate key value violates unique constraint"

**Penyebab:** Username atau email sudah dipakai

**Solusi:**
- Migration 20260101000009 sudah handle ini dengan auto-suffix
- Pastikan migration sudah dijalankan

### Error: "violates foreign key constraint profiles_id_fkey"

**Penyebab:** User ID dari Auth tidak valid atau relasi FK salah

**Solusi:**
```sql
-- Cek foreign key constraint
select 
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name as foreign_table_name,
  ccu.column_name as foreign_column_name
from information_schema.table_constraints tc
join information_schema.key_column_usage kcu 
  on tc.constraint_name = kcu.constraint_name
join information_schema.constraint_column_usage ccu 
  on ccu.constraint_name = tc.constraint_name
where tc.table_name = 'profiles' and tc.constraint_type = 'FOREIGN KEY';

-- Expected: profiles.id → auth.users.id
```

## QUICK FIX - JALANKAN INI JIKA BELUM

```sql
-- ALL-IN-ONE FIX: Copy paste dan jalankan di Supabase SQL Editor
-- Ini akan fix semua masalah umum

do $$ 
begin
  -- 1. Drop old policies
  drop policy if exists "Allow service role to insert profiles" on profiles;
  drop policy if exists "Allow service role to insert any profile" on profiles;
  drop policy if exists "Allow authenticated to insert own profile" on profiles;
  drop policy if exists "Allow service role to insert customers" on customers;
  drop policy if exists "Allow service role to insert any customer" on customers;
  drop policy if exists "Allow authenticated to insert own customer" on customers;
  
  raise notice 'Step 1: Old policies dropped';
end $$;

-- 2. Create new policies
create policy "profiles_insert_authenticated" on profiles
  for insert to authenticated with check (auth.uid() = id);

create policy "profiles_insert_service_role" on profiles
  for insert to service_role with check (true);

create policy "customers_insert_authenticated" on customers
  for insert to authenticated with check (auth.uid() = id);

create policy "customers_insert_service_role" on customers
  for insert to service_role with check (true);

-- 3. Ensure trigger exists
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user() cascade;

-- Paste lengkap function dari migration 20260101000009 di sini
-- Atau jalankan full migration file
```

## TESTING SETELAH FIX

### Test 1: Cek Komponen Database

```sql
-- One-liner check all components
select 
  (select count(*) from pg_trigger where tgname = 'on_auth_user_created') as trigger_count,
  (select count(*) from pg_policies where tablename = 'profiles' and cmd = 'INSERT') as profiles_policies,
  (select count(*) from pg_policies where tablename = 'customers' and cmd = 'INSERT') as customers_policies,
  (select proname from pg_proc where proname = 'handle_new_user' limit 1) as trigger_function;

-- Expected:
-- trigger_count: 1
-- profiles_policies: 2
-- customers_policies: 2
-- trigger_function: handle_new_user
```

### Test 2: Coba Registrasi Lagi

1. Buka browser Incognito/Private mode
2. Clear cookies Supabase
3. Buka `/register`
4. Isi form dengan email BARU (belum pernah dipakai)
5. Buka Developer Tools (F12) → Console tab
6. Submit form
7. Perhatikan log di console

**Expected:**
- ✅ Toast: "Registrasi berhasil"
- ✅ Redirect ke `/customer/dashboard`
- ✅ Console: No error

**Jika masih error:**
- Lihat Console → Cari log "Profile verification error"
- Copy error message lengkap
- Cek di Supabase SQL Editor: `select * from profiles order by created_at desc limit 5;`

## HUBUNGI DENGAN INFO INI

Jika masih gagal setelah langkah di atas, kirim info berikut:

1. **Output query Step 1** (trigger exists?)
2. **Output query Step 4** (policies)
3. **Screenshot Console browser** (error detail)
4. **Supabase Database Logs** (Dashboard → Logs, filter error)
5. **Email yang digunakan untuk test** (untuk cek di database)

## TEMPORARY WORKAROUND (Jika Urgent)

Jika perlu akses segera dan tidak bisa fix trigger:

```sql
-- Manual create profile untuk testing
-- GANTI dengan user ID dari auth.users
insert into public.profiles (id, email, full_name, role)
values (
  'USER-ID-DARI-AUTH-USERS',
  'email@example.com',
  'Test User',
  'CUSTOMER'
);

insert into public.customers (id, member_number)
values ('USER-ID-DARI-AUTH-USERS', 'MBR-00000001');
```

**⚠️ INI HANYA TEMPORARY!** Tetap harus fix trigger untuk registrasi otomatis.
