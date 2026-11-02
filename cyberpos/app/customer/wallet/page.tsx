import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Wallet as WalletIcon, ArrowUpCircle, ArrowDownCircle, TrendingUp } from "lucide-react"

export default async function WalletPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (profile?.role !== 'CUSTOMER') redirect('/login')

  const { data: customer } = await supabase
    .from('customers')
    .select('wallet_balance')
    .eq('id', user.id)
    .single()

  // ponytail: wallet_transactions table doesn't exist in schema yet — using sales as proxy for now
  // When wallet ledger is implemented, query wallet_transactions instead
  const { data: transactions } = await supabase
    .from('sales')
    .select('*')
    .eq('customer_id', user.id)
    .eq('payment_method', 'WALLET')
    .order('created_at', { ascending: false })
    .limit(50)

  const balance = Number(customer?.wallet_balance || 0)
  const totalSpent = transactions?.reduce((sum, t) => sum + Number(t.total), 0) || 0

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Wallet</h2>
        <p className="text-muted-foreground mt-1">Kelola saldo wallet Anda</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="md:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Saldo Saat Ini</CardTitle>
            <WalletIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              Rp {balance.toLocaleString('id-ID')}
            </div>
            <p className="text-xs text-muted-foreground mt-2">Tersedia untuk digunakan</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Penggunaan</CardTitle>
            <ArrowDownCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              Rp {totalSpent.toLocaleString('id-ID')}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Transaksi</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{transactions?.length || 0}</div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-blue-200 bg-blue-50/50">
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-shrink-0">
              <ArrowUpCircle className="h-8 w-8 text-blue-600" />
            </div>
            <div className="space-y-1">
              <p className="font-medium text-blue-900">Top-up Wallet</p>
              <p className="text-sm text-blue-700">
                Untuk menambah saldo, silakan hubungi kasir atau kunjungi konter warnet.
                Top-up dapat dilakukan dengan tunai atau transfer.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Riwayat Mutasi</CardTitle>
        </CardHeader>
        <CardContent>
          {!transactions || transactions.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <WalletIcon className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p>Belum ada transaksi wallet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {transactions.map((txn: any) => (
                <div key={txn.id} className="flex items-center justify-between py-3 border-b last:border-0">
                  <div className="flex items-start gap-3">
                    <div className="mt-1">
                      <ArrowDownCircle className="h-5 w-5 text-red-500" />
                    </div>
                    <div className="space-y-1">
                      <p className="font-medium">Pembayaran</p>
                      <p className="text-sm text-muted-foreground">{txn.invoice_number}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(txn.created_at).toLocaleString('id-ID')}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-red-600">
                      -Rp {Number(txn.total).toLocaleString('id-ID')}
                    </p>
                    <Badge className="mt-1 bg-green-100 text-green-800">
                      {txn.payment_status}
                    </Badge>
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
