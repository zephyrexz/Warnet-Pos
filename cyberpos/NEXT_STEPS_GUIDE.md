# PANDUAN MELANJUTKAN IMPLEMENTASI HALAMAN YANG BELUM SELESAI

Dokumen ini berisi panduan untuk melanjutkan implementasi halaman-halaman yang belum dibuat UI-nya, namun server actions-nya sudah tersedia.

---

## HALAMAN YANG SUDAH SELESAI ✅

1. `/admin/dashboard` - Dashboard admin
2. `/admin/computers` - Manajemen komputer (CRUD lengkap)
3. `/admin/products` - Manajemen produk (CRUD lengkap)
4. `/admin/categories` - Manajemen kategori (CRUD lengkap)
5. `/admin/billing` - Manajemen paket billing (CRUD lengkap)
6. `/cashier/dashboard` - Dashboard kasir
7. `/cashier/pos` - Point of Sale
8. `/cashier/billing` - Billing komputer
9. `/cashier/shifts` - Manajemen shift

---

## HALAMAN YANG PERLU DILENGKAPI

### 1. `/admin/users` - User Management

**Server Actions yang Tersedia:**
- `lib/actions/users.ts` - sudah lengkap

**Komponen yang Perlu Dibuat:**
```typescript
// components/admin/users-client.tsx
// Fitur:
// - List users dengan filter by role
// - Form create user (OWNER only)
// - Update role (OWNER only)
// - Activate/deactivate user
// - Tombol dan aksi harus check permission
```

**Contoh Implementasi:**
```typescript
'use client'
import { createUser, updateUserRole, deactivateUser } from '@/lib/actions/users'

export default function UsersClient({ users, userRole }) {
  // Similar pattern dengan computers-client.tsx
  // Dialog untuk create user
  // Dropdown menu untuk actions
  // Hide actions jika bukan OWNER
}
```

**Page:**
```typescript
// app/admin/users/page.tsx
import { getUsers } from '@/lib/actions/users'
import UsersClient from '@/components/admin/users-client'

export default async function UsersPage() {
  // Require OWNER permission
  const users = await getUsers()
  return <UsersClient users={users} userRole={profile.role} />
}
```

---

### 2. `/admin/transactions` - Transaction Management

**Server Actions yang Tersedia:**
- `lib/actions/sales.ts` - `getSales()`, `getSaleById()`

**Komponen yang Perlu Dibuat:**
```typescript
// components/admin/transactions-client.tsx
// Fitur:
// - List semua transaksi
// - Filter by date, cashier, payment method
// - Detail transaksi dengan items
// - Void/refund actions (jika ada permission)
```

**Page:**
```typescript
// app/admin/transactions/page.tsx
import { getSales } from '@/lib/actions/sales'
import TransactionsClient from '@/components/admin/transactions-client'

export default async function TransactionsPage() {
  const transactions = await getSales()
  return <TransactionsClient transactions={transactions} />
}
```

---

### 3. `/admin/reservations` - Reservation Management

**Server Actions yang Tersedia:**
- `lib/actions/reservations.ts` - sudah lengkap

**Komponen yang Perlu Dibuat:**
```typescript
// components/admin/reservations-client.tsx
// Fitur:
// - List reservasi dengan filter status dan tanggal
// - Confirm reservation
// - Cancel reservation dengan alasan
// - Check-in reservation
// - Mark no-show
```

**Page:**
```typescript
// app/admin/reservations/page.tsx
import { getReservations } from '@/lib/actions/reservations'
import ReservationsClient from '@/components/admin/reservations-client'

export default async function ReservationsPage() {
  const reservations = await getReservations()
  return <ReservationsClient reservations={reservations} />
}
```

---

### 4. `/admin/customers` - Customer Management

**Server Actions yang Tersedia:**
- `lib/actions/customers.ts` - sudah lengkap

**Komponen yang Perlu Dibuat:**
```typescript
// components/admin/customers-client.tsx
// Fitur:
// - List customers dengan search dan filter membership
// - Detail customer dengan transactions dan sessions history
// - Lihat poin dan wallet balance
```

**Page:**
```typescript
// app/admin/customers/page.tsx
import { getCustomers } from '@/lib/actions/customers'
import CustomersClient from '@/components/admin/customers-client'

export default async function CustomersPage() {
  const customers = await getCustomers()
  return <CustomersClient customers={customers} />
}
```

---

### 5. `/admin/maintenance` - Maintenance Management

**Server Actions yang Tersedia:**
- `lib/actions/maintenance.ts` - sudah lengkap

