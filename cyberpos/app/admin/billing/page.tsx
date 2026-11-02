import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import BillingPlansClient from "@/components/admin/billing-plans-client"
import { getBillingPlans } from "@/lib/actions/billing"

export default async function BillingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  
  if (profile?.role !== 'OWNER' && profile?.role !== 'ADMIN') redirect('/login')

  const plans = await getBillingPlans()

  return <BillingPlansClient initialPlans={plans || []} userRole={profile.role} />
}
