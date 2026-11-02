import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import ShiftsClient from "@/components/cashier/shifts-client"
import { getCurrentShift } from "@/lib/actions/shifts"

export default async function ShiftsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  
  if (profile?.role !== 'CASHIER' && profile?.role !== 'OWNER' && profile?.role !== 'ADMIN') {
    redirect('/login')
  }

  const currentShift = await getCurrentShift()

  // Get shift history (last 10 closed shifts)
  const { data: history } = await supabase
    .from('cashier_shifts')
    .select('*')
    .eq('cashier_id', user.id)
    .not('closed_at', 'is', null)
    .order('closed_at', { ascending: false })
    .limit(10)

  return (
    <ShiftsClient 
      currentShift={currentShift}
      shiftHistory={history || []}
    />
  )
}
