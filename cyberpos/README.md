# CyberPOS - Warnet Management System

Aplikasi POS (Point of Sale) warnet modern dengan Next.js, Supabase, dan TypeScript.

## Stack Teknologi

- **Frontend**: Next.js 16, React 19, TypeScript, Tailwind CSS
- **UI Components**: shadcn/ui, Radix UI, Lucide Icons
- **Backend**: Next.js Route Handlers, Server Actions
- **Database**: Supabase PostgreSQL
- **Authentication**: Supabase Auth
- **Storage**: Supabase Storage
- **Real-time**: Supabase Realtime
- **Form**: React Hook Form, Zod
- **Deployment**: Vercel (frontend), Supabase (backend)

## Fitur Utama

### Untuk Pelanggan
- ✅ Registrasi dan login
- ✅ Dashboard pelanggan
- ✅ Membership dengan tier (Regular, Silver, Gold, Platinum)
- ✅ Loyalty points
- ✅ Wallet digital
- ✅ Reservasi komputer
- ✅ Riwayat penggunaan dan transaksi

### Untuk Staff
- ✅ Dashboard staff dengan statistik real-time
- ✅ Billing komputer (prepaid & postpaid)
- ✅ POS kasir dengan manajemen inventaris
- ✅ Manajemen komputer
- ✅ Manajemen produk dan kategori
- ✅ Shift kasir
- ✅ Maintenance komputer
- ✅ Laporan penjualan

### Role-Based Access Control
- **OWNER**: Akses penuh ke semua fitur
- **ADMIN**: Manajemen operasional
- **CASHIER**: Billing, POS, transaksi
- **TECHNICIAN**: Maintenance komputer
- **CUSTOMER**: Portal pelanggan

## Instalasi

### Prerequisites
- Node.js 20+
- npm atau yarn
- Akun Supabase

### Setup Project

1. Clone repository:
```bash
git clone <repository-url>
cd cyberpos
```

2. Install dependencies:
```bash
npm install
```

3. Setup Supabase:
```bash
npx supabase init
npx supabase start  # untuk development lokal
```

4. Jalankan migrations:
```bash
npx supabase db push
```

5. Setup environment variables:

Salin `.env.example` ke `.env.local`:
```bash
cp .env.example .env.local
```

Isi dengan kredensial Supabase Anda:
```env
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

6. Jalankan development server:
```bash
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000)

## Membuat Akun Owner Pertama

Setelah aplikasi berjalan, buat akun owner melalui Supabase Dashboard:

1. Buka Supabase Dashboard > Authentication > Users
2. Buat user baru atau pilih user yang sudah ada
3. Buka Table Editor > profiles
4. Update role user menjadi 'OWNER'

## Database Schema

### Tables Utama

**Authentication & Users**
- `profiles` - Profile pengguna dengan role
- `customers` - Data pelanggan extended
- `membership_tiers` - Tingkatan membership

**Operational**
- `computers` - Data komputer
- `computer_sessions` - Sesi billing komputer
- `billing_plans` - Paket billing
- `reservations` - Reservasi komputer

**Products & Inventory**
- `products` - Produk untuk dijual
- `product_categories` - Kategori produk
- `inventory_movements` - History pergerakan stok
- `suppliers` - Data supplier

**Transactions**
- `sales` - Transaksi penjualan
- `sale_items` - Detail item penjualan
- `cashier_shifts` - Shift kasir
- `expenses` - Pengeluaran operasional

**Loyalty & Wallet**
- `loyalty_point_transactions` - Transaksi poin
- `wallet_transactions` - Transaksi wallet
- `vouchers` - Voucher dan promo

**Maintenance**
- `maintenance_tickets` - Tiket maintenance komputer

**System**
- `notifications` - Notifikasi pengguna
- `audit_logs` - Audit trail
- `app_settings` - Pengaturan aplikasi

### Database Functions

- `start_computer_session()` - Memulai sesi billing dengan validasi
- `stop_computer_session()` - Mengakhiri sesi dan hitung tagihan
- `process_pos_checkout()` - Proses checkout POS dengan atomic transaction
- `handle_new_user()` - Trigger untuk membuat profile saat registrasi

## Row Level Security (RLS)

Semua tabel menggunakan RLS untuk keamanan data:

- **Pelanggan**: Hanya bisa akses data sendiri
- **Cashier**: Akses operasional terbatas
- **Admin/Owner**: Akses penuh sesuai permission

## API Routes

### Authentication
- `POST /api/auth/logout` - Logout

### Billing
- `POST /api/billing/start` - Mulai sesi komputer
- `POST /api/billing/stop` - Stop sesi komputer

### POS
- `POST /api/pos/checkout` - Checkout transaksi

## Testing

```bash
# Unit tests
npm test

# E2E tests
npm run test:e2e
```

## Deployment

### Deploy ke Vercel

1. Push code ke GitHub
2. Import project di Vercel
3. Set environment variables di Vercel Dashboard
4. Deploy

### Setup Supabase Production

1. Buat project baru di Supabase
2. Jalankan migrations:
```bash
npx supabase db push --db-url <your-production-db-url>
```
3. Configure Auth URLs di Supabase Dashboard:
   - Site URL: `https://your-domain.com`
   - Redirect URLs: `https://your-domain.com/**`

## Security

- ✅ Supabase Auth untuk autentikasi
- ✅ RLS untuk authorization database
- ✅ Server-side validation untuk semua operasi kritis
- ✅ Idempotency key untuk transaksi keuangan
- ✅ Input validation dengan Zod
- ✅ HTTPS only pada production
- ✅ No secret keys di frontend

## Batasan & Fitur Eksternal

### Belum Diimplementasikan
- ❌ Email SMTP (gunakan Supabase Auth email default)
- ❌ Payment gateway integration (manual recording only)
- ❌ ESC/POS printer integration (digital receipt only)
- ❌ Remote PC control agent
- ❌ Scheduled jobs untuk auto-expire reservasi (manual untuk sekarang)

### Cara Implementasi Next Steps

**Email SMTP**: Setup di Supabase Dashboard > Authentication > Email Templates

**Payment Gateway**: Tambahkan webhook handler di `/app/api/payments/webhook`

**Printer**: Buat Windows service untuk ESC/POS communication

**Cron Jobs**: Setup Vercel Cron atau Supabase pg_cron

## Troubleshooting

### Build errors
```bash
npm run build
# Check for TypeScript errors
```

### Database connection issues
- Verify Supabase URL dan keys
- Check RLS policies
- Verify user roles

### Auth issues
- Check redirect URLs di Supabase
- Verify cookie settings
- Clear browser cache

## Backup & Recovery

1. Backup database via Supabase Dashboard
2. Export melalui pg_dump:
```bash
pg_dump <your-db-url> > backup.sql
```
3. Restore:
```bash
psql <your-db-url> < backup.sql
```

## Support

Untuk bantuan lebih lanjut, dokumentasi Supabase: https://supabase.com/docs

## License

Private - Internal Use Only
