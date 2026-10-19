# Perbaikan Komprehensif Registrasi dan Login

## Masalah yang Diperbaiki

### 1. Email Duplikat Tidak Terdeteksi
**Masalah:** Pengguna bisa mencoba registrasi berkali-kali dengan email yang sama tanpa pesan error yang jelas.

**Penyebab:** Kode tidak memeriksa `data.user.identities` yang kosong, yang merupakan indikator bahwa email sudah terdaftar.

**Solusi:** 
- Periksa `data.user.identities.length === 0` setelah `signUp()`
- Tampilkan pesan: "Email ini sudah terdaftar. Silakan login atau gunakan fitur lupa password."
- Normalisasi email dengan `trim()` dan `toLowerCase()`

### 2. Profil Tidak Terbuat atau Tidak Terverifikasi
**Masalah:** Registrasi menganggap berhasil meskipun profil tidak terbuat di database.

**Penyebab:** 
- Tidak ada verifikasi setelah trigger berjalan
- Username conflict bisa menyebabkan trigger gagal
- Timing issue antara trigger dan query verifikasi

**Solusi:**
- Tambah delay 800ms untuk trigger completion
- Query profil setelah registrasi untuk verifikasi
- Tampilkan error jelas jika profil tidak ditemukan
- Perbaiki trigger untuk handle username conflict dengan auto-suffix

### 3. Login Gagal Mengambil Profil
**Masalah:** Error "Gagal mengambil data profil" saat login.

**Penyebab:**
- Race condition antara session creation dan profile query
- RLS policies yang terlalu ketat
- Timing issue saat profil baru dibuat

**Solusi:**
- Implementasi retry mechanism (3 kali dengan delay 300ms)
- Normalisasi email saat login
- Error message yang lebih spesifik
- Pisahkan error: profile query failed vs profile not found vs invalid role

## Perubahan File

### 1. `app/register/page.tsx`
**Perubahan:**
- Normalisasi email dan data input dengan `trim()`
- Deteksi email duplikat via `identities.length === 0`
- Verifikasi profil dibuat dengan query ke table profiles
- Delay ditingkatkan menjadi 800ms untuk trigger completion
- Error handling lebih detail dan user-friendly

**Kode kunci:**
```typescript
// Deteksi email duplikat
if (data.user && (!data.user.identities || data.user.identities.length === 0)) {
  throw new Error('Email ini sudah terdaftar. Silakan login atau gunakan fitur lupa password.')
}

// Verifikasi profil dibuat
const { data: profile, error: profileError } = await supabase
  .from('profiles')
  .select('id, role')
  .eq('id', data.user.id)
  .maybeSingle()

if (!profile) {
  throw new Error('Profil tidak ditemukan. Silakan hubungi administrator.')
}
```

### 2. `app/login/page.tsx`
**Perubahan:**
- Normalisasi email saat login
- Retry mechanism (3x) untuk query profil dengan delay 300ms
- Error handling yang membedakan berbagai jenis error
- Message yang lebih informatif untuk user

**Kode kunci:**
```typescript
// Retry mechanism untuk query profil
let retries = 3
while (retries > 0 && !profile) {
  const result = await supabase
    .from('profiles')
    .select('role')
    .eq('id', data.user.id)
    .maybeSingle()
  
  if (!result.data && retries > 1) {
    await new Promise(resolve => setTimeout(resolve, 300))
  }
  retries--
}
```

### 3. `supabase/migrations/20260101000008_comprehensive_registration_fix.sql`
**Migration baru yang mencakup:**

#### a. RLS Policies yang Lebih Baik
- Pisahkan policy untuk `authenticated` dan `service_role`
- Memastikan trigger bisa insert profil dan customer

#### b. Trigger dengan Username Conflict Resolution
```sql
-- Auto-append suffix jika username sudah ada
v_username := coalesce(new.raw_user_meta_data->>'username', null);

if v_username is not null then
  v_username_suffix := 0;
  while exists(select 1 from public.profiles where username = v_username) loop
    v_username_suffix := v_username_suffix + 1;
    v_username := (new.raw_user_meta_data->>'username') || v_username_suffix::text;
    if v_username_suffix > 999 then
      v_username := null; -- Skip username jika terlalu banyak conflict
      exit;
    end if;
  end loop;
end if;
```

