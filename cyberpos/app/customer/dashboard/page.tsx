import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatCurrency } from "@/lib/utils"
import { Computer, Ticket, Wallet, TrendingUp } from "lucide-react"

export default async function CustomerDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'CUSTOMER') redirect('/login')

  const { data: customer } = await supabase
    .from('customers')
    .select(`
      *,
      membership_tiers (name, discount_percent)
    `)
    .eq('id', user.id)
    .single()

  const { data: activeSessions } = await supabase
    .from('computer_sessions')
    .select('*, computers (name, code)')
    .eq('customer_id', user.id)
    .is('ended_at', null)

  const { data: reservations } = await supabase
    .from('reservations')
    .select('*, computers (name, code)')
    .eq('customer_id', user.id)
    .in('status', ['PENDING', 'CONFIRMED'])
    .order('start_time', { ascending: true })
    .limit(5)

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground mt-1">
          Selamat datang, {profile?.full_name}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Member</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{customer?.member_number}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {customer?.membership_tiers?.name || 'Regular'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Poin</CardTitle>
            <Ticket className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{customer?.total_points || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Poin loyalty</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Saldo Wallet</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(Number(customer?.wallet_balance || 0))}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Tersedia</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sesi Aktif</CardTitle>
            <Computer className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeSessions?.length || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Komputer aktif</p>
          </CardContent>
        </Card>
      </div>

      {activeSessions && activeSessions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Sesi Aktif</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {activeSessions.map((session: any) => (
                <div key={session.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <p className="font-medium">{session.computers?.name}</p>
                    <p className="text-sm text-muted-foreground">
                      Mulai: {new Date(session.started_at).toLocaleString('id-ID')}
                    </p>
                  </div>
                  <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-700 rounded">
                    Aktif
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {reservations && reservations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Reservasi Mendatang</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {reservations.map((reservation: any) => (
                <div key={reservation.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <p className="font-medium">{reservation.computers?.name || 'Komputer akan ditentukan'}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(reservation.start_time).toLocaleString('id-ID')}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Durasi: {reservation.duration_minutes} menit
                    </p>
                  </div>
                  <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-700 rounded">
                    {reservation.status}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
