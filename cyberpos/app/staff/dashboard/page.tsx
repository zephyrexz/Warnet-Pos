import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

export default async function StaffDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  // Redirect to appropriate area
  if (profile?.role === 'CUSTOMER') {
    redirect('/customer/dashboard')
  } else if (profile?.role === 'CASHIER') {
    redirect('/cashier/dashboard')
  } else if (profile?.role === 'OWNER' || profile?.role === 'ADMIN') {
    redirect('/admin/dashboard')
  }

  redirect('/login')
}
