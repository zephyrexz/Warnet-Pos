# ⚠️⚠️⚠️ PANDUAN RESET DATABASE ⚠️⚠️⚠️

## PERINGATAN KERAS

**Script ini akan menghapus SEMUA DATA di database!**

- ❌ Semua akun pengguna akan hilang
- ❌ Semua transaksi akan hilang
- ❌ Semua data komputer, produk, billing akan hilang
- ❌ Semua settings akan direset ke default
- ✅ Database akan bersih seperti baru install

**JANGAN JALANKAN DI PRODUCTION TANPA BACKUP!**

## Kapan Menggunakan Reset Database

✅ **Gunakan jika:**
- Development/testing dan ingin database bersih
- Banyak data corrupt yang sulit diperbaiki
- Ingin start fresh dengan schema terbaru
- Sudah yakin tidak ada data penting yang perlu diselamatkan

❌ **JANGAN gunakan jika:**
- Ada data production/pelanggan nyata
- Belum backup database
- Hanya ingin fix trigger atau RLS (gunakan migration biasa)
- Masih ada data yang diperlukan

## Langkah WAJIB Sebelum Reset

### 1. BACKUP Database (Production Only)

**Via Supabase Dashboard:**
1. Buka Supabase Dashboard
2. Database → Backups
3. Create new backup
4. Tunggu sampai selesai
5. Download backup file

**Via SQL Export:**
```sql
-- Export semua data penting (jalankan satu per satu)
copy (select * from profiles) to stdout with csv header;
copy (select * from customers) to stdout with csv header;
copy (select * from sales) to stdout with csv header;
-- Dst untuk tabel lain yang penting
```

### 2. Konfirmasi Tidak Ada Session Aktif

```sql
-- Cek user yang sedang online
select count(*) from auth.sessions where expires_at > now();
```

Jika ada session aktif, tunggu sampai selesai atau logout semua user.

### 3. Catat Informasi Penting

- Jumlah user terdaftar
- Total transaksi
- Settings khusus yang sudah dikustomisasi

## Cara Menjalankan Reset

### Opsi 1: Via Supabase Dashboard (Recommended)

1. **Buka Supabase Dashboard**
   - https://supabase.com/dashboard
   - Login dengan akun Anda
   - Pilih project: **kevuyxaxdcenmrpqoxbq**

2. **Buka SQL Editor**
   - Klik **SQL Editor** di sidebar kiri
   - Klik **New query**

3. **Copy Script Reset**
   - Buka file: `supabase/RESET_DATABASE.sql`
   - Copy **SELURUH isi file** (Ctrl+A, Ctrl+C)
   - Paste ke SQL Editor (Ctrl+V)

4. **PERIKSA ULANG**
   - ⚠️ Pastikan Anda di project yang benar
   - ⚠️ Pastikan sudah backup (jika production)
   - ⚠️ Pastikan siap kehilangan semua data

5. **Jalankan Script**
   - Klik **Run** atau tekan **Ctrl+Enter**
   - Tunggu sampai selesai (bisa 30-60 detik)
   - Script akan menjalankan 5 step secara berurutan

6. **Verifikasi Output**
   
   Anda akan melihat notice seperti ini:
   ```
   NOTICE: ✅ Step 1 completed: All tables, triggers, and functions dropped
   NOTICE: ✅ Step 2 completed: All tables recreated with RLS policies
   NOTICE: ✅ Step 3 completed: Functions and triggers created
   NOTICE: ✅ Step 4 completed: Performance indexes added
   NOTICE: ✅ Step 5 completed: Default data inserted
   NOTICE: ==============================================
   NOTICE: ✅✅✅ DATABASE RESET COMPLETED ✅✅✅
   NOTICE: ==============================================
   NOTICE: Database is now CLEAN and READY!
   ```

7. **Jika Ada Error**
   - Baca error message dengan teliti
   - Kemungkinan ada dependency yang masih tertinggal
   - Coba jalankan manual drop untuk object yang error
   - Lalu jalankan ulang script reset

### Opsi 2: Via Supabase CLI

```bash
cd C:\Users\Zephyr\downloads\warnet-pos\cyberpos

# Jalankan reset script
npx supabase db reset --db-url "postgresql://postgres:[password]@db.kevuyxaxdcenmrpqoxbq.supabase.co:5432/postgres"
```

**Note:** Perlu connection string lengkap dengan password database.

## Setelah Reset

### 1. Verifikasi Database Bersih

