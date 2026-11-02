import { getAuthProfile } from "@/lib/auth-helpers"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { getCashierDashboardStats } from "@/lib/actions/reports"
import { DollarSign, ShoppingCart, Monitor, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default async function CashierDashboardPage() {
  const profile = await getAuthProfile()
  const stats = await getCashierDashboardStats()

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Dashboard Kasir</h2>
        <p className="text-muted-foreground mt-1">Selamat datang, {profile.full_name}</p>
      </div>

      {!stats.shift ? (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-600" />
              Shift Belum Dibuka
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Anda perlu membuka shift terlebih dahulu untuk memulai transaksi
            </p>
            <Link href="/cashier/shifts">
              <Button>Buka Shift</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Shift Stats */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Transaksi</CardTitle>
                <ShoppingCart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.stats?.total_transactions ?? 0}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Pendapatan</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  Rp {(stats.stats?.total_revenue ?? 0).toLocaleString('id-ID')}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Transaksi Tunai</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.stats?.cash_sales ?? 0}</div>
              </CardContent>
            </Card>
          </div>

          {/* Shift Info */}
          <Card>
            <CardHeader>
              <CardTitle>Informasi Shift</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Dibuka Pada</span>
                <span className="font-medium">
                  {new Date(stats.shift.opened_at).toLocaleString('id-ID')}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Saldo Awal</span>
                <span className="font-medium">
                  Rp {Number(stats.shift.opening_balance).toLocaleString('id-ID')}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Available Computers */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Komputer Tersedia</span>
                <Badge variant="outline">{stats.available_computers?.length ?? 0} unit</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {(stats.available_computers?.length ?? 0) === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Semua komputer sedang digunakan
                </p>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {stats.available_computers?.map((comp: any) => (
                    <div key={comp.id} className="border rounded-lg p-3 text-center">
                      <Monitor className="h-8 w-8 mx-auto mb-2 text-green-600" />
                      <p className="font-semibold text-sm">{comp.name}</p>
                      <p className="text-xs text-muted-foreground">{comp.code}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <div className="grid gap-4 md:grid-cols-2">
            <Link href="/cashier/pos">
              <Card className="cursor-pointer hover:bg-gray-50 transition-colors">
                <CardContent className="pt-6">
                  <div className="text-center">
                    <ShoppingCart className="h-12 w-12 mx-auto mb-3 text-blue-600" />
                    <h3 className="font-semibold text-lg">Point of Sale</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Jual produk dan kelola pembayaran
                    </p>
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Link href="/cashier/billing">
              <Card className="cursor-pointer hover:bg-gray-50 transition-colors">
                <CardContent className="pt-6">
                  <div className="text-center">
                    <Monitor className="h-12 w-12 mx-auto mb-3 text-green-600" />
                    <h3 className="font-semibold text-lg">Billing Komputer</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Kelola sesi komputer
                    </p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          </div>
        </>
      )}
    </div>
  )
}
