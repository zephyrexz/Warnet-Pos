import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart3, TrendingUp, DollarSign } from "lucide-react"

export default async function ReportsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'OWNER' && profile?.role !== 'ADMIN') redirect('/login')

  // Today's data
  const today = new Date().toISOString().split('T')[0]
  
  const { data: todaySales } = await supabase
    .from('sales')
    .select('total')
    .gte('created_at', today)
    .eq('payment_status', 'PAID')

  const { data: todayExpenses } = await supabase
    .from('expenses')
    .select('amount')
    .gte('date', today)

  const todayRevenue = todaySales?.reduce((s, sale) => s + Number(sale.total), 0) || 0
  const todayExpense = todayExpenses?.reduce((s, exp) => s + Number(exp.amount), 0) || 0

  const { count: todaySessions } = await supabase
    .from('computer_sessions')
    .select('*', { count: 'exact', head: true })
    .gte('started_at', today)

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Laporan</h2>
        <p className="text-muted-foreground mt-1">Analisis kinerja bisnis</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendapatan Hari Ini</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Rp {todayRevenue.toLocaleString('id-ID')}</div>
            <p className="text-xs text-muted-foreground mt-1">{todaySales?.length || 0} transaksi</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pengeluaran Hari Ini</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Rp {todayExpense.toLocaleString('id-ID')}</div>
            <p className="text-xs text-muted-foreground mt-1">{todayExpenses?.length || 0} item</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sesi Hari Ini</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{todaySessions}</div>
            <p className="text-xs text-muted-foreground mt-1">Total sesi</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Ringkasan</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between items-center py-2 border-b">
            <span className="text-muted-foreground">Pendapatan Kotor</span>
            <span className="font-bold">Rp {todayRevenue.toLocaleString('id-ID')}</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b">
            <span className="text-muted-foreground">Pengeluaran</span>
            <span className="font-bold text-red-600">-Rp {todayExpense.toLocaleString('id-ID')}</span>
          </div>
          <div className="flex justify-between items-center py-2 border-t-2">
            <span className="font-semibold">Pendapatan Bersih</span>
            <span className="font-bold text-lg">Rp {(todayRevenue - todayExpense).toLocaleString('id-ID')}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