```sql
-- Cek semua tabel ada
select table_name 
from information_schema.tables 
where table_schema = 'public' 
order by table_name;

-- Expected: 23 tables
-- profiles, customers, computers, products, sales, dll

-- Cek trigger aktif
select tgname from pg_trigger where tgname = 'on_auth_user_created';
-- Expected: 1 row

-- Cek RLS policies
select count(*) from pg_policies;
-- Expected: > 30 policies

-- Cek default data
select * from membership_tiers;
-- Expected: 4 rows (Regular, Silver, Gold, Platinum)

select * from app_settings;
-- Expected: 8 rows (warnet_name, address, dll)
```

### 2. Test Registrasi Akun Baru

1. Buka aplikasi `/register`
2. Isi form dengan data test
3. Submit
4. **Expected:** Berhasil, redirect ke dashboard

### 3. Verifikasi Profil Otomatis Dibuat

```sql
-- Cek user yang baru dibuat
select 
  au.id,
  au.email,
  p.full_name,
  p.role,
  c.member_number
from auth.users au
join profiles p on p.id = au.id
join customers c on c.id = au.id
order by au.created_at desc
limit 5;

-- Expected: User baru ada dengan profil lengkap
```

### 4. Test Login

1. Buka `/login`
2. Login dengan akun yang baru dibuat
3. **Expected:** Berhasil login, redirect sesuai role

### 5. Create Admin Account (Jika Perlu)

```sql
-- Setelah registrasi akun via UI, ubah role menjadi OWNER
update profiles 
set role = 'OWNER' 
where email = 'admin@example.com';

-- Logout dan login ulang untuk apply role baru
```

## Troubleshooting

### Error: "cannot drop table X because other objects depend on it"

**Solusi:** Drop dengan CASCADE

```sql
drop table nama_tabel cascade;
```

Lalu jalankan ulang script reset.

### Error: "permission denied"

**Solusi:** Pastikan Anda login sebagai owner/admin project di Supabase Dashboard.

### Error: "relation does not exist"

**Solusi:** Normal, artinya tabel memang sudah tidak ada. Lanjutkan ke step berikutnya.

### Reset Berhasil tapi Trigger Tidak Ada

```sql
-- Manual create trigger
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
```

### Reset Berhasil tapi Registrasi Masih Error

1. Cek trigger exists:
   ```sql
   select tgname from pg_trigger where tgname = 'on_auth_user_created';
   ```

2. Cek RLS policies:
   ```sql
   select policyname from pg_policies 
   where tablename = 'profiles' and cmd = 'INSERT';
   ```

3. Cek function exists:
   ```sql
   select proname from pg_proc where proname = 'handle_new_user';
   ```

## Alternatif: Reset Tanpa Hapus Auth Users

Jika ingin keep akun Auth tapi reset data aplikasi:

```sql
-- Drop hanya tabel aplikasi, tidak touch auth.users
drop table if exists audit_logs cascade;
drop table if exists notifications cascade;
-- ... dst sampai profiles

-- Lalu jalankan STEP 2-5 dari RESET_DATABASE.sql
```

## Recovery Jika Ada Masalah

### Restore dari Backup

**Via Supabase Dashboard:**
1. Database → Backups
2. Pilih backup sebelum reset
3. Klik **Restore**
4. Konfirmasi dan tunggu

**Via SQL:**
```sql
-- Import dari backup CSV
copy profiles from '/path/to/backup/profiles.csv' with csv header;
-- Ulangi untuk tabel lain
```

## Checklist Akhir

Setelah reset selesai:

- [ ] Database reset completed message muncul
- [ ] Trigger `on_auth_user_created` exists
- [ ] 23 tabel berhasil dibuat
- [ ] RLS policies aktif (> 30 policies)
- [ ] Default membership tiers inserted (4 rows)
- [ ] Default app settings inserted (8 rows)
- [ ] Test registrasi berhasil
- [ ] Profil otomatis dibuat
- [ ] Test login berhasil
- [ ] Admin account dibuat (jika perlu)

## File Terkait

- `RESET_DATABASE.sql` - Script reset lengkap
- `20260101000009_fix_existing_policies.sql` - Migration normal (non-destructive)
- `DEBUG_REGISTRATION_ERROR.md` - Troubleshooting tanpa reset

## Kontak

Jika ada masalah setelah reset:
- Cek output SQL untuk error message detail
- Cek Supabase logs: Dashboard → Database → Logs
- Verifikasi semua komponen dengan query di atas

---

**Terakhir diupdate:** 2026-10-19  
**Script version:** 1.0  
**Compatible with:** Supabase PostgreSQL 15+