**Komponen yang Perlu Dibuat:**
```typescript
// components/admin/maintenance-client.tsx
// Fitur:
// - List tiket maintenance
// - Create new ticket
// - Assign technician
// - Update status
// - View resolution notes
```

**Page:**
```typescript
// app/admin/maintenance/page.tsx
import { getMaintenanceTickets } from '@/lib/actions/maintenance'
import MaintenanceClient from '@/components/admin/maintenance-client'

export default async function MaintenancePage() {
  const tickets = await getMaintenanceTickets()
  return <MaintenanceClient tickets={tickets} />
}
```

---

### 6. `/admin/inventory` - Inventory Management

**Komponen yang Perlu Dibuat:**
```typescript
// components/admin/inventory-client.tsx
// Fitur:
// - List products dengan stock info
// - Manual stock adjustment (dengan reason)
// - View inventory movements history
// - Low stock alerts
```

**Gunakan:**
- `adjustStock()` dari `lib/actions/products.ts`
- `getInventoryMovements()` dari `lib/actions/products.ts`

---

### 7. `/admin/reports` - Reports

**Server Actions yang Tersedia:**
- `lib/actions/reports.ts` - `getReports()`

**Komponen yang Perlu Dibuat:**
```typescript
// components/admin/reports-client.tsx
// Fitur:
// - Filter date range
// - Select report type: revenue, billing, products, inventory
// - Display charts
// - Export to CSV (optional)
```

---

### 8. `/technician/dashboard` - Technician Dashboard

**Komponen yang Perlu Dibuat:**
```typescript
// components/technician/dashboard-client.tsx
// Fitur:
// - List assigned tickets
// - Statistics (open, in progress, resolved)
// - Quick actions to update ticket status
```

**Page:**
```typescript
// app/technician/dashboard/page.tsx
import { getMyTickets } from '@/lib/actions/maintenance'
import TechnicianDashboard from '@/components/technician/dashboard-client'

export default async function TechnicianDashboardPage() {
  const tickets = await getMyTickets()
  return <TechnicianDashboard tickets={tickets} />
}
```

---

### 9. `/technician/tickets` - Technician Tickets

**Komponen yang Perlu Dibuat:**
```typescript
// components/technician/tickets-client.tsx
// Fitur:
// - List my assigned tickets
// - Update status (IN_PROGRESS, WAITING_PARTS, RESOLVED)
// - Add resolution notes
// - Add cost
```

---

## POLA UMUM UNTUK MEMBUAT HALAMAN BARU

### Step 1: Buat Client Component

```typescript
// components/[role]/[feature]-client.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { actionFunction } from '@/lib/actions/[feature]'

export default function FeatureClient({ initialData, userRole }) {
  const router = useRouter()
  const [data, setData] = useState(initialData)
  const [openDialog, setOpenDialog] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleAction = async () => {
    setLoading(true)
    try {
      await actionFunction(/* params */)
      toast.success('Berhasil')
      router.refresh()
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 space-y-6">
      {/* Your UI */}
    </div>
  )
}
```

### Step 2: Buat Server Page

```typescript
// app/[role]/[feature]/page.tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import FeatureClient from '@/components/[role]/[feature]-client'
import { getDataFunction } from '@/lib/actions/[feature]'

export default async function FeaturePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  
  // Check role
  if (!['OWNER', 'ADMIN'].includes(profile?.role)) {
    redirect('/login')
  }

  const data = await getDataFunction()

  return <FeatureClient initialData={data} userRole={profile.role} />
}
```

### Step 3: Conditional Rendering Berdasarkan Role

```typescript
// Dalam component
const canManage = userRole === 'OWNER' || userRole === 'ADMIN'
const canEdit = userRole === 'OWNER'

return (
  <>
    {canManage && (
      <Button onClick={handleAdd}>Tambah</Button>
    )}
    
    {canEdit && (
      <Button onClick={handleEdit}>Edit</Button>
    )}
  </>
)
```

---

## TIPS IMPLEMENTASI

### 1. Copy Pattern dari Halaman yang Sudah Ada
- Gunakan `computers-client.tsx` sebagai template untuk CRUD
- Gunakan `pos-client.tsx` sebagai template untuk transaksi
- Gunakan `shifts-client.tsx` sebagai template untuk form dengan perhitungan

### 2. Reuse Dialog Components
```typescript
// Buat reusable dialog jika pattern sama
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
```

### 3. Gunakan Toaster untuk Feedback
```typescript
import { toast } from 'sonner'

toast.success('Berhasil')
toast.error('Terjadi kesalahan')
toast.loading('Memproses...')
```

