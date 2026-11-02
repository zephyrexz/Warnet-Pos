import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Calendar } from "lucide-react"

export default async function ReservationsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'CASHIER') redirect('/login')

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const { data: reservations } = await supabase
    .from('reservations')
    .select(`*, computers (code, name), profiles!reservations_customer_id_fkey (full_name)`)
    .gte('start_time', today.toISOString())
    .in('status', ['PENDING', 'CONFIRMED'])
    .order('start_time', { ascending: true })

  const statusColors: Record<string, string> = {
    PENDING: 'bg-yellow-100 text-yellow-800',
    CONFIRMED: 'bg-blue-100 text-blue-800',
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Reservasi</h2>
        <p className="text-muted-foreground mt-1">Kelola reservasi hari ini</p>
      </div>

      <Card>
        <CardHeader><CardTitle>Reservasi Hari Ini</CardTitle></CardHeader>
        <CardContent>
          {!reservations || reservations.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p>Tidak ada reservasi hari ini.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {reservations.map((res: any) => (
                <div key={res.id} className="border rounded-lg p-4 space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold">{res.profiles?.full_name}</p>
                      <p className="text-sm text-muted-foreground">{res.computers?.name || 'Komputer belum ditentukan'}</p>
                    </div>
                    <Badge className={statusColors[res.status]}>{res.status}</Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div><span className="text-muted-foreground">Waktu:</span> {new Date(res.start_time).toLocaleTimeString('id-ID')}</div>
                    <div><span className="text-muted-foreground">Durasi:</span> {res.duration_minutes} menit</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
