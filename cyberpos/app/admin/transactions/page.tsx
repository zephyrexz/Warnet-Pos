import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ShoppingCart, TrendingUp } from "lucide-react"

export default async function TransactionsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'OWNER' && profile?.role !== 'ADMIN') redirect('/login')

  const { data: sales } = await supabase
    .from('sales')
    .select(`*, customers (member_number), profiles!sales_customer_id_fkey (full_name)`)
    .order('created_at', { ascending: false })
    .limit(100)

  const totalAmount = sales?.reduce((sum, s) => sum + Number(s.total), 0) || 0
  const paidCount = sales?.filter(s => s.payment_status === 'PAID').length || 0

  const statusColors: Record<string, string> = {
    PENDING: 'bg-yellow-100 text-yellow-800',
    PAID: 'bg-green-100 text-green-800',
    FAILED: 'bg-red-100 text-red-800',
    VOIDED: 'bg-gray-100 text-gray-800',
    REFUNDED: 'bg-blue-100 text-blue-800',
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Transaksi</h2>
        <p className="text-muted-foreground mt-1">Kelola semua transaksi penjualan</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Transaksi</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{sales?.length || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Pendapatan</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Rp {totalAmount.toLocaleString('id-ID')}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Berhasil</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{paidCount}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Daftar Transaksi</CardTitle></CardHeader>
        <CardContent>
          {!sales || sales.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <ShoppingCart className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p>Belum ada transaksi.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {sales.map((sale: any) => (
                <div key={sale.id} className="border rounded-lg p-4 space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold">{sale.invoice_number}</p>
                      <p className="text-sm text-muted-foreground">{sale.profiles?.full_name || 'Walk-in'}</p>
                    </div>
                    <Badge className={statusColors[sale.payment_status]}>{sale.payment_status}</Badge>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{new Date(sale.created_at).toLocaleString('id-ID')}</span>
                    <span className="font-bold">Rp {Number(sale.total).toLocaleString('id-ID')}</span>
                  </div>
                  <div className="text-sm"><span className="text-muted-foreground">Metode:</span> {sale.payment_method}</div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
