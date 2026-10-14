'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { Users, Package, Settings, LogOut, LayoutDashboard, Computer, ShoppingCart, CreditCard, FileText, Menu, User } from 'lucide-react'

interface StaffLayoutProps {
  children: React.ReactNode
}

export default function StaffLayout({ children }: StaffLayoutProps) {
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [mobileOpen, setMobileOpen] = useState(false)
  const router = useRouter()
  const pathname = usePathname()

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

      if (data?.role === 'CUSTOMER') {
        router.push('/customer/dashboard')
        return
      }

      setProfile(data)
      setLoading(false)
    }

    getProfile()
  }, [router])

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-50">
        <div className="text-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    )
  }

  const isOwnerOrAdmin = profile?.role === 'OWNER' || profile?.role === 'ADMIN'

  const navItems = [
    { href: '/staff/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/staff/computers', label: 'Komputer', icon: Computer },
    { href: '/staff/billing', label: 'Billing', icon: CreditCard },
    { href: '/staff/pos', label: 'POS', icon: ShoppingCart },
    { href: '/staff/products', label: 'Produk', icon: Package },
  ]

  const adminItems = [
    { href: '/staff/plans', label: 'Paket', icon: FileText },
    { href: '/staff/categories', label: 'Kategori', icon: Settings },
    { href: '/staff/users', label: 'Users', icon: Users },
  ]

  const getRoleBadgeColor = (role: string) => {
    const colors: Record<string, string> = {
      OWNER: 'from-purple-100 to-pink-100 text-purple-700 border-purple-200',
      ADMIN: 'from-blue-100 to-indigo-100 text-blue-700 border-blue-200',
      CASHIER: 'from-green-100 to-emerald-100 text-green-700 border-green-200',
      TECHNICIAN: 'from-orange-100 to-amber-100 text-orange-700 border-orange-200',
    }
    return colors[role] || 'from-slate-100 to-gray-100 text-slate-700 border-slate-200'
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <nav className="sticky top-0 z-50 border-b bg-white/80 backdrop-blur-lg shadow-sm">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 lg:px-6">
          <div className="flex items-center gap-6">
            <Link href="/staff/dashboard" className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600">
                <Computer className="h-5 w-5 text-white" />
              </div>
              <span className="hidden sm:block text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                CyberPOS
              </span>
            </Link>
            <div className="hidden lg:flex gap-1">
              {navItems.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                      isActive 
                        ? 'bg-blue-100 text-blue-700' 
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                )
              })}
              {isOwnerOrAdmin && (
                <div className="flex gap-1 border-l pl-1 ml-1">
                  {adminItems.map((item) => {
                    const Icon = item.icon
                    const isActive = pathname === item.href
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                          isActive 
                            ? 'bg-blue-100 text-blue-700' 
                            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                        {item.label}
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-3">
              <div className={`flex items-center gap-2 rounded-full bg-gradient-to-r px-4 py-2 border ${getRoleBadgeColor(profile?.role)}`}>
                <User className="h-4 w-4" />
                <span className="text-sm font-medium">{profile?.full_name}</span>
                <span className="text-xs opacity-75">• {profile?.role}</span>
              </div>
              <Button variant="ghost" size="icon" onClick={handleLogout} className="rounded-full">
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
            
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild className="lg:hidden">
                <Button variant="ghost" size="icon">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-72">
                <div className="flex flex-col gap-4 mt-8">
                  <div className={`flex items-center gap-3 rounded-xl bg-gradient-to-r p-4 border ${getRoleBadgeColor(profile?.role)}`}>
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/50">
                      <User className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{profile?.full_name}</p>
                      <p className="text-xs opacity-75">{profile?.role}</p>
                    </div>
                  </div>
                  
                  <div className="flex flex-col gap-1">
                    <p className="text-xs font-semibold text-slate-500 px-2 mb-1">MENU UTAMA</p>
                    {navItems.map((item) => {
                      const Icon = item.icon
                      const isActive = pathname === item.href
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setMobileOpen(false)}
                          className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors ${
                            isActive 
                              ? 'bg-blue-100 text-blue-700' 
                              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                          }`}
                        >
                          <Icon className="h-5 w-5" />
                          {item.label}
                        </Link>
                      )
                    })}
                  </div>

                  {isOwnerOrAdmin && (
                    <div className="flex flex-col gap-1">
                      <p className="text-xs font-semibold text-slate-500 px-2 mb-1">ADMIN</p>
                      {adminItems.map((item) => {
                        const Icon = item.icon
                        const isActive = pathname === item.href
                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => setMobileOpen(false)}
                            className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors ${
                              isActive 
                                ? 'bg-blue-100 text-blue-700' 
                                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                            }`}
                          >
                            <Icon className="h-5 w-5" />
                            {item.label}
                          </Link>
                        )
                      })}
                    </div>
                  )}
                  
                  <Button 
                    variant="outline" 
                    className="w-full justify-start gap-3 mt-4" 
                    onClick={handleLogout}
                  >
                    <LogOut className="h-5 w-5" />
                    Keluar
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </nav>
      {children}
    </div>
  )
}
