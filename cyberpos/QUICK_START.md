# 🚀 CyberPOS Quick Start Guide

## Deploy dalam 15 Menit

### 1. Setup Supabase (5 menit)

1. **Buat Project**
   - Buka [supabase.com](https://supabase.com)
   - Klik "New Project"
   - Nama: "cyberpos-production"
   - Password database: [simpan dengan aman]
   - Region: Southeast Asia (Singapore)

2. **Apply Database Schema**
   ```bash
   # Option A: Via CLI
   cd cyberpos
   npx supabase db push --db-url "postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres"
   
   # Option B: Via Dashboard
   # SQL Editor > New Query > Copy-paste dari:
   # - supabase/migrations/20260101000000_initial_schema.sql
   # - supabase/migrations/20260101000001_functions.sql
   # Run each migration
   ```

3. **Configure Auth**
   - Authentication > URL Configuration
   - Site URL: `https://your-app.vercel.app` (update nanti)
   - Redirect URLs: `https://your-app.vercel.app/**`

4. **Get Credentials**
   - Settings > API
   - Salin:
     - Project URL: `https://xxxxx.supabase.co`
     - anon/public key: `eyJhbG...`
     - service_role key: `eyJhbG...` (RAHASIA!)

### 2. Setup Vercel (5 menit)

1. **Push ke GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial CyberPOS"
   git branch -M main
   git remote add origin https://github.com/username/cyberpos.git
   git push -u origin main
   ```

2. **Deploy di Vercel**
   - Buka [vercel.com](https://vercel.com)
   - "Import Project" > GitHub > pilih repo cyberpos
   - Framework: Next.js (auto-detected)

3. **Set Environment Variables**
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbG...
   SUPABASE_SERVICE_ROLE_KEY=eyJhbG...
   NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
   ```
   - Click "Deploy"

4. **Update Supabase Auth URLs**
   - Setelah deploy, salin domain Vercel
   - Kembali ke Supabase > Authentication > URL Configuration
   - Update Site URL dengan domain Vercel

### 3. Setup Initial Data (5 menit)

1. **Create Owner Account**
   - Buka `https://your-app.vercel.app`
   - Klik "Daftar"
   - Isi form registrasi
   - **Penting**: Catat email yang digunakan

2. **Promote to Owner** (via Supabase Dashboard)
   ```sql
   -- SQL Editor > New Query
   UPDATE profiles 
   SET role = 'OWNER' 
   WHERE email = 'your-email@example.com';
   ```

3. **Add Sample Data** (via SQL Editor)
   ```sql
   -- Kategori
   INSERT INTO product_categories (name, description) VALUES
   ('Makanan', 'Makanan ringan dan berat'),
   ('Minuman', 'Minuman dingin dan panas'),
   ('Aksesoris', 'Gaming gear dan aksesoris komputer');

   -- Sample Product
   INSERT INTO products (sku, name, category_id, cost_price, sell_price, stock, min_stock)
   SELECT 'PRD-001', 'Indomie Goreng', id, 2500, 3500, 100, 10
   FROM product_categories WHERE name = 'Makanan' LIMIT 1;

   -- Sample Computer
   INSERT INTO computers (code, name, location, hourly_rate, status)
   VALUES ('PC-01', 'Komputer 1', 'Lantai 1 - Kiri', 5000, 'AVAILABLE');

   -- Billing Plans
   INSERT INTO billing_plans (name, billing_type, duration_minutes, price, description)
   VALUES 
   ('Paket 1 Jam', 'PREPAID', 60, 5000, 'Paket hemat 1 jam'),
   ('Paket 2 Jam', 'PREPAID', 120, 9000, 'Paket 2 jam lebih murah'),
   ('Paket Malam', 'PREPAID', 240, 15000, 'Paket malam 4 jam');
   ```

---

## ✅ Verifikasi Setup

### Test 1: Owner Login
- Login dengan akun owner
- Harus redirect ke `/staff/dashboard`
- Dashboard menampilkan stats

### Test 2: Computer Billing
1. Klik menu "Komputer"
2. Lihat komputer yang ditambahkan
3. Klik "Mulai" pada komputer available
4. Isi form (customer opsional)
5. Submit → Komputer status jadi IN_USE
6. Buka "Billing" → Lihat active session
7. Klik "Stop & Bayar"
8. Input payment → Konfirmasi
9. Komputer kembali AVAILABLE ✅

### Test 3: POS Sales
1. Klik menu "POS"
2. Lihat produk yang ditambahkan
3. Klik produk → Masuk cart
4. Adjust quantity
5. Pilih payment method
6. Checkout ✅
7. Buka "Produk" → Stok berkurang ✅

---

## 🔧 Konfigurasi Lanjutan

### Tambah Komputer Banyak (via SQL)
```sql
INSERT INTO computers (code, name, location, hourly_rate, status)
SELECT 
  'PC-' || LPAD(i::text, 2, '0'),
  'Komputer ' || i,
  CASE 
    WHEN i <= 10 THEN 'Lantai 1'
    ELSE 'Lantai 2'
  END,
  5000,
  'AVAILABLE'
FROM generate_series(1, 20) i;
```

### Tambah Staff Cashier
```sql
-- 1. Register via UI dengan email kasir
-- 2. Update role:
UPDATE profiles 
SET role = 'CASHIER' 
WHERE email = 'kasir@yourdomain.com';
```

### Customize Settings
```sql
UPDATE app_settings 
SET value = '"Nama Warnet Anda"'
WHERE key = 'warnet_name';

UPDATE app_settings 
SET value = '"Jl. Alamat Warnet No. 123"'
WHERE key = 'warnet_address';

UPDATE app_settings 
SET value = '"021-12345678"'
WHERE key = 'warnet_phone';
```

---

## 📱 User Guide Singkat

### Untuk Kasir

**Start Sesi Billing:**
1. Dashboard > Komputer
2. Pilih komputer hijau (available)
3. Klik "Mulai"
4. Isi data customer (opsional) atau "Walk-in"
5. Pilih paket atau biarkan kosong untuk tarif standar
6. Submit

**Stop Sesi:**
1. Dashboard > Billing
2. Cari sesi yang mau diakhiri
3. Klik "Stop & Bayar"
4. Sistem otomatis hitung durasi & harga
5. Pilih metode pembayaran
6. Input jumlah bayar (jika cash)
7. Konfirmasi

**Transaksi POS:**
1. Dashboard > POS
2. Cari produk (search/filter kategori)
3. Klik produk untuk tambah ke cart
4. Adjust quantity dengan +/-
5. Pilih customer member (opsional)
6. Pilih payment method
7. Input payment (jika cash)
8. Klik "Bayar"

### Untuk Owner

**Setup Awal:**
1. Tambah semua komputer
2. Setup paket billing
3. Tambah kategori produk
4. Tambah produk
5. Create akun kasir (manual via SQL)

**Monitoring:**
- Dashboard: Lihat stats real-time
- Komputer: Monitor status semua PC
- Billing: Lihat sesi aktif
- Produk: Cek stok rendah

---

## 🆘 Troubleshooting

### Build Error di Vercel
```bash
# Local test dulu
npm run build

# Jika sukses tapi Vercel gagal:
# - Cek environment variables
# - Pastikan NEXT_PUBLIC_ prefix benar
```

### Auth Error "Invalid Redirect URL"
- Supabase > Authentication > URL Configuration
- Pastikan domain Vercel ada di Redirect URLs
- Format: `https://your-app.vercel.app/**`

### Database Connection Error
- Cek NEXT_PUBLIC_SUPABASE_URL benar
- Cek anon key benar
- Jangan pakai service role key di NEXT_PUBLIC_

### RLS Policy Error
```sql
-- Cek RLS aktif
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';

-- Cek policies
SELECT * FROM pg_policies WHERE schemaname = 'public';
```

### Komputer Tidak Bisa Start Session
- Cek status komputer = AVAILABLE
- Cek tidak ada sesi aktif lain
- Cek RLS policy untuk role user

---

## 📚 Cheat Sheet

### SQL Commands
```sql
-- Reset session (development only!)
UPDATE computers SET status = 'AVAILABLE';
UPDATE computer_sessions SET ended_at = NOW() WHERE ended_at IS NULL;

-- Check active sessions
SELECT 
  cs.*,
  c.name as computer_name,
  p.full_name
FROM computer_sessions cs
JOIN computers c ON cs.computer_id = c.id
LEFT JOIN profiles p ON cs.customer_id = p.id
WHERE cs.ended_at IS NULL;

-- Low stock products
SELECT name, stock, min_stock
FROM products
WHERE stock <= min_stock
ORDER BY stock;

-- Today's revenue
SELECT 
  COUNT(*) as transactions,
  SUM(total) as revenue
FROM sales
WHERE created_at >= CURRENT_DATE
  AND payment_status = 'PAID';
```

### Keyboard Shortcuts (POS)
- Focus search: `/`
- Clear cart: `Esc` (future)
- Quick checkout: `Enter` (future)

---

## 🎯 Next Steps

Setelah setup dasar:

1. **Week 1**: Operasional dasar
   - Train staff
   - Monitor performa
   - Collect feedback

2. **Week 2**: Data entry
   - Input semua komputer
   - Input semua produk
   - Verifikasi harga

3. **Week 3**: Optimization
   - Setup backup schedule
   - Add missing products
   - Adjust billing rates

4. **Month 2**: Enhancement
   - Add reservasi UI
   - Add reports
   - Add shift management

---

## 💡 Tips & Best Practices

### Keamanan
- Jangan share service role key
- Rotate password database periodic
- Backup data regular
- Monitor audit logs

### Performance
- Keep product list < 500 items (pagination future)
- Archive old sessions periodic
- Monitor Supabase usage

### Data Management
- Daily backup via Supabase Dashboard
- Export reports weekly
- Review low stock daily
- Reconcile cash daily

---

## 📞 Support

Jika butuh bantuan:
1. Cek `FINAL_STATUS.md` untuk status fitur
2. Cek `DEVELOPMENT.md` untuk patterns
3. Cek `README.md` untuk setup detail
4. Review SQL migrations untuk schema

---

**Setup Time**: ~15 menit  
**Training Time**: ~30 menit  
**Go-Live Ready**: ✅ Yes

Selamat menggunakan CyberPOS! 🎉
