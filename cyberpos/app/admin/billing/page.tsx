import { getAuthProfile } from "@/lib/auth-helpers"
import BillingPlansClient from "@/components/admin/billing-plans-client"
import { getBillingPlans } from "@/lib/actions/billing"

export default async function BillingPage() {
  const profile = await getAuthProfile()
  const plans = await getBillingPlans()

  return <BillingPlansClient initialPlans={plans || []} userRole={profile.role} />
}
