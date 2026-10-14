'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Menu, LogOut, User, Bell } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { createClient } from '@/lib/supabase/client'
import { NavGroup } from './sidebar'
import { cn } from '@/lib/utils'

interface TopbarProps {
  title?: string
  profile: {
    full_name: string
    role: string
  }
  mobileNav?: NavGroup[]
}

export function Topbar({ title, profile, mobileNav = [] }: TopbarProps) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const router = useRouter()

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  const getRoleBadgeColor = (role: string) => {
    const colors: Record<string, string> = {
      OWNER: 'bg-purple-100 text-purple-700',
      ADMIN: 'bg-blue-100 text-blue-700',
      CASHIER: 'bg-green-100 text-green-700',
      CUSTOMER: 'bg-slate-100 text-slate-700',
    }
    return colors[role] || 'bg-slate-100 text-slate-700'
  }

  return (
    <header className="sticky top-0 z-40 border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="flex h-16 items-center gap-4 px-4 lg:px-6">
        {/* Mobile menu */}
        {mobileNav.length > 0 && (
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild className="lg:hidden">
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0">
              <div className="flex flex-col h-full">
                <div className="p-6 border-b">
                  <div className={cn("inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium", getRoleBadgeColor(profile.role))}>
                    <User className="h-4 w-4" />
                    <div>
                      <p className="font-semibold">{profile.full_name}</p>
                      <p className="text-xs opacity-75">{profile.role}</p>
                    </div>
                  </div>
                </div>
                <nav className="flex-1 overflow-y-auto p-4 space-y-6">
                  {mobileNav.map((group, groupIndex) => (
                    <div key={groupIndex}>
                      {group.label && (
                        <p className="px-3 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                          {group.label}
                        </p>
                      )}
                      <div className="space-y-1">
                        {group.items.map((item) => {
                          const Icon = item.icon
                          return (
                            <Link
                              key={item.href}
                              href={item.href}
                              onClick={() => setMobileOpen(false)}
                              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                            >
                              <Icon className="h-5 w-5" />
                              <span>{item.label}</span>
                            </Link>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </nav>
                <div className="p-4 border-t">
                  <Button variant="outline" className="w-full justify-start" onClick={handleLogout}>
                    <LogOut className="h-4 w-4 mr-2" />
                    Keluar
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        )}

        {/* Title */}
        {title && (
          <h1 className="text-lg font-semibold">{title}</h1>
        )}

        <div className="flex-1" />

        {/* Right side */}
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-5 w-5" />
            <span className="absolute top-1 right-1 h-2 w-2 bg-destructive rounded-full" />
          </Button>

          <div className="hidden md:flex items-center gap-3 px-3 py-1.5 rounded-lg border">
            <div className="text-right">
              <p className="text-sm font-medium leading-none">{profile.full_name}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{profile.role}</p>
            </div>
          </div>

          <Button variant="ghost" size="icon" onClick={handleLogout} className="hidden md:flex">
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </header>
  )
}
