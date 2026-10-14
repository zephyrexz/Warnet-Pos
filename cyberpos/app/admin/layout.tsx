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
  Package, 
  Users, 
  Settings, 
  FileText, 
  DollarSign,
  TrendingUp,
  UserCog,
  ClipboardList,
  Wrench
} from 'lucide-react'

interface AdminLayoutProps {
  children: React.ReactNode
}

export default function AdminLayout({ children }: AdminLayoutProps) {
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

      if (data?.role !== 'OWNER' && data?.role !== 'ADMIN') {
        if (data?.role === 'CUSTOMER') {
          router.push('/customer/dashboard')
        } else if (data?.role === 'CASHIER') {
          router.push('/cashier/dashboard')
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
      label: 'Overview',
      items: [
        { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      ]
    },
    {
      label: 'Operasional',
      items: [
        { href: '/admin/computers', label: 'Komputer', icon: Computer },
        { href: '/admin/billing', label: 'Billing', icon: CreditCard },
        { href: '/admin/reservations', label: 'Reservasi', icon: ClipboardList },
        { href: '/admin/maintenance', label: 'Maintenance', icon: Wrench },
      ]
    },
    {
      label: 'Penjualan',
      items: [
        { href: '/admin/transactions', label: 'Transaksi', icon: ShoppingCart },
        { href: '/admin/products', label: 'Produk', icon: Package },
        { href: '/admin/categories', label: 'Kategori', icon: FileText },
      ]
    },
    {
      label: 'Pelanggan',
      items: [
        { href: '/admin/customers', label: 'Pelanggan', icon: Users },
        { href: '/admin/memberships', label: 'Membership', icon: TrendingUp },
      ]
    },
    {
      label: 'Keuangan',
      items: [
        { href: '/admin/reports', label: 'Laporan', icon: FileText },
        { href: '/admin/expenses', label: 'Pengeluaran', icon: DollarSign },
      ]
    },
    {
      label: 'Sistem',
      items: [
        { href: '/admin/users', label: 'Pengguna', icon: UserCog },
        { href: '/admin/settings', label: 'Pengaturan', icon: Settings },
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
