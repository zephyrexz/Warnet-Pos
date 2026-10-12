import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Plus, Package } from "lucide-react"
import { formatCurrency } from "@/lib/utils"

export default async function ProductsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!['OWNER', 'ADMIN', 'CASHIER'].includes(profile?.role || '')) {
    redirect('/customer/dashboard')
  }

  const { data: products } = await supabase
    .from('products')
    .select(`
      *,
      product_categories (name)
    `)
    .order('name')

  const { data: categories } = await supabase
    .from('product_categories')
    .select('*')
    .eq('is_active', true)
    .order('name')

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="border-b bg-white">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-6">
            <Link href="/staff/dashboard" className="text-xl font-bold text-blue-600">
              CyberPOS
            </Link>
            <div className="flex gap-4 text-sm">
              <Link href="/staff/dashboard" className="text-slate-600 hover:text-slate-900">
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
              <Link href="/staff/products" className="font-medium text-slate-900">
                Produk
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <main className="container mx-auto p-4">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Manajemen Produk</h1>
            <p className="text-sm text-slate-600">Kelola produk dan inventaris</p>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="outline">
              <Link href="/staff/categories">Kategori</Link>
            </Button>
            <Button asChild>
              <Link href="/staff/products/new">
                <Plus className="mr-2 h-4 w-4" />
                Tambah Produk
              </Link>
            </Button>
          </div>
        </div>

        {products && products.length > 0 ? (
          <div className="rounded-lg border bg-white">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium">SKU</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Nama</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Kategori</th>
                    <th className="px-4 py-3 text-right text-sm font-medium">Stok</th>
                    <th className="px-4 py-3 text-right text-sm font-medium">Harga Modal</th>
                    <th className="px-4 py-3 text-right text-sm font-medium">Harga Jual</th>
                    <th className="px-4 py-3 text-center text-sm font-medium">Status</th>
                    <th className="px-4 py-3 text-center text-sm font-medium">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((product: any) => (
                    <tr key={product.id} className="border-b last:border-0 hover:bg-slate-50">
                      <td className="px-4 py-3 text-sm">{product.sku}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium">{product.name}</div>
                        {product.barcode && (
                          <div className="text-xs text-slate-500">{product.barcode}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {product.product_categories?.name || '-'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={product.stock <= product.min_stock ? 'font-bold text-orange-600' : ''}>
                          {product.stock}
                        </span>
                        <span className="text-xs text-slate-500"> {product.unit}</span>
                      </td>
                      <td className="px-4 py-3 text-right text-sm">
                        {formatCurrency(Number(product.cost_price))}
                      </td>
                      <td className="px-4 py-3 text-right font-medium">
                        {formatCurrency(Number(product.sell_price))}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-block rounded-full px-2 py-1 text-xs ${
                          product.is_active 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-gray-100 text-gray-700'
                        }`}>
                          {product.is_active ? 'Aktif' : 'Nonaktif'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Button asChild size="sm" variant="outline">
                          <Link href={`/staff/products/${product.id}`}>Edit</Link>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <Card className="p-12 text-center">
            <Package className="mx-auto mb-4 h-12 w-12 text-slate-400" />
            <p className="mb-4 text-slate-600">Belum ada produk</p>
            <Button asChild>
              <Link href="/staff/products/new">
                <Plus className="mr-2 h-4 w-4" />
                Tambah Produk
              </Link>
            </Button>
          </Card>
        )}
      </main>
    </div>
  )
}