### 4. Always Use router.refresh()
```typescript
import { useRouter } from 'next/navigation'

const router = useRouter()
await actionFunction()
router.refresh() // Refresh server component data
```

### 5. Error Handling
```typescript
try {
  await actionFunction()
  toast.success('Berhasil')
} catch (error: any) {
  toast.error(error.message || 'Terjadi kesalahan')
}
```

---

## CHECKLIST UNTUK SETIAP HALAMAN BARU

- [ ] Server action sudah ada dan tested
- [ ] Client component dibuat dengan state management
- [ ] Page component dibuat dengan auth check
- [ ] Role permission dicek di 3 layer (UI, action, RLS)
- [ ] Form validation ditambahkan
- [ ] Loading state ditambahkan
- [ ] Error handling ditambahkan
- [ ] Success feedback dengan toast
- [ ] Responsive design
- [ ] Accessibility (labels, aria-labels)
- [ ] Tested dengan user role yang sesuai

---

## CONTOH LENGKAP: Membuat Halaman Users

### 1. Create Client Component

```typescript
// components/admin/users-client.tsx
'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, MoreVertical } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { createUser, updateUserRole, deactivateUser } from '@/lib/actions/users'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

export default function UsersClient({ users, userRole }) {
  const router = useRouter()
  const [openForm, setOpenForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    full_name: '',
    role: 'CASHIER',
    phone: '',
  })

  const handleCreate = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await createUser(formData)
      toast.success('User berhasil dibuat')
      setOpenForm(false)
      router.refresh()
    } catch (error) {
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDeactivate = async (id) => {
    if (!confirm('Yakin ingin menonaktifkan user?')) return
    try {
      await deactivateUser(id)
      toast.success('User berhasil dinonaktifkan')
      router.refresh()
    } catch (error) {
      toast.error(error.message)
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold">Manajemen User</h2>
        {userRole === 'OWNER' && (
          <Button onClick={() => setOpenForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Tambah User
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Daftar User</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {users.map(user => (
              <div key={user.id} className="border rounded p-4 flex justify-between items-center">
                <div>
                  <p className="font-semibold">{user.full_name}</p>
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge>{user.role}</Badge>
                  {userRole === 'OWNER' && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem onClick={() => handleDeactivate(user.id)}>
                          Nonaktifkan
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Dialog open={openForm} onOpenChange={setOpenForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tambah User</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Nama Lengkap *</Label>
                <Input
                  value={formData.full_name}
                  onChange={e => setFormData({...formData, full_name: e.target.value})}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Email *</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={e => setFormData({...formData, email: e.target.value})}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Password *</Label>
                <Input
                  type="password"
                  value={formData.password}
                  onChange={e => setFormData({...formData, password: e.target.value})}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Role *</Label>
                <Select value={formData.role} onValueChange={v => setFormData({...formData, role: v})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ADMIN">ADMIN</SelectItem>
                    <SelectItem value="CASHIER">CASHIER</SelectItem>
                    <SelectItem value="TECHNICIAN">TECHNICIAN</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpenForm(false)}>
                Batal
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Menyimpan...' : 'Simpan'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
```

### 2. Create Page

```typescript
// app/admin/users/page.tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import UsersClient from '@/components/admin/users-client'
import { getUsers } from '@/lib/actions/users'

export default async function UsersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  
  if (profile?.role !== 'OWNER' && profile?.role !== 'ADMIN') {
    redirect('/login')
  }

  const users = await getUsers()

  return <UsersClient users={users || []} userRole={profile.role} />
}
```

---

## PRIORITAS IMPLEMENTASI

Berdasarkan kebutuhan bisnis, prioritas:

1. **HIGH PRIORITY:**
   - `/admin/transactions` - Untuk monitoring penjualan
   - `/admin/inventory` - Untuk stock control
   - `/admin/users` - Untuk user management

2. **MEDIUM PRIORITY:**
   - `/admin/reservations` - Untuk manage reservasi
   - `/admin/customers` - Untuk customer relationship
   - `/admin/reports` - Untuk business intelligence

3. **LOW PRIORITY:**
   - `/admin/maintenance` - Jika ada teknisi
   - `/technician/*` - Jika ada role teknisi
   - Supplier & Purchase - Untuk procurement

---

## BANTUAN

Jika menemui kesulitan:
1. Lihat contoh halaman yang sudah jadi
2. Cek server action apakah sudah ada
3. Cek RLS policy di migration
4. Test dengan role yang sesuai
5. Lihat console untuk error

**Happy Coding!** 🚀
