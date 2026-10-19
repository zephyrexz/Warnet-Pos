# Panduan Perbaikan Login - Role Issue

## Masalah yang Diperbaiki
Error "Akun tidak memiliki role yang valid" disebabkan oleh:
1. Trigger `handle_new_user()` yang menelan error saat pembuatan profil gagal
2. RLS policies yang tidak lengkap untuk insert profil dari trigger
3. Login handler yang tidak membedakan antara profil tidak ada vs role invalid

## Perubahan yang Dilakukan

### 1. Migration Baru: `20260101000007_fix_profile_creation.sql`
- Perbaiki RLS policies untuk insert profil dan customer
- Tambahkan policy untuk authenticated dan service_role
- Perbaiki trigger `handle_new_user()` agar throw error jika insert gagal (tidak silent fail)
- Tambahkan fungsi `repair_missing_profiles()` untuk memperbaiki akun lama tanpa profil

### 2. File: `app/login/page.tsx`
- Pisahkan error handling untuk:
  - Profile query error (sistem error)
  - Profile not found (profil tidak ada)
  - Invalid role (role tidak dikenali)
- Tambahkan validasi role yang lebih ketat
- Tambahkan support untuk role TECHNICIAN
- Pesan error lebih informatif

### 3. File: `middleware.ts`
- Tambahkan validasi role yang eksplisit
- Tambahkan support untuk role TECHNICIAN
- Redirect ke login jika profil atau role tidak valid
- Konsistenkan pengecekan role di semua protected routes

## Langkah Deployment

### A. Push ke GitHub

```bash
cd C:\Users\Zephyr\downloads\warnet-pos\cyberpos
git add .
git commit -m "fix: resolve invalid user role on login and improve profile creation"
git push origin main
```

### B. Terapkan Migration di Supabase

**PENTING:** Migration baru perlu dijalankan di Supabase Dashboard

1. Buka Supabase Dashboard → SQL Editor
2. Jalankan migration `20260101000007_fix_profile_creation.sql`
3. Atau gunakan Supabase CLI:
   ```bash
   npx supabase db push
   ```

### C. Perbaiki Akun yang Sudah Ada (Opsional)

Jika ada akun Auth yang sudah terdaftar tapi tidak punya profil:

1. Buka Supabase Dashboard → SQL Editor
2. Jalankan query untuk cek akun tanpa profil:
   ```sql
   select au.id, au.email, au.created_at
   from auth.users au
   left join public.profiles p on p.id = au.id
   where p.id is null;
   ```

3. Jika ada akun tanpa profil, jalankan fungsi repair:
   ```sql
   select * from public.repair_missing_profiles();
   ```

4. Verifikasi hasilnya:
   ```sql
   -- Cek profil yang baru dibuat
   select p.id, p.email, p.role, p.created_at
   from profiles p
   order by p.created_at desc
   limit 10;
   ```

### D. Deploy Ulang di Vercel

1. Buka Vercel Dashboard
2. Pilih project CyberPOS
3. Tunggu auto-deploy dari GitHub push, ATAU
4. Klik "Redeploy" pada deployment terakhir
5. Pastikan deployment menggunakan commit terbaru

### E. Verifikasi Environment Variables di Vercel

Pastikan environment variables sudah benar:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### F. Test Setelah Deployment

1. Buka aplikasi di production URL
2. Coba login dengan akun yang sebelumnya bermasalah
3. Pastikan redirect ke dashboard sesuai role
4. Jika masih error, cek:
   - Logs di Vercel Dashboard → Deployment → Functions
   - Query profil di Supabase Dashboard → Table Editor → profiles
   - RLS policies di Supabase Dashboard → Authentication → Policies

## Troubleshooting

### Login masih error "Profil tidak ditemukan"
- Cek di Supabase: Table Editor → profiles → cari berdasarkan email
- Jika tidak ada, jalankan `repair_missing_profiles()`
- Pastikan trigger `on_auth_user_created` aktif di Supabase

### Login error "Role tidak valid"
- Cek role di table profiles
- Pastikan role adalah salah satu dari: CUSTOMER, CASHIER, ADMIN, OWNER, TECHNICIAN
- Update manual jika perlu:
  ```sql
  update profiles set role = 'CUSTOMER' where email = 'user@example.com';
  ```

### RLS error saat login
- Cek policies di Supabase Dashboard
- Pastikan policy "Users can view own profile" aktif
- Pastikan policy "Allow service role to insert any profile" ada

### Registrasi gagal setelah update
- Cek logs Supabase di Dashboard → Database → Logs
- Cek apakah trigger throw error dengan pesan warning
- Jalankan test registrasi dengan email baru
