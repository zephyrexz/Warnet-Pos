import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CreditCard } from "lucide-react"

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

  const { data: plans } = await supabase
    .from('billing_plans')
    .select('*')
    .eq('is_active', true)
    .order('price', { ascending: true })

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Paket Billing</h2>
        <p className="text-muted-foreground mt-1">Kelola tarif dan paket billing</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Daftar Paket</CardTitle>
        </CardHeader>
        <CardContent>
          {!plans || plans.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p>Belum ada paket billing.</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {plans.map((plan: any) => (
                <div key={plan.id} className="border rounded-lg p-4 space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-lg">{plan.name}</p>
                      <p className="text-sm text-muted-foreground">{plan.billing_type}</p>
                    </div>
                  </div>
                  {plan.duration_minutes && (
                    <p className="text-sm">Durasi: {plan.duration_minutes} menit</p>
                  )}
                  <p className="text-2xl font-bold text-primary">
                    Rp {Number(plan.price).toLocaleString('id-ID')}
                  </p>
                  {plan.description && (
                    <p className="text-sm text-muted-foreground">{plan.description}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
