import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp } from "lucide-react"

export default async function MembershipsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'OWNER' && profile?.role !== 'ADMIN') redirect('/login')

  const { data: tiers } = await supabase
    .from('membership_tiers')
    .select('*')
    .eq('is_active', true)
    .order('min_points', { ascending: true })

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Membership</h2>
        <p className="text-muted-foreground mt-1">Kelola tier membership pelanggan</p>
      </div>

      <Card>
        <CardHeader><CardTitle>Tier Membership</CardTitle></CardHeader>
        <CardContent>
          {!tiers || tiers.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p>Belum ada tier membership.</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {tiers.map((tier: any) => (
                <div key={tier.id} className="border rounded-lg p-4 space-y-2">
                  <p className="font-semibold text-lg">{tier.name}</p>
                  <div className="text-sm space-y-1">
                    <div><span className="text-muted-foreground">Min Poin:</span> {tier.min_points}</div>
                    <div><span className="text-muted-foreground">Diskon:</span> {tier.discount_percent}%</div>
                  </div>
                  {tier.benefits && (
                    <div className="text-xs text-muted-foreground pt-2 border-t">
                      Benefits: {JSON.stringify(tier.benefits)}
                    </div>
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
