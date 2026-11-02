import { requireRole } from '@/lib/auth-helpers'
import { Topbar } from '@/components/layout/topbar'
import { Sidebar } from '@/components/layout/sidebar'

interface CashierLayoutProps {
  children: React.ReactNode
}

export default async function CashierLayout({ children }: CashierLayoutProps) {
  const profile = await requireRole(['CASHIER', 'OWNER', 'ADMIN'])

  const navGroups = [
    {
      items: [
        { href: '/cashier/dashboard', label: 'Dashboard', icon: 'LayoutDashboard' as const },
        { href: '/cashier/pos', label: 'Point of Sale', icon: 'ShoppingCart' as const },
      ]
    },
    {
      label: 'Operasional',
      items: [
        { href: '/cashier/computers', label: 'Komputer', icon: 'Computer' as const },
        { href: '/cashier/billing', label: 'Billing', icon: 'CreditCard' as const },
        { href: '/cashier/reservations', label: 'Reservasi', icon: 'ClipboardList' as const },
        { href: '/cashier/shifts', label: 'Shift', icon: 'Clock' as const },
      ]
    },
    {
      label: 'Data',
      items: [
        { href: '/cashier/customers', label: 'Pelanggan', icon: 'Users' as const },
        { href: '/cashier/transactions', label: 'Transaksi', icon: 'Clock' as const },
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
