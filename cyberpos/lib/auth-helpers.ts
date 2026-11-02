import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function getAuthProfile() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, email, full_name, role, avatar_url')
    .eq('id', user.id)
    .single()

  if (!profile) {
    redirect('/login')
  }

  return profile
}

export async function requireRole(allowedRoles: string[]) {
  const profile = await getAuthProfile()
  
  if (!allowedRoles.includes(profile.role)) {
    // Redirect based on actual role
    switch (profile.role) {
      case 'CUSTOMER':
        redirect('/customer/dashboard')
      case 'CASHIER':
        redirect('/cashier/dashboard')
      case 'ADMIN':
      case 'OWNER':
        redirect('/admin/dashboard')
      case 'TECHNICIAN':
        redirect('/technician/dashboard')
      default:
        redirect('/login')
    }
  }

  return profile
}
