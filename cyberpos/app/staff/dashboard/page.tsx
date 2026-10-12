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

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="border-b bg-white">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-6">
            <Link href="/staff/dashboard" className="text-xl font-bold text-blue-600">
              CyberPOS
            </Link>
            <div className="flex gap-4 text-sm">
              <Link href="/staff/dashboard" className="font-medium text-slate-900">
                Dashboard
              </Link>
              <Link href="/staff/computers" className="text-slate-600 hover:text-slate-900">
                Komputer
              </Link>
              <Link href="/staff/billing" className="text-slate-600 hover:text-slate-900">
                Billing
              </Link>
              <Link href="/staff/pos" className="text-slate-600 hover:text-slate-900">
                POS
              </Link>
              <Link href="/staff/products" className="text-slate-600 hover:text-slate-900">
                Produk
              </Link>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium">{profile?.full_name}</span>
            <span className="rounded-full bg-blue-100 px-3 py-1 text-xs text-blue-700">
              {profile?.role}
            </span>
            <form action="/api/auth/logout" method="POST">
              <button className="text-sm text-slate-600 hover:text-slate-900">
                Keluar
              </button>
            </form>
          </div>
        </div>
      </nav>

      <main className="container mx-auto p-4">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold">Dashboard</h2>
          <div className="flex gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href="/staff/plans">
                <Package className="mr-2 h-4 w-4" />
                Paket Billing
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/staff/users">
                <Users className="mr-2 h-4 w-4" />
                Users
              </Link>
            </Button>
          </div>
        </div>

        <div className="mb-6 grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Komputer</CardTitle>
              <Computer className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalComputers}</div>
              <p className="text-xs text-muted-foreground">
                {availableComputers} tersedia
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Komputer Digunakan</CardTitle>
              <Computer className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{inUseComputers}</div>
              <p className="text-xs text-muted-foreground">
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
              <p className="text-xs text-muted-foreground">
                {todaySales?.length || 0} transaksi
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Stok Rendah</CardTitle>
              <AlertTriangle className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{lowStockProducts?.length || 0}</div>
              <p className="text-xs text-muted-foreground">Produk perlu restock</p>
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
                <div className="space-y-4">
                  {recentSessions.map((session: any) => (
                    <div key={session.id} className="flex items-center justify-between rounded-lg border p-3">
                      <div>
                        <p className="font-medium">{session.computers?.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {session.profiles?.full_name || 'Walk-in'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Mulai: {new Date(session.started_at).toLocaleTimeString('id-ID')}
                        </p>
                      </div>
                      <span className="rounded-full bg-green-100 px-2 py-1 text-xs text-green-700">
                        Aktif
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-sm text-muted-foreground">Tidak ada sesi aktif</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Stok Rendah</CardTitle>
            </CardHeader>
            <CardContent>
              {lowStockProducts && lowStockProducts.length > 0 ? (
                <div className="space-y-4">
                  {lowStockProducts.map((product: any) => (
                    <div key={product.name} className="flex items-center justify-between rounded-lg border p-3">
                      <div>
                        <p className="font-medium">{product.name}</p>
                        <p className="text-sm text-muted-foreground">
                          Stok: {product.stock} / Min: {product.min_stock}
                        </p>
                      </div>
                      <span className="rounded-full bg-orange-100 px-2 py-1 text-xs text-orange-700">
                        Rendah
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-sm text-muted-foreground">Semua produk stok aman</p>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
