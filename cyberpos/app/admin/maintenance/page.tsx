import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Wrench } from "lucide-react"

export default async function MaintenancePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'OWNER' && profile?.role !== 'ADMIN') redirect('/login')

  const { data: tickets } = await supabase
    .from('maintenance_tickets')
    .select(`*, computers (code, name), profiles!maintenance_tickets_technician_id_fkey (full_name)`)
    .order('reported_at', { ascending: false })
    .limit(50)

  const statusColors: Record<string, string> = {
    OPEN: 'bg-red-100 text-red-800',
    IN_PROGRESS: 'bg-blue-100 text-blue-800',
    WAITING_PARTS: 'bg-yellow-100 text-yellow-800',
    RESOLVED: 'bg-green-100 text-green-800',
    CLOSED: 'bg-gray-100 text-gray-800',
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Maintenance</h2>
        <p className="text-muted-foreground mt-1">Kelola tiket perbaikan komputer</p>
      </div>

      <Card>
        <CardHeader><CardTitle>Tiket Maintenance</CardTitle></CardHeader>
        <CardContent>
          {!tickets || tickets.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Wrench className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p>Belum ada tiket maintenance.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {tickets.map((ticket: any) => (
                <div key={ticket.id} className="border rounded-lg p-4 space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold">{ticket.title}</p>
                      <p className="text-sm text-muted-foreground">#{ticket.ticket_number}</p>
                    </div>
                    <Badge className={statusColors[ticket.status]}>{ticket.status}</Badge>
                  </div>
                  <p className="text-sm">{ticket.description}</p>
                  <div className="grid grid-cols-2 gap-2 text-sm pt-2 border-t">
                    <div><span className="text-muted-foreground">Komputer:</span> {ticket.computers?.name}</div>
                    <div><span className="text-muted-foreground">Prioritas:</span> {ticket.priority}</div>
                    <div><span className="text-muted-foreground">Teknisi:</span> {ticket.profiles?.full_name || '-'}</div>
                    <div><span className="text-muted-foreground">Dilaporkan:</span> {new Date(ticket.reported_at).toLocaleDateString('id-ID')}</div>
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
