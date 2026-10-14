import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatCurrency } from "@/lib/utils"
import { Computer, ShoppingCart, TrendingUp, AlertTriangle, Users, Package, Settings } from "lucide-react"
import { Button } from "@/components/ui/button"

export default async function StaffDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (profile?.role === 'CUSTOMER') redirect('/customer/dashboard')

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

  const isOwnerOrAdmin = profile?.role === 'OWNER' || profile?.role === 'ADMIN'

  return (
    <>
      <main className="container mx-auto p-4 md:p-6 lg:p-8">
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">Dashboard</h2>
          {isOwnerOrAdmin && (
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline" size="sm" className="shadow-sm">
                <Link href="/staff/plans">
                  <Package className="mr-2 h-4 w-4" />
                  Paket Billing
                </Link>
              </Button>
              <Button asChild variant="outline" size="sm" className="shadow-sm">
                <Link href="/staff/users">
                  <Users className="mr-2 h-4 w-4" />
                  Users
                </Link>
              </Button>
            </div>
          )}
        </div>

        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-blue-50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Komputer</CardTitle>
              <div className="rounded-full bg-blue-100 p-2">
                <Computer className="h-4 w-4 text-blue-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900">{totalComputers}</div>
              <p className="text-xs text-slate-600 mt-1">
                {availableComputers} tersedia
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-green-50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Komputer Digunakan</CardTitle>
              <div className="rounded-full bg-green-100 p-2">
                <Computer className="h-4 w-4 text-green-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900">{inUseComputers}</div>
              <p className="text-xs text-slate-600 mt-1">
                {activeSessions} sesi aktif
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-purple-50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pendapatan Hari Ini</CardTitle>
              <div className="rounded-full bg-purple-100 p-2">
                <TrendingUp className="h-4 w-4 text-purple-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900">{formatCurrency(todayRevenue)}</div>
              <p className="text-xs text-slate-600 mt-1">
                {todaySales?.length || 0} transaksi
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-orange-50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Stok Rendah</CardTitle>
              <div className="rounded-full bg-orange-100 p-2">
                <AlertTriangle className="h-4 w-4 text-orange-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900">{lowStockProducts?.length || 0}</div>
              <p className="text-xs text-slate-600 mt-1">Produk perlu restock</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-green-100 flex items-center justify-center">
                  <Computer className="h-4 w-4 text-green-600" />
                </div>
                Sesi Aktif
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recentSessions && recentSessions.length > 0 ? (
                <div className="space-y-3">
                  {recentSessions.map((session: any) => (
                    <div key={session.id} className="flex items-center justify-between rounded-xl bg-gradient-to-r from-green-50 to-emerald-50 border p-3 shadow-sm">
                      <div>
                        <p className="font-semibold text-slate-900">{session.computers?.name}</p>
                        <p className="text-sm text-slate-600">
                          {session.profiles?.full_name || 'Walk-in'}
                        </p>
                        <p className="text-xs text-slate-500">
                          Mulai: {new Date(session.started_at).toLocaleTimeString('id-ID')}
                        </p>
                      </div>
                      <span className="rounded-full bg-green-500 px-2.5 py-1 text-xs font-medium text-white shadow-sm">
                        Aktif
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 mb-2">
                    <Computer className="h-6 w-6 text-slate-400" />
                  </div>
                  <p className="text-sm text-slate-500">Tidak ada sesi aktif</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-orange-100 flex items-center justify-center">
                  <AlertTriangle className="h-4 w-4 text-orange-600" />
                </div>
                Stok Rendah
              </CardTitle>
            </CardHeader>
            <CardContent>
              {lowStockProducts && lowStockProducts.length > 0 ? (
                <div className="space-y-3">
                  {lowStockProducts.map((product: any) => (
                    <div key={product.name} className="flex items-center justify-between rounded-xl bg-gradient-to-r from-orange-50 to-amber-50 border p-3 shadow-sm">
                      <div>
                        <p className="font-semibold text-slate-900">{product.name}</p>
                        <p className="text-sm text-slate-600">
                          Stok: {product.stock} / Min: {product.min_stock}
                        </p>
                      </div>
                      <span className="rounded-full bg-orange-500 px-2.5 py-1 text-xs font-medium text-white shadow-sm">
                        Rendah
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-green-100 mb-2">
                    <Package className="h-6 w-6 text-green-600" />
                  </div>
                  <p className="text-sm text-slate-500">Semua produk stok aman</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </>
  )
}
