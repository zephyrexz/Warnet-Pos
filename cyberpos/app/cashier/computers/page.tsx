import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Computer } from "lucide-react"

export default async function ComputersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'CASHIER') redirect('/login')

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

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Komputer</h2>
        <p className="text-muted-foreground mt-1">Monitor dan kelola billing komputer</p>
      </div>

      <Card>
        <CardHeader><CardTitle>Status Komputer</CardTitle></CardHeader>
        <CardContent>
          {!computers || computers.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Computer className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p>Tidak ada komputer tersedia.</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {computers.map((comp: any) => {
                const activeSession = comp.computer_sessions?.find((s: any) => !s.ended_at)
                const duration = activeSession 
                  ? Math.floor((Date.now() - new Date(activeSession.started_at).getTime()) / 60000)
                  : 0

                return (
                  <div key={comp.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold text-lg">{comp.name}</p>
                        <p className="text-sm text-muted-foreground">{comp.code}</p>
                      </div>
                      <Badge className={statusColors[comp.status]}>{comp.status}</Badge>
                    </div>

                    {activeSession ? (
                      <div className="pt-2 border-t space-y-1">
                        <p className="text-sm font-medium">
                          {activeSession.profiles?.full_name || 'Walk-in'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Durasi: {Math.floor(duration / 60)}j {duration % 60}m
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Mulai: {new Date(activeSession.started_at).toLocaleTimeString('id-ID')}
                        </p>
                      </div>
                    ) : (
                      <div className="pt-2 border-t text-sm text-muted-foreground">
                        Siap digunakan
                      </div>
                    )}

                    <div className="text-sm">
                      <span className="text-muted-foreground">Tarif:</span>{' '}
                      <span className="font-medium">Rp {Number(comp.hourly_rate).toLocaleString('id-ID')}/jam</span>
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
