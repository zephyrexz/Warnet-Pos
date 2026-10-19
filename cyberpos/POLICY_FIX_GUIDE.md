# Quick Fix untuk Policy Already Exists Error

## Error yang Terjadi
```
ERROR: 42710: policy "Allow service role to insert any profile" for table "profiles" already exists
```

## Penyebab
Migration sebelumnya (20260101000007 atau 20260101000008) sudah membuat policy dengan nama yang sama.

## Solusi

### Opsi 1: Jalankan Migration Patch (RECOMMENDED)

**File:** `supabase/migrations/20260101000009_fix_existing_policies.sql`

Migration ini akan:
- Drop semua policy insert yang mungkin ada (dengan variasi nama)
- Buat policy baru dengan nama yang konsisten
- Update trigger dengan username conflict resolution
- Add indexes jika belum ada

**Cara jalankan:**

1. Buka Supabase Dashboard → SQL Editor
2. Copy seluruh isi file `20260101000009_fix_existing_policies.sql`
3. Paste dan Run
4. Seharusnya berhasil tanpa error

### Opsi 2: Manual Clean-up (Jika Opsi 1 Gagal)

**Step 1: Drop policies lama**
```sql
-- Drop semua variasi nama policy
drop policy if exists "Allow service role to insert profiles" on profiles;
drop policy if exists "Allow service role to insert any profile" on profiles;
drop policy if exists "Allow authenticated to insert own profile" on profiles;
drop policy if exists "Allow service role to insert customers" on customers;
drop policy if exists "Allow service role to insert any customer" on customers;
drop policy if exists "Allow authenticated to insert own customer" on customers;
```

**Step 2: Buat policy baru dengan nama berbeda**
```sql
-- Profiles
create policy "profiles_insert_authenticated" on profiles
  for insert to authenticated
  with check (auth.uid() = id);

create policy "profiles_insert_service_role" on profiles
  for insert to service_role
  with check (true);

-- Customers
create policy "customers_insert_authenticated" on customers
  for insert to authenticated
  with check (auth.uid() = id);

create policy "customers_insert_service_role" on customers
  for insert to service_role
  with check (true);
```

**Step 3: Jalankan sisa migration 20260101000008**
Jalankan bagian trigger, repair function, dan indexes dari migration tersebut.

### Opsi 3: Skip Policy Creation (Quick Fix)

Jika policy sudah ada dan bekerja, Anda bisa skip bagian policy creation:

```sql
-- Cek policy yang sudah ada
select schemaname, tablename, policyname, cmd, roles, qual
from pg_policies 
where tablename in ('profiles', 'customers') and cmd = 'INSERT';
```

Jika output menunjukkan:
- Policy untuk authenticated dengan check `(auth.uid() = id)`
- Policy untuk service_role dengan check `true`

Maka policy sudah benar. Lanjut ke:

1. Update trigger (dari migration 20260101000009)
2. Update repair function
3. Add indexes

## Verifikasi Setelah Fix

```sql
-- 1. Cek policies
select policyname, roles 
from pg_policies 
where tablename = 'profiles' and cmd = 'INSERT';
-- Expected: 2 rows (authenticated dan service_role)

-- 2. Cek trigger
select tgname, tgenabled 
from pg_trigger 
where tgname = 'on_auth_user_created';
-- Expected: 1 row, tgenabled = 'O'

-- 3. Cek indexes
select indexname 
from pg_indexes 
where tablename = 'profiles';
-- Expected: idx_profiles_username, idx_profiles_email_unique

-- 4. Test trigger
select proname 
from pg_proc 
where proname = 'handle_new_user';
-- Expected: 1 row
```

## Testing

Setelah fix berhasil, test:

1. **Registrasi email baru** → harus berhasil
2. **Registrasi email duplikat** → harus ditolak
3. **Login** → harus berhasil

## Jika Masih Error

**Error: "policy already exists" setelah menjalankan fix:**

```sql
-- List semua policy pada table profiles
select policyname from pg_policies where tablename = 'profiles';

-- Drop secara manual satu per satu
drop policy "nama_policy" on profiles;

-- Lalu buat ulang dengan nama baru
```

**Error: "trigger already exists":**

```sql
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user() cascade;
-- Lalu jalankan ulang bagian trigger dari migration
```

## Update Documentation

Setelah fix berhasil:
- Migration 20260101000008 → SKIP (sudah di-fix oleh 20260101000009)
- Migration 20260101000009 → ✅ JALANKAN INI

Policy names yang digunakan (baru):
- `profiles_insert_authenticated`
- `profiles_insert_service_role`
- `customers_insert_authenticated`
- `customers_insert_service_role`
