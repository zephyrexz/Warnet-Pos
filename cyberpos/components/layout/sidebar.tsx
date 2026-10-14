'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface NavItem {
  href: string
  label: string
  icon: LucideIcon
  badge?: string
}

export interface NavGroup {
  label?: string
  items: NavItem[]
}

interface SidebarProps {
  groups: NavGroup[]
  collapsed?: boolean
}

export function Sidebar({ groups, collapsed = false }: SidebarProps) {
  const pathname = usePathname()

  return (
    <aside className={cn(
      "hidden lg:flex flex-col bg-white border-r border-border",
      collapsed ? "w-16" : "w-64"
    )}>
      <nav className="flex-1 overflow-y-auto p-4 space-y-6">
        {groups.map((group, groupIndex) => (
          <div key={groupIndex}>
            {group.label && !collapsed && (
              <p className="px-3 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {group.label}
              </p>
            )}
            <div className="space-y-1">
              {group.items.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
                
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                      isActive 
                        ? "bg-primary/10 text-primary" 
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    )}
                  >
                    <Icon className="h-5 w-5 flex-shrink-0" />
                    {!collapsed && (
                      <>
                        <span className="flex-1">{item.label}</span>
                        {item.badge && (
                          <span className="px-2 py-0.5 text-xs font-medium bg-primary/10 text-primary rounded">
                            {item.badge}
                          </span>
                        )}
                      </>
                    )}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  )
}