#### c. Exception Handling yang Lebih Baik
```sql
exception
  when unique_violation then
    -- Fallback: insert tanpa username
    insert into public.profiles (id, email, full_name, username, phone, role)
    values (new.id, new.email, ..., null, ...)
    on conflict (id) do nothing;
```

#### d. Repair Function yang Ditingkatkan
- Menangani username conflict untuk akun lama
- Mengembalikan email dan status untuk debugging
- Safety limit untuk mencegah infinite loop

#### e. Performance Optimization
```sql
-- Index untuk username lookup
create index if not exists idx_profiles_username on profiles(username) 
where username is not null;

-- Unique constraint untuk email (case-insensitive)
create unique index if not exists idx_profiles_email_unique on profiles(lower(email));
```

## Mekanisme Pembuatan Profil

**Database Trigger (`handle_new_user()`)** yang berjalan otomatis saat akun Auth dibuat.

**Alur:**
1. User submit form registrasi
2. Frontend panggil `supabase.auth.signUp()`
3. Supabase Auth buat akun di `auth.users`
4. Trigger `on_auth_user_created` otomatis execute
5. Fungsi `handle_new_user()` insert ke `profiles` dan `customers`
6. Frontend verifikasi profil dengan query
7. Redirect ke dashboard jika sukses

**Keunggulan trigger:**
- Otomatis, tidak bergantung pada frontend
- Berjalan dengan `security definer` (bypass RLS)
- Idempotent (cek `profile_exists` sebelum insert)
- Atomic dengan pembuatan akun Auth

## Pencegahan Email Duplikat

**Metode 1: Supabase Auth (Primary)**
- Supabase Auth menolak email duplikat
- Response: `data.user.identities = []` (array kosong)
- Frontend menangkap dan tampilkan error

**Metode 2: Database Constraint (Backup)**
```sql
create unique index if not exists idx_profiles_email_unique on profiles(lower(email));
```
- Case-insensitive unique constraint
- Mencegah duplikasi di level database

**Metode 3: Normalisasi Input**
```typescript
const normalizedEmail = formData.email.trim().toLowerCase()
```
- Konsisten antara registrasi dan login
- Mencegah "user@email.com" vs "User@Email.com"

## SQL Migration yang Harus Dijalankan

### WAJIB: Migration 20260101000008

**File:** `supabase/migrations/20260101000008_comprehensive_registration_fix.sql`

**Cara 1: Supabase CLI**
```bash
cd C:\Users\Zephyr\downloads\warnet-pos\cyberpos
npx supabase db push
```

**Cara 2: Manual di Supabase Dashboard**
1. Buka https://supabase.com/dashboard
2. Pilih project: kevuyxaxdcenmrpqoxbq
3. SQL Editor → New Query
4. Copy seluruh isi file migration
5. Run

**Verifikasi berhasil:**
```sql
-- Cek trigger ada
select tgname from pg_trigger where tgname = 'on_auth_user_created';

-- Cek policies
select policyname from pg_policies where tablename = 'profiles';

-- Cek index
select indexname from pg_indexes where tablename = 'profiles';
```

### OPSIONAL: Perbaiki Akun Lama Tanpa Profil

**Cek akun tanpa profil:**
```sql
select au.id, au.email, au.created_at
from auth.users au
left join public.profiles p on p.id = au.id
where p.id is null
order by au.created_at;
```

**Perbaiki otomatis:**
```sql
select * from public.repair_missing_profiles();
```

**Output:**
| user_id | email | status |
|---------|-------|--------|
| uuid... | test@example.com | success |
| uuid... | user@test.com | success |

## Testing Skenario

### Skenario 1: Registrasi Email Baru (Happy Path)
**Langkah:**
1. Buka `/register`
2. Isi form dengan email baru
3. Submit

**Expected:**
- ✅ Akun Auth dibuat
- ✅ Profil otomatis dibuat via trigger
- ✅ Role = CUSTOMER
- ✅ Toast: "Registrasi berhasil"
- ✅ Redirect ke `/customer/dashboard`

