'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
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

export default function CashierLayout({ children }: CashierLayoutProps) {
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const getProfile = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        router.push('/login')
        return
      }

      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (data?.role !== 'CASHIER') {
        if (data?.role === 'CUSTOMER') {
          router.push('/customer/dashboard')
        } else if (data?.role === 'OWNER' || data?.role === 'ADMIN') {
          router.push('/admin/dashboard')
        } else {
          router.push('/login')
        }
        return
      }

      setProfile(data)
      setLoading(false)
    }

    getProfile()
  }, [router])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4"></div>
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

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
