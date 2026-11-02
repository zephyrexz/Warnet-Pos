import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Computer, Calendar, Clock } from "lucide-react"

export default async function ReservationsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (profile?.role !== 'CUSTOMER') redirect('/login')

  const { data: reservations } = await supabase
    .from('reservations')
    .select(`
      *,
      computers (code, name)
    `)
    .eq('customer_id', user.id)
    .order('start_time', { ascending: false })

  const stats = {
    total: reservations?.length || 0,
    upcoming: reservations?.filter(r => 
      ['PENDING', 'CONFIRMED'].includes(r.status) && new Date(r.start_time) > new Date()
    ).length || 0,
    completed: reservations?.filter(r => r.status === 'COMPLETED').length || 0,
    cancelled: reservations?.filter(r => r.status === 'CANCELLED').length || 0,
  }

  const statusColors: Record<string, string> = {
    PENDING: 'bg-yellow-100 text-yellow-800',
    CONFIRMED: 'bg-blue-100 text-blue-800',
    CHECKED_IN: 'bg-green-100 text-green-800',
    COMPLETED: 'bg-gray-100 text-gray-800',
    CANCELLED: 'bg-red-100 text-red-800',
    EXPIRED: 'bg-gray-100 text-gray-600',
    NO_SHOW: 'bg-orange-100 text-orange-800',
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Reservasi</h2>
        <p className="text-muted-foreground mt-1">Kelola reservasi komputer Anda</p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
            <Computer className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Mendatang</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.upcoming}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Selesai</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completed}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Dibatalkan</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.cancelled}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Daftar Reservasi</CardTitle>
        </CardHeader>
        <CardContent>
          {!reservations || reservations.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Computer className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p>Anda belum memiliki reservasi.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {reservations.map((res: any) => (
                <div key={res.id} className="border rounded-lg p-4 space-y-2">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold">{res.computers?.name || 'Komputer belum ditentukan'}</p>
                        <Badge className={statusColors[res.status] || 'bg-gray-100'}>
                          {res.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Kode: {res.computers?.code || '-'}
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Mulai</p>
                      <p className="font-medium">
                        {new Date(res.start_time).toLocaleString('id-ID')}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Selesai</p>
                      <p className="font-medium">
                        {new Date(res.end_time).toLocaleString('id-ID')}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Durasi</p>
                      <p className="font-medium">{res.duration_minutes} menit</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Estimasi Biaya</p>
                      <p className="font-medium">
                        Rp {Number(res.estimated_price).toLocaleString('id-ID')}
                      </p>
                    </div>
                  </div>
                  {res.notes && (
                    <div className="text-sm">
                      <p className="text-muted-foreground">Catatan</p>
                      <p>{res.notes}</p>
                    </div>
                  )}
                  {res.cancelled_reason && (
                    <div className="text-sm text-red-600">
                      <p className="font-medium">Alasan Pembatalan</p>
                      <p>{res.cancelled_reason}</p>
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
