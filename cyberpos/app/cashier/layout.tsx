import { requireRole } from '@/lib/auth-helpers'
import { Topbar } from '@/components/layout/topbar'
import { Sidebar } from '@/components/layout/sidebar'
import { 
  LayoutDashboard, 
  Computer, 
  CreditCard, 
  ShoppingCart, 
  Users, 
  ClipboardList,
  Clock
} from 'lucide-react'

interface CashierLayoutProps {
  children: React.ReactNode
}

export default async function CashierLayout({ children }: CashierLayoutProps) {
  const profile = await requireRole(['CASHIER', 'OWNER', 'ADMIN'])

  const navGroups = [
    {
      items: [
        { href: '/cashier/dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { href: '/cashier/pos', label: 'Point of Sale', icon: ShoppingCart },
      ]
    },
    {
      label: 'Operasional',
      items: [
        { href: '/cashier/computers', label: 'Komputer', icon: Computer },
        { href: '/cashier/billing', label: 'Billing', icon: CreditCard },
        { href: '/cashier/reservations', label: 'Reservasi', icon: ClipboardList },
        { href: '/cashier/shifts', label: 'Shift', icon: Clock },
      ]
    },
    {
      label: 'Data',
      items: [
        { href: '/cashier/customers', label: 'Pelanggan', icon: Users },
        { href: '/cashier/transactions', label: 'Transaksi', icon: Clock },
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
