import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatCurrency } from "@/lib/utils"
import { Computer, ShoppingCart, TrendingUp, AlertTriangle, Users } from "lucide-react"

export default async function AdminDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'OWNER' && profile?.role !== 'ADMIN') redirect('/login')

  // Get stats
  const { count: totalComputers } = await supabase
    .from('computers')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true)

  const { count: availableComputers } = await supabase
    .from('computers')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'AVAILABLE')
    .eq('is_active', true)

  const { count: inUseComputers } = await supabase
    .from('computers')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'IN_USE')

  const { count: activeSessions } = await supabase
    .from('computer_sessions')
    .select('*', { count: 'exact', head: true })
    .is('ended_at', null)

  const { data: todaySales } = await supabase
    .from('sales')
    .select('total')
    .gte('created_at', new Date().toISOString().split('T')[0])
    .eq('payment_status', 'PAID')

  const todayRevenue = todaySales?.reduce((sum, sale) => sum + Number(sale.total), 0) || 0

  const { data: lowStockProducts } = await supabase
    .from('products')
    .select('name, stock, min_stock')
    .filter('stock', 'lte', 'min_stock')
    .eq('is_active', true)
    .limit(5)

  const { data: recentSessions } = await supabase
    .from('computer_sessions')
    .select(`
      *,
      computers (name, code),
      customers (member_number),
      profiles!computer_sessions_customer_id_fkey (full_name)
    `)
    .is('ended_at', null)
    .order('started_at', { ascending: false })
    .limit(5)

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground mt-1">
          Ringkasan operasional warnet
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Komputer</CardTitle>
            <Computer className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalComputers}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {availableComputers} tersedia
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sedang Digunakan</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{inUseComputers}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {activeSessions} sesi aktif
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendapatan Hari Ini</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(todayRevenue)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {todaySales?.length || 0} transaksi
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Stok Rendah</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{lowStockProducts?.length || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Produk perlu restock</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Sesi Aktif</CardTitle>
          </CardHeader>
          <CardContent>
            {recentSessions && recentSessions.length > 0 ? (
              <div className="space-y-3">
                {recentSessions.map((session: any) => (
                  <div key={session.id} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div>
                      <p className="font-medium">{session.computers?.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {session.profiles?.full_name || 'Walk-in'}
                      </p>
                    </div>
                    <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-700 rounded">
                      Aktif
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-sm text-muted-foreground py-4">Tidak ada sesi aktif</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Stok Rendah</CardTitle>
          </CardHeader>
          <CardContent>
            {lowStockProducts && lowStockProducts.length > 0 ? (
              <div className="space-y-3">
                {lowStockProducts.map((product: any) => (
                  <div key={product.name} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div>
                      <p className="font-medium">{product.name}</p>
                      <p className="text-sm text-muted-foreground">
                        Stok: {product.stock} / Min: {product.min_stock}
                      </p>
                    </div>
                    <span className="px-2 py-1 text-xs font-medium bg-orange-100 text-orange-700 rounded">
                      Rendah
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-sm text-muted-foreground py-4">Semua produk stok aman</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
