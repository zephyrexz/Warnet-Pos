'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Topbar } from '@/components/layout/topbar'
import { Sidebar } from '@/components/layout/sidebar'

interface CustomerLayoutProps {
  children: React.ReactNode
}

export default function CustomerLayout({ children }: CustomerLayoutProps) {
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

      if (data?.role !== 'CUSTOMER') {
        if (data?.role === 'CASHIER') {
          router.push('/cashier/dashboard')
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
        { href: '/customer/dashboard', label: 'Dashboard', icon: 'LayoutDashboard' as const },
        { href: '/customer/reservations', label: 'Reservasi', icon: 'Computer' as const },
        { href: '/customer/transactions', label: 'Transaksi', icon: 'CreditCard' as const },
        { href: '/customer/history', label: 'Riwayat', icon: 'Clock' as const },
        { href: '/customer/wallet', label: 'Wallet', icon: 'Wallet' as const },
        { href: '/customer/profile', label: 'Profil', icon: 'User' as const },
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
