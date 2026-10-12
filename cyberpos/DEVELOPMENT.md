# CyberPOS Development Guide

## Struktur Proyek

```
cyberpos/
├── app/                      # Next.js App Router
│   ├── api/                  # API Routes
│   │   ├── auth/            # Authentication endpoints
│   │   ├── billing/         # Billing operations
│   │   └── pos/             # POS operations
│   ├── customer/            # Customer portal
│   ├── staff/               # Staff dashboard
│   ├── login/               # Login page
│   ├── register/            # Register page
│   ├── layout.tsx           # Root layout
│   ├── page.tsx             # Landing page
│   └── globals.css          # Global styles
├── components/
│   └── ui/                  # shadcn/ui components
├── lib/
│   ├── supabase/            # Supabase clients
│   └── utils.ts             # Utility functions
├── hooks/
│   └── use-toast.ts         # Toast hook
├── supabase/
│   └── migrations/          # Database migrations
├── tests/
│   └── e2e/                 # E2E tests
└── public/                  # Static assets
```

## Database Schema Overview

### Core Tables

**profiles**: User profiles dengan role (OWNER, ADMIN, CASHIER, TECHNICIAN, CUSTOMER)
**customers**: Extended customer data dengan membership
**computers**: Komputer warnet
**computer_sessions**: Billing sessions
**billing_plans**: Paket billing (prepaid/postpaid)

### Product & Inventory

**products**: Produk untuk dijual
**product_categories**: Kategori produk
**inventory_movements**: History stok
**suppliers**: Data supplier

### Sales

**sales**: Header transaksi
**sale_items**: Detail item per transaksi
**cashier_shifts**: Shift kasir
**expenses**: Pengeluaran operasional

### Loyalty & Wallet

**membership_tiers**: Tier membership (Regular, Silver, Gold, Platinum)
**loyalty_point_transactions**: Ledger poin
**wallet_transactions**: Ledger wallet
**vouchers**: Voucher promo

## API Endpoints

### Billing

**POST /api/billing/start**
```json
{
  "computer_id": "uuid",
  "customer_id": "uuid|null",
  "billing_plan_id": "uuid|null",
  "started_by": "uuid",
  "planned_duration_minutes": 60
}
```

**POST /api/billing/stop**
```json
{
  "session_id": "uuid",
  "stopped_by": "uuid"
}
```

### POS

**POST /api/pos/checkout**
```json
{
  "cashier_id": "uuid",
  "customer_id": "uuid|null",
  "items": [
    {
      "product_id": "uuid",
      "quantity": 1
    }
  ],
  "payment_method": "CASH|QRIS|TRANSFER|WALLET",
  "discount_percent": 0,
  "paid_amount": 50000,
  "idempotency_key": "unique-key"
}
```

## Database Functions (RPC)

### start_computer_session
Memulai sesi billing dengan validasi atomik:
- Lock komputer
- Cek status availability
- Cek sesi ganda
- Create session
- Update status komputer

### stop_computer_session
Menghentikan sesi dan hitung tagihan:
- Lock session
- Hitung durasi
- Round up (15 menit)
- Hitung amount
- Update session
- Update status komputer

### process_pos_checkout
Proses checkout dengan transaksi atomik:
- Validasi stok semua item
- Create sale
- Create sale items
- Update stok
- Create inventory movements
- Idempotency protection

## Row Level Security Patterns

### Customer Data Access
```sql
-- Customer hanya bisa lihat data sendiri
create policy "customers_select_own" on customers
  for select using (auth.uid() = id);
```

### Staff Access
```sql
-- Staff bisa lihat semua data customer
create policy "staff_select_all_customers" on customers
  for select using (
    exists (
      select 1 from profiles 
      where id = auth.uid() 
      and role in ('OWNER', 'ADMIN', 'CASHIER')
    )
  );
```

## Development Workflow

### 1. Membuat Fitur Baru

```bash
# 1. Buat migration
npx supabase migration new feature_name

# 2. Edit SQL di supabase/migrations/

# 3. Apply migration
npx supabase db push

# 4. Generate types
npx supabase gen types typescript --local > types/supabase.ts
```

### 2. Testing

```bash
# Unit tests
npm test

# E2E tests
npm run test:e2e

# Type checking
npm run build
```

### 3. Debugging

**Database Issues:**
- Check RLS policies di Supabase Dashboard
- Test policies dengan different users
- Check foreign key constraints

**Auth Issues:**
- Verify callback URLs
- Check session cookies
- Verify user roles

## Common Patterns

### Server Component dengan Auth
```tsx
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

export default async function Page() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) redirect('/login')
  
  const { data } = await supabase
    .from('table')
    .select('*')
  
  return <div>{/* render */}</div>
}
```

### Client Component dengan Mutations
```tsx
'use client'

import { createClient } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"

export function Component() {
  const supabase = createClient()
  const { toast } = useToast()
  
  const handleAction = async () => {
    const { error } = await supabase
      .from('table')
      .insert({ data })
    
    if (error) {
      toast({ 
        variant: "destructive",
        title: "Error",
        description: error.message 
      })
      return
    }
    
    toast({ title: "Berhasil" })
  }
  
  return <button onClick={handleAction}>Action</button>
}
```

### Calling Database Functions
```tsx
const { data, error } = await supabase.rpc('function_name', {
  p_param1: value1,
  p_param2: value2,
})
```

## Security Checklist

- [ ] All tables have RLS enabled
- [ ] Service role key only used server-side
- [ ] All financial calculations done server-side
- [ ] Input validation with Zod
- [ ] Idempotency keys for transactions
- [ ] No secrets in frontend code
- [ ] HTTPS only in production
- [ ] Auth redirect URLs configured

## Performance Tips

- Use select only needed columns
- Add indexes for frequently queried columns
- Use pagination for large lists
- Cache static data (membership tiers, settings)
- Use Supabase Realtime only when needed

## Troubleshooting

### "Row Level Security" Error
RLS policy tidak mengizinkan operasi. Cek:
1. User sudah login?
2. Role user sesuai?
3. Policy condition benar?

### "duplicate key value" Error
Unique constraint violated. Cek:
1. Username/email sudah ada?
2. SKU/code sudah digunakan?
3. Invoice number collision?

### "violates foreign key constraint"
Referensi tidak valid. Cek:
1. ID yang direferensikan exists?
2. Cascade delete configuration?
3. Transaction order?

## Next Steps untuk Pengembangan

### Priority 1 (Core Features)
- [ ] POS UI dengan shopping cart
- [ ] Billing UI dengan computer selection
- [ ] Manajemen produk CRUD
- [ ] Manajemen komputer CRUD
- [ ] Shift kasir flow

### Priority 2 (Advanced)
- [ ] Reservasi UI
- [ ] Laporan keuangan
- [ ] Maintenance tickets
- [ ] Voucher management
- [ ] Customer portal lengkap

### Priority 3 (Integration)
- [ ] SMTP configuration
- [ ] Payment gateway
- [ ] Printer integration
- [ ] Scheduled jobs (Vercel Cron)
- [ ] Remote PC control agent

## Resources

- [Next.js Docs](https://nextjs.org/docs)
- [Supabase Docs](https://supabase.com/docs)
- [shadcn/ui](https://ui.shadcn.com)
- [Tailwind CSS](https://tailwindcss.com)
