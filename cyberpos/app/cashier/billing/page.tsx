import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CreditCard } from "lucide-react"

export default async function BillingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'CASHIER') redirect('/login')

  const { data: activeSessions } = await supabase
    .from('computer_sessions')
    .select(`
      *,
      computers (code, name),
      customers (member_number),
      profiles!computer_sessions_customer_id_fkey (full_name)
    `)
    .is('ended_at', null)
    .order('started_at', { ascending: true })

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Billing</h2>
        <p className="text-muted-foreground mt-1">Kelola sesi billing komputer</p>
      </div>

      <Card>
        <CardHeader><CardTitle>Sesi Aktif</CardTitle></CardHeader>
        <CardContent>
          {!activeSessions || activeSessions.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p>Tidak ada sesi aktif.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {activeSessions.map((session: any) => {
                const duration = Math.floor((Date.now() - new Date(session.started_at).getTime()) / 60000)
                const hours = Math.floor(duration / 60)
                const minutes = duration % 60
                const estimatedCost = (duration / 60) * Number(session.hourly_rate) * (1 - Number(session.discount_percent) / 100)

                return (
                  <div key={session.id} className="border rounded-lg p-4 space-y-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-semibold">{session.computers?.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {session.profiles?.full_name || 'Walk-in'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Estimasi</p>
                        <p className="font-bold">Rp {Math.round(estimatedCost).toLocaleString('id-ID')}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm pt-2 border-t">
                      <div><span className="text-muted-foreground">Mulai:</span> {new Date(session.started_at).toLocaleTimeString('id-ID')}</div>
                      <div><span className="text-muted-foreground">Durasi:</span> {hours}j {minutes}m</div>
                      <div><span className="text-muted-foreground">Tarif:</span> Rp {Number(session.hourly_rate).toLocaleString('id-ID')}/jam</div>
                      {Number(session.discount_percent) > 0 && (
                        <div><span className="text-muted-foreground">Diskon:</span> {session.discount_percent}%</div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
