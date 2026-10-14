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
    <>
      <main className="container mx-auto p-4 md:p-6 lg:p-8">
        <h2 className="mb-6 text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Dashboard Pelanggan</h2>

        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-blue-50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Member</CardTitle>
              <div className="rounded-full bg-blue-100 p-2">
                <Users className="h-4 w-4 text-blue-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900">{customer?.member_number}</div>
              <p className="text-xs text-slate-600 mt-1">
                {customer?.membership_tiers?.name || 'Regular'}
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-purple-50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Poin</CardTitle>
              <div className="rounded-full bg-purple-100 p-2">
                <Ticket className="h-4 w-4 text-purple-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900">{customer?.total_points || 0}</div>
              <p className="text-xs text-slate-600 mt-1">Poin loyalty</p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-green-50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Saldo Wallet</CardTitle>
              <div className="rounded-full bg-green-100 p-2">
                <ShoppingBag className="h-4 w-4 text-green-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900">
                {formatCurrency(Number(customer?.wallet_balance || 0))}
              </div>
              <p className="text-xs text-slate-600 mt-1">Tersedia</p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-orange-50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Sesi Aktif</CardTitle>
              <div className="rounded-full bg-orange-100 p-2">
                <Computer className="h-4 w-4 text-orange-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900">{activeSessions?.length || 0}</div>
              <p className="text-xs text-slate-600 mt-1">Komputer aktif</p>
            </CardContent>
          </Card>
        </div>

        {activeSessions && activeSessions.length > 0 && (
          <Card className="mb-6 border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-green-100 flex items-center justify-center">
                  <Computer className="h-4 w-4 text-green-600" />
                </div>
                Sesi Aktif
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {activeSessions.map((session: any) => (
                  <div key={session.id} className="flex items-center justify-between rounded-xl border bg-gradient-to-r from-green-50 to-emerald-50 p-4 shadow-sm">
                    <div>
                      <p className="font-semibold text-slate-900">{session.computers?.name}</p>
                      <p className="text-sm text-slate-600">
                        Mulai: {new Date(session.started_at).toLocaleString('id-ID')}
                      </p>
                    </div>
                    <span className="rounded-full bg-green-500 px-3 py-1 text-xs font-medium text-white shadow-sm">
                      Aktif
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {reservations && reservations.length > 0 && (
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Computer className="h-4 w-4 text-blue-600" />
                </div>
                Reservasi Mendatang
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {reservations.map((reservation: any) => (
                  <div key={reservation.id} className="flex items-center justify-between rounded-xl border bg-gradient-to-r from-blue-50 to-indigo-50 p-4 shadow-sm">
                    <div>
                      <p className="font-semibold text-slate-900">{reservation.computers?.name || 'Komputer akan ditentukan'}</p>
                      <p className="text-sm text-slate-600">
                        {new Date(reservation.start_time).toLocaleString('id-ID')}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        Durasi: {reservation.duration_minutes} menit
                      </p>
                    </div>
                    <span className="rounded-full bg-blue-500 px-3 py-1 text-xs font-medium text-white shadow-sm">
                      {reservation.status}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </>
  )
}