### Skenario 2: Registrasi Email Duplikat
**Langkah:**
1. Buka `/register`
2. Isi form dengan email yang sudah terdaftar
3. Submit

**Expected:**
- ❌ Registrasi ditolak
- ❌ Toast error: "Email ini sudah terdaftar. Silakan login atau gunakan fitur lupa password."
- ❌ Tidak ada akun baru dibuat
- ❌ Tidak ada profil baru dibuat

### Skenario 3: Registrasi Username Duplikat
**Langkah:**
1. Buka `/register`
2. Isi form dengan username yang sudah ada tapi email baru
3. Submit

**Expected:**
- ✅ Akun Auth dibuat
- ✅ Trigger menambahkan suffix ke username (misal: "john" → "john1")
- ✅ Profil dibuat dengan username modified
- ✅ Registrasi berhasil

### Skenario 4: Login dengan Profil yang Ada
**Langkah:**
1. Buka `/login`
2. Masukkan email dan password yang valid
3. Submit

**Expected:**
- ✅ Auth berhasil
- ✅ Profil ditemukan (dengan retry jika perlu)
- ✅ Role terdeteksi
- ✅ Toast: "Login berhasil"
- ✅ Redirect sesuai role

### Skenario 5: Login dengan Akun Tanpa Profil (Edge Case)
**Langkah:**
1. Akun Auth ada tapi profil tidak ada (dari bug sebelumnya)
2. Coba login

**Expected:**
- ✅ Auth berhasil
- ❌ Profil tidak ditemukan (bahkan setelah retry)
- ❌ Toast error: "Profil tidak ditemukan. Silakan hubungi administrator."
- ❌ User di-sign out
- 💡 Admin harus jalankan `repair_missing_profiles()`

### Skenario 6: Login dengan Password Salah
**Langkah:**
1. Buka `/login`
2. Masukkan email benar, password salah
3. Submit

**Expected:**
- ❌ Auth gagal
- ❌ Toast error: "Email atau password salah"
- ❌ Tetap di halaman login

## Troubleshooting

### Masalah: Registrasi berhasil tapi login gagal "Profil tidak ditemukan"
**Diagnosis:**
```sql
-- Cek akun Auth
select id, email, created_at from auth.users where email = 'user@example.com';

-- Cek profil
select id, email, role, created_at from profiles where email = 'user@example.com';
```

**Solusi:**
- Jika profil tidak ada, jalankan `select * from public.repair_missing_profiles();`
- Cek trigger aktif: `select tgname from pg_trigger where tgname = 'on_auth_user_created';`
- Cek logs Supabase Dashboard → Database → Logs untuk error trigger

### Masalah: Email duplikat tidak terdeteksi
**Diagnosis:**
- Cek apakah migration 20260101000008 sudah dijalankan
- Cek kode frontend menggunakan versi terbaru

**Solusi:**
- Pull code terbaru dari GitHub
- Jalankan migration
- Clear browser cache dan cookies Supabase

### Masalah: Username conflict menyebabkan registrasi gagal
**Diagnosis:**
```sql
select username, count(*) from profiles 
group by username having count(*) > 1;
```

**Solusi:**
- Migration baru sudah handle username conflict dengan auto-suffix
- Jalankan migration 20260101000008
- Trigger baru akan append angka ke username yang duplikat

### Masalah: Login lambat atau timeout
**Diagnosis:**
- Cek index pada profiles: `select indexname from pg_indexes where tablename = 'profiles';`

**Solusi:**
- Migration 20260101000008 menambahkan index untuk performa
- Retry mechanism (3x) sudah ditambahkan di login

## Langkah Deployment

### 1. ✅ Commit dan Push ke GitHub
```bash
cd C:\Users\Zephyr\downloads\warnet-pos\cyberpos
git add .
git commit -m "fix: comprehensive registration and login improvements

- Add duplicate email detection via identities check
- Add profile verification after registration
- Add retry mechanism for profile query in login
- Improve trigger with username conflict resolution
- Add unique constraint for email (case-insensitive)
- Add index for performance optimization
- Better error messages for all failure scenarios"
git push origin main
```

