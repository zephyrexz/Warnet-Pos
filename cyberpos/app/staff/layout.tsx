'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function StaffLayout({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const checkRole = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        router.push('/login')
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      // Redirect to appropriate area
      if (profile?.role === 'CUSTOMER') {
        router.push('/customer/dashboard')
      } else if (profile?.role === 'CASHIER') {
        router.push('/cashier/dashboard')
      } else if (profile?.role === 'OWNER' || profile?.role === 'ADMIN') {
        router.push('/admin/dashboard')
      } else {
        router.push('/login')
      }
    }

    checkRole()
  }, [router])

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30">
      <div className="text-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4"></div>
        <p className="text-sm text-muted-foreground">Redirecting...</p>
      </div>
    </div>
  )
}

