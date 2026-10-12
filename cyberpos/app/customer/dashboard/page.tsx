import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatCurrency } from "@/lib/utils"
import { Computer, ShoppingBag, Users, Ticket } from "lucide-react"

export default async function CustomerDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'CUSTOMER') redirect('/staff/dashboard')

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
    <div className="min-h-screen bg-slate-50">
      <nav className="border-b bg-white">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <h1 className="text-xl font-bold text-blue-600">CyberPOS</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-600">
              {profile?.full_name}
            </span>
            <form action="/api/auth/logout" method="POST">
              <button className="text-sm text-slate-600 hover:text-slate-900">
                Keluar
              </button>
            </form>
          </div>
        </div>
      </nav>

      <main className="container mx-auto p-4">
        <h2 className="mb-6 text-2xl font-bold">Dashboard Pelanggan</h2>

        <div className="mb-6 grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Member</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{customer?.member_number}</div>
              <p className="text-xs text-muted-foreground">
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
              <p className="text-xs text-muted-foreground">Poin loyalty</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Saldo Wallet</CardTitle>
              <ShoppingBag className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(Number(customer?.wallet_balance || 0))}
              </div>
              <p className="text-xs text-muted-foreground">Tersedia</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Sesi Aktif</CardTitle>
              <Computer className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activeSessions?.length || 0}</div>
              <p className="text-xs text-muted-foreground">Komputer aktif</p>
            </CardContent>
          </Card>
        </div>

        {activeSessions && activeSessions.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Sesi Aktif</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {activeSessions.map((session: any) => (
                  <div key={session.id} className="flex items-center justify-between rounded-lg border p-4">
                    <div>
                      <p className="font-medium">{session.computers?.name}</p>
                      <p className="text-sm text-muted-foreground">
                        Mulai: {new Date(session.started_at).toLocaleString('id-ID')}
                      </p>
                    </div>
                    <span className="rounded-full bg-green-100 px-3 py-1 text-sm text-green-700">
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
              <div className="space-y-4">
                {reservations.map((reservation: any) => (
                  <div key={reservation.id} className="flex items-center justify-between rounded-lg border p-4">
                    <div>
                      <p className="font-medium">{reservation.computers?.name || 'Komputer akan ditentukan'}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(reservation.start_time).toLocaleString('id-ID')}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Durasi: {reservation.duration_minutes} menit
                      </p>
                    </div>
                    <span className="rounded-full bg-blue-100 px-3 py-1 text-sm text-blue-700">
                      {reservation.status}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  )
}