### 2. ⚠️ WAJIB: Jalankan Migration di Supabase

**Prioritas: TINGGI - HARUS DILAKUKAN SEBELUM TESTING**

```bash
npx supabase db push
```

Atau manual via Supabase Dashboard → SQL Editor.

### 3. ✅ Deploy ke Vercel (Auto)

- Vercel auto-deploy dari push GitHub
- Tunggu 2-3 menit
- Cek Vercel Dashboard → Deployments
- Pastikan deployment menggunakan commit terbaru

### 4. 🧪 Testing

Setelah deployment:
1. Test registrasi dengan email baru → harus berhasil
2. Test registrasi dengan email sama → harus ditolak dengan pesan jelas
3. Test login dengan akun yang baru dibuat → harus berhasil
4. Cek profil di Supabase Table Editor → harus ada dengan role CUSTOMER

### 5. 🔧 Perbaiki Akun Lama (Jika Ada)

Jika ada akun yang terdaftar sebelum fix ini:

```sql
-- Cek jumlah akun tanpa profil
select count(*) from auth.users au
left join public.profiles p on p.id = au.id
where p.id is null;

-- Perbaiki
select * from public.repair_missing_profiles();
```

## Konfigurasi Manual yang Diperlukan

### A. Supabase Dashboard

**1. Jalankan Migration (WAJIB)**
- SQL Editor → paste migration 20260101000008
- Run

**2. Verifikasi Trigger**
- Database → Triggers
- Pastikan `on_auth_user_created` ada dan enabled

**3. Verifikasi Policies**
- Authentication → Policies → profiles
- Harus ada:
  - "Allow authenticated to insert own profile"
  - "Allow service role to insert any profile"
  - "Users can view own profile"

**4. Cek Email Settings (Opsional)**
- Authentication → Email Templates
- Pastikan template sesuai brand
- Jika ingin enable email confirmation, update migration 20260101000005

### B. Vercel Dashboard

**1. Verifikasi Environment Variables**
- Settings → Environment Variables
- Pastikan ada:
  ```
  NEXT_PUBLIC_SUPABASE_URL=https://kevuyxaxdcenmrpqoxbq.supabase.co
  NEXT_PUBLIC_SUPABASE_ANON_KEY=[your-anon-key]
  ```

**2. Verifikasi Deployment**
- Deployments → Latest
- Klik "Visit" untuk test
- Cek Console (F12) untuk error

### C. Testing Checklist

- [ ] Migration 20260101000008 berhasil dijalankan
- [ ] Trigger `on_auth_user_created` aktif
- [ ] Registrasi email baru berhasil
- [ ] Registrasi email duplikat ditolak dengan pesan jelas
- [ ] Login berhasil dan redirect sesuai role
- [ ] Profil otomatis dibuat saat registrasi
- [ ] Akun lama tanpa profil diperbaiki (jika ada)

## Keterbatasan dan Catatan

### Yang Sudah Diperbaiki ✅
- Email duplikat terdeteksi dengan benar
- Profil diverifikasi setelah registrasi
- Login retry mechanism untuk race condition
- Trigger handle username conflict
- Error message user-friendly
- Database constraint untuk data integrity

### Yang Masih Perlu Dikonfigurasi Manual ⚠️
- Migration harus dijalankan di Supabase Dashboard
- Akun lama perlu diperbaiki dengan `repair_missing_profiles()`
- Email confirmation setting (saat ini disabled untuk development)

### Rekomendasi untuk Production 🚀
1. **Enable email confirmation:**
   - Hapus migration 20260101000005 atau update
   - Update Supabase Auth settings
   - Tambah halaman "verify email"

2. **Rate limiting:**
   - Implementasi rate limit untuk registrasi
   - Prevent brute force login

3. **Monitoring:**
   - Log registrasi dan login failures
   - Alert jika trigger gagal
   - Monitor query performance

4. **Security:**
   - Rotate Supabase keys secara berkala
   - Audit RLS policies
   - Review trigger permissions
