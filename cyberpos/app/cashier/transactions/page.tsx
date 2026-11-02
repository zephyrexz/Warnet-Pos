import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Clock } from "lucide-react"

export default async function TransactionsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'CASHIER') redirect('/login')

  const { data: sales } = await supabase
    .from('sales')
    .select(`*, profiles!sales_customer_id_fkey (full_name)`)
    .eq('cashier_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50)

  const statusColors: Record<string, string> = {
    PENDING: 'bg-yellow-100 text-yellow-800',
    PAID: 'bg-green-100 text-green-800',
    FAILED: 'bg-red-100 text-red-800',
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Transaksi</h2>
        <p className="text-muted-foreground mt-1">Transaksi Anda hari ini</p>
      </div>

      <Card>
        <CardHeader><CardTitle>Daftar Transaksi</CardTitle></CardHeader>
        <CardContent>
          {!sales || sales.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Clock className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p>Belum ada transaksi.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {sales.map((sale: any) => (
                <div key={sale.id} className="border rounded-lg p-4 space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold">{sale.invoice_number}</p>
                      <p className="text-sm text-muted-foreground">
                        {sale.profiles?.full_name || 'Walk-in'}
                      </p>
                    </div>
                    <Badge className={statusColors[sale.payment_status]}>{sale.payment_status}</Badge>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{new Date(sale.created_at).toLocaleTimeString('id-ID')}</span>
                    <span className="font-bold">Rp {Number(sale.total).toLocaleString('id-ID')}</span>
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
