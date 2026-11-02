import { requireRole } from '@/lib/auth-helpers'
import { Topbar } from '@/components/layout/topbar'
import { Sidebar } from '@/components/layout/sidebar'

interface AdminLayoutProps {
  children: React.ReactNode
}

export default async function AdminLayout({ children }: AdminLayoutProps) {
  const profile = await requireRole(['OWNER', 'ADMIN'])

  const navGroups = [
    {
      label: 'Overview',
      items: [
        { href: '/admin/dashboard', label: 'Dashboard', icon: 'LayoutDashboard' as const },
      ]
    },
    {
      label: 'Operasional',
      items: [
        { href: '/admin/computers', label: 'Komputer', icon: 'Computer' as const },
        { href: '/admin/billing', label: 'Billing', icon: 'CreditCard' as const },
        { href: '/admin/reservations', label: 'Reservasi', icon: 'ClipboardList' as const },
        { href: '/admin/maintenance', label: 'Maintenance', icon: 'Wrench' as const },
      ]
    },
    {
      label: 'Penjualan',
      items: [
        { href: '/admin/transactions', label: 'Transaksi', icon: 'ShoppingCart' as const },
        { href: '/admin/products', label: 'Produk', icon: 'Package' as const },
        { href: '/admin/categories', label: 'Kategori', icon: 'FileText' as const },
      ]
    },
    {
      label: 'Pelanggan',
      items: [
        { href: '/admin/customers', label: 'Pelanggan', icon: 'Users' as const },
        { href: '/admin/memberships', label: 'Membership', icon: 'TrendingUp' as const },
      ]
    },
    {
      label: 'Keuangan',
      items: [
        { href: '/admin/reports', label: 'Laporan', icon: 'FileText' as const },
        { href: '/admin/expenses', label: 'Pengeluaran', icon: 'DollarSign' as const },
      ]
    },
    {
      label: 'Sistem',
      items: [
        { href: '/admin/users', label: 'Pengguna', icon: 'UserCog' as const },
        { href: '/admin/settings', label: 'Pengaturan', icon: 'Settings' as const },
      ]
    },
  ]

  return (
    <div className="flex min-h-screen bg-muted/30">
      <Sidebar groups={navGroups} />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar profile={profile} mobileNav={navGroups} />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
