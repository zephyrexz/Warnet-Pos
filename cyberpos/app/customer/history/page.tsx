import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Monitor, Clock, TrendingUp } from "lucide-react"

export default async function HistoryPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (profile?.role !== 'CUSTOMER') redirect('/login')

  const { data: sessions } = await supabase
    .from('computer_sessions')
    .select(`
      *,
      computers (code, name),
      billing_plans (name)
    `)
    .eq('customer_id', user.id)
    .not('ended_at', 'is', null)
    .order('started_at', { ascending: false })

  const totalMinutes = sessions?.reduce((sum, s) => {
    if (!s.ended_at) return sum
    const duration = (new Date(s.ended_at).getTime() - new Date(s.started_at).getTime()) / (1000 * 60)
    return sum + duration
  }, 0) || 0

  const totalCost = sessions?.reduce((sum, s) => {
    if (!s.ended_at) return sum
    const duration = (new Date(s.ended_at).getTime() - new Date(s.started_at).getTime()) / (1000 * 60 * 60)
    const cost = duration * Number(s.hourly_rate) * (1 - Number(s.discount_percent) / 100)
    return sum + cost
  }, 0) || 0

  const stats = {
    total: sessions?.length || 0,
    totalHours: Math.round(totalMinutes / 60 * 10) / 10,
    totalCost: totalCost,
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Riwayat Penggunaan</h2>
        <p className="text-muted-foreground mt-1">Riwayat sesi komputer Anda</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sesi</CardTitle>
            <Monitor className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Waktu</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalHours} jam</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Biaya</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              Rp {Math.round(stats.totalCost).toLocaleString('id-ID')}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Daftar Riwayat</CardTitle>
        </CardHeader>
        <CardContent>
          {!sessions || sessions.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Monitor className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p>Belum ada riwayat penggunaan.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {sessions.map((session: any) => {
                const duration = session.ended_at 
                  ? (new Date(session.ended_at).getTime() - new Date(session.started_at).getTime()) / (1000 * 60)
                  : 0
                const durationHours = Math.floor(duration / 60)
                const durationMinutes = Math.round(duration % 60)
                const cost = (duration / 60) * Number(session.hourly_rate) * (1 - Number(session.discount_percent) / 100)

                return (
                  <div key={session.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <p className="font-semibold">{session.computers?.name}</p>
                        <p className="text-sm text-muted-foreground">
                          Kode: {session.computers?.code}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Total Biaya</p>
                        <p className="text-lg font-bold">
                          Rp {Math.round(cost).toLocaleString('id-ID')}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Mulai</p>
                        <p className="font-medium">
                          {new Date(session.started_at).toLocaleString('id-ID')}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Selesai</p>
                        <p className="font-medium">
                          {session.ended_at 
                            ? new Date(session.ended_at).toLocaleString('id-ID')
                            : '-'}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Durasi</p>
                        <p className="font-medium">
                          {durationHours > 0 && `${durationHours} jam `}
                          {durationMinutes} menit
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Tarif/Jam</p>
                        <p className="font-medium">
                          Rp {Number(session.hourly_rate).toLocaleString('id-ID')}
                        </p>
                      </div>
                    </div>

                    {session.billing_plans && (
                      <div className="text-sm">
                        <p className="text-muted-foreground">Paket</p>
                        <p className="font-medium">{session.billing_plans.name}</p>
                      </div>
                    )}

                    {Number(session.discount_percent) > 0 && (
                      <div className="text-sm">
                        <p className="text-muted-foreground">Diskon</p>
                        <p className="font-medium">{session.discount_percent}%</p>
                      </div>
                    )}

                    {session.notes && (
                      <div className="text-sm text-muted-foreground">
                        <p className="font-medium">Catatan:</p>
                        <p>{session.notes}</p>
                      </div>
                    )}
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
