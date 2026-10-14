import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatCurrency } from "@/lib/utils"
import { Computer, ShoppingCart, Clock, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default async function CashierDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'CASHIER') redirect('/login')

  // Get stats
  const { count: availableComputers } = await supabase
    .from('computers')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'AVAILABLE')
    .eq('is_active', true)

  const { count: inUseComputers } = await supabase
    .from('computers')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'IN_USE')

  const { data: todayTransactions } = await supabase
    .from('sales')
    .select('total')
    .gte('created_at', new Date().toISOString().split('T')[0])
    .eq('payment_status', 'PAID')

  const todayRevenue = todayTransactions?.reduce((sum, sale) => sum + Number(sale.total), 0) || 0

  const { data: recentSessions } = await supabase
    .from('computer_sessions')
    .select(`
      *,
      computers (name, code),
      profiles!computer_sessions_customer_id_fkey (full_name)
    `)
    .is('ended_at', null)
    .order('started_at', { ascending: false })
    .limit(6)

  const { data: upcomingReservations } = await supabase
    .from('reservations')
    .select(`
      *,
      computers (name, code),
      profiles!reservations_customer_id_fkey (full_name)
    `)
    .in('status', ['PENDING', 'CONFIRMED'])
    .gte('start_time', new Date().toISOString())
    .order('start_time', { ascending: true })
    .limit(5)

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Dashboard Kasir</h2>
          <p className="text-muted-foreground mt-1">
            Selamat datang, {profile.full_name}
          </p>
        </div>
        <Button asChild size="lg">
          <Link href="/cashier/pos">
            <ShoppingCart className="mr-2 h-5 w-5" />
            Buka POS
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Komputer Tersedia</CardTitle>
            <Computer className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{availableComputers}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Siap digunakan
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sedang Digunakan</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{inUseComputers}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Komputer aktif
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Transaksi Hari Ini</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{todayTransactions?.length || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Total transaksi
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendapatan Hari Ini</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(todayRevenue)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Total pendapatan
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Sesi Aktif</CardTitle>
          </CardHeader>
          <CardContent>
            {recentSessions && recentSessions.length > 0 ? (
              <div className="space-y-3">
                {recentSessions.map((session: any) => (
                  <div key={session.id} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div>
                      <p className="font-medium">{session.computers?.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {session.profiles?.full_name || 'Walk-in'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Mulai: {new Date(session.started_at).toLocaleTimeString('id-ID')}
                      </p>
                    </div>
                    <Button variant="outline" size="sm" asChild>
                      <Link href="/cashier/billing">Detail</Link>
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-sm text-muted-foreground py-4">Tidak ada sesi aktif</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Reservasi Mendatang</CardTitle>
          </CardHeader>
          <CardContent>
            {upcomingReservations && upcomingReservations.length > 0 ? (
              <div className="space-y-3">
                {upcomingReservations.map((reservation: any) => (
                  <div key={reservation.id} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div>
                      <p className="font-medium">{reservation.profiles?.full_name}</p>
                      <p className="text-sm text-muted-foreground">
                        {reservation.computers?.name || 'Belum ditentukan'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(reservation.start_time).toLocaleString('id-ID')}
                      </p>
                    </div>
                    <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-700 rounded">
                      {reservation.status}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-sm text-muted-foreground py-4">Tidak ada reservasi mendatang</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
