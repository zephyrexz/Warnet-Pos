-- SQL Repair Script untuk Akun Tanpa Profil
-- Jalankan di Supabase Dashboard → SQL Editor

-- STEP 1: Cek akun yang tidak punya profil
-- ==========================================
select 
  au.id,
  au.email,
  au.created_at,
  au.raw_user_meta_data->>'full_name' as metadata_name
from auth.users au
left join public.profiles p on p.id = au.id
where p.id is null
order by au.created_at desc;

-- Jika query di atas menampilkan hasil, lanjutkan ke STEP 2


-- STEP 2: Perbaiki akun tanpa profil secara otomatis
-- ===================================================
-- Fungsi ini akan membuat profil dan customer record untuk semua akun yang tidak punya profil
select * from public.repair_missing_profiles();

-- Output akan menampilkan:
-- user_id | status
-- --------+--------
-- [uuid]  | success atau failed: [error message]


-- STEP 3: Verifikasi profil yang baru dibuat
-- ===========================================
select 
  p.id,
  p.email,
  p.full_name,
  p.role,
  p.created_at,
  c.member_number
from profiles p
join customers c on c.id = p.id
order by p.created_at desc
limit 20;


-- STEP 4: Cek apakah masih ada akun tanpa profil
-- ===============================================
select count(*) as users_without_profile
from auth.users au
left join public.profiles p on p.id = au.id
where p.id is null;

-- Seharusnya return 0


-- TROUBLESHOOTING
-- ===============

-- Jika ada akun yang gagal (status = 'failed'), cek detail errornya:
-- Kemungkinan penyebab:
-- 1. Username sudah dipakai (conflict on unique constraint)
-- 2. Email sudah ada di profiles (seharusnya tidak mungkin)
-- 3. RLS masih memblokir insert

-- Untuk memperbaiki secara manual (ganti dengan ID dan data yang sesuai):
/*
do $$
declare
  v_user_id uuid := 'GANTI-DENGAN-USER-ID';
  v_email text := 'user@example.com';
  v_member_number text;
begin
  v_member_number := 'MBR-' || lpad(nextval('member_number_seq')::text, 8, '0');
  
  insert into public.profiles (id, email, full_name, role)
  values (v_user_id, v_email, 'User', 'CUSTOMER')
  on conflict (id) do nothing;
  
  insert into public.customers (id, member_number)
  values (v_user_id, v_member_number)
  on conflict (id) do nothing;
  
  raise notice 'Profile created for %', v_email;
end $$;
*/


-- Cek role yang tidak standar (jika ada)
-- =======================================
select role, count(*) as count
from profiles
group by role
order by count desc;

-- Role yang valid: CUSTOMER, CASHIER, ADMIN, OWNER, TECHNICIAN
-- Jika ada role lain, perbaiki secara manual atau hubungi developer
