import { createClient } from "@/lib/supabase/server"
import BillingClient from "@/components/cashier/billing-client"

export default async function BillingPage() {
  const supabase = await createClient()

  const { data: computers } = await supabase
    .from('computers')
    .select(`
      *,
      computer_sessions!computer_sessions_computer_id_fkey (
        id,
        started_at,
        ended_at,
        hourly_rate,
        profiles!computer_sessions_customer_id_fkey (full_name)
      )
    `)
    .eq('is_active', true)
    .in('status', ['AVAILABLE', 'IN_USE'])
    .order('code', { ascending: true })

  // Filter to only show active sessions
  const computersWithActiveSessions = computers?.map(comp => ({
    ...comp,
    computer_sessions: comp.computer_sessions?.filter((s: any) => !s.ended_at)
  }))

  const { data: plans } = await supabase
    .from('billing_plans')
    .select('*')
    .eq('is_active', true)
    .order('price', { ascending: true })

  return (
    <BillingClient 
      computers={computersWithActiveSessions || []} 
      plans={plans || []}
    />
  )
}
