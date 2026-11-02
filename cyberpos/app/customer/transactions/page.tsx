import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Receipt, TrendingUp } from "lucide-react"

export default async function TransactionsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (profile?.role !== 'CUSTOMER') redirect('/login')

  const { data: sales } = await supabase
    .from('sales')
    .select(`
      *,
      sale_items (
        product_name,
        quantity,
        unit_price,
        subtotal
      )
    `)
    .eq('customer_id', user.id)
    .order('created_at', { ascending: false })

  const stats = {
    total: sales?.length || 0,
    totalAmount: sales?.reduce((sum, s) => sum + Number(s.total), 0) || 0,
    paid: sales?.filter(s => s.payment_status === 'PAID').length || 0,
    pending: sales?.filter(s => s.payment_status === 'PENDING').length || 0,
  }

  const paymentStatusColors: Record<string, string> = {
    PENDING: 'bg-yellow-100 text-yellow-800',
    PAID: 'bg-green-100 text-green-800',
    FAILED: 'bg-red-100 text-red-800',
    VOIDED: 'bg-gray-100 text-gray-800',
    REFUNDED: 'bg-blue-100 text-blue-800',
    PARTIALLY_REFUNDED: 'bg-blue-100 text-blue-600',
  }

  const paymentMethodLabels: Record<string, string> = {
    CASH: 'Tunai',
    QRIS: 'QRIS',
    TRANSFER: 'Transfer',
    WALLET: 'Wallet',
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Transaksi</h2>
        <p className="text-muted-foreground mt-1">Riwayat transaksi pembelian Anda</p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Transaksi</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Pengeluaran</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              Rp {stats.totalAmount.toLocaleString('id-ID')}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Berhasil</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.paid}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pending}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Daftar Transaksi</CardTitle>
        </CardHeader>
        <CardContent>
          {!sales || sales.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Receipt className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p>Belum ada transaksi.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {sales.map((sale: any) => (
                <div key={sale.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <p className="font-semibold">{sale.invoice_number}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(sale.created_at).toLocaleString('id-ID')}
                      </p>
                    </div>
                    <Badge className={paymentStatusColors[sale.payment_status] || 'bg-gray-100'}>
                      {sale.payment_status}
                    </Badge>
                  </div>

                  {sale.sale_items && sale.sale_items.length > 0 && (
                    <div className="border-t pt-3 space-y-2">
                      <p className="text-sm font-medium">Item:</p>
                      {sale.sale_items.map((item: any, idx: number) => (
                        <div key={idx} className="flex justify-between text-sm">
                          <span className="text-muted-foreground">
                            {item.product_name} x{item.quantity}
                          </span>
                          <span className="font-medium">
                            Rp {Number(item.subtotal).toLocaleString('id-ID')}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="border-t pt-3 grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Metode Pembayaran</p>
                      <p className="font-medium">
                        {paymentMethodLabels[sale.payment_method] || sale.payment_method}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-muted-foreground">Total</p>
                      <p className="text-lg font-bold">
                        Rp {Number(sale.total).toLocaleString('id-ID')}
                      </p>
                    </div>
                  </div>

                  {sale.notes && (
                    <div className="text-sm text-muted-foreground">
                      <p className="font-medium">Catatan:</p>
                      <p>{sale.notes}</p>
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
