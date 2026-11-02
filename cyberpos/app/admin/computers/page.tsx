import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Computer, Monitor, Wrench } from "lucide-react"

export default async function ComputersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (profile?.role !== 'OWNER' && profile?.role !== 'ADMIN') redirect('/login')

  const { data: computers } = await supabase
    .from('computers')
    .select(`
      *,
      computer_sessions!computer_sessions_computer_id_fkey (
        id,
        started_at,
        customer_id,
        profiles!computer_sessions_customer_id_fkey (full_name)
      )
    `)
    .eq('is_active', true)
    .order('code', { ascending: true })

  const statusColors: Record<string, string> = {
    AVAILABLE: 'bg-green-100 text-green-800',
    IN_USE: 'bg-blue-100 text-blue-800',
    RESERVED: 'bg-yellow-100 text-yellow-800',
    MAINTENANCE: 'bg-orange-100 text-orange-800',
    DISABLED: 'bg-gray-100 text-gray-800',
  }

  const stats = {
    total: computers?.length || 0,
    available: computers?.filter(c => c.status === 'AVAILABLE').length || 0,
    inUse: computers?.filter(c => c.status === 'IN_USE').length || 0,
    maintenance: computers?.filter(c => c.status === 'MAINTENANCE').length || 0,
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Komputer</h2>
          <p className="text-muted-foreground mt-1">Kelola semua komputer warnet</p>
        </div>
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
            <CardTitle className="text-sm font-medium">Tersedia</CardTitle>
            <Monitor className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.available}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Digunakan</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.inUse}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Maintenance</CardTitle>
            <Wrench className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.maintenance}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Daftar Komputer</CardTitle>
        </CardHeader>
        <CardContent>
          {!computers || computers.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Computer className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p>Belum ada komputer terdaftar.</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {computers.map((comp: any) => {
                const activeSession = comp.computer_sessions?.find((s: any) => !s.ended_at)
                return (
                  <div key={comp.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold text-lg">{comp.name}</p>
                        <p className="text-sm text-muted-foreground">Kode: {comp.code}</p>
                      </div>
                      <Badge className={statusColors[comp.status] || 'bg-gray-100'}>
                        {comp.status}
                      </Badge>
                    </div>
                    
                    {comp.location && (
                      <p className="text-sm text-muted-foreground">📍 {comp.location}</p>
                    )}

                    <div className="text-sm">
                      <p className="text-muted-foreground">Tarif</p>
                      <p className="font-medium">
                        Rp {Number(comp.hourly_rate).toLocaleString('id-ID')}/jam
                      </p>
                    </div>

                    {activeSession && (
                      <div className="pt-2 border-t text-sm">
                        <p className="text-muted-foreground">Sedang digunakan</p>
                        <p className="font-medium">
                          {activeSession.profiles?.full_name || 'Walk-in'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Mulai: {new Date(activeSession.started_at).toLocaleTimeString('id-ID')}
                        </p>
                      </div>
                    )}

                    {comp.notes && (
                      <p className="text-xs text-muted-foreground pt-2 border-t">
                        💬 {comp.notes}
                      </p>
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
