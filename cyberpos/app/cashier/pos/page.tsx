import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ShoppingCart } from "lucide-react"

export default async function POSPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'CASHIER') redirect('/login')

  const { data: products } = await supabase
    .from('products')
    .select(`*, product_categories (name)`)
    .eq('is_active', true)
    .gt('stock', 0)
    .order('name', { ascending: true })

  const { data: categories } = await supabase
    .from('product_categories')
    .select('*')
    .eq('is_active', true)

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Point of Sale</h2>
        <p className="text-muted-foreground mt-1">Sistem kasir penjualan</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader><CardTitle>Produk</CardTitle></CardHeader>
            <CardContent>
              {categories && categories.length > 0 && (
                <div className="flex gap-2 mb-4 flex-wrap">
                  {categories.map((cat: any) => (
                    <button
                      key={cat.id}
                      className="px-3 py-1 text-sm border rounded hover:bg-muted"
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>
              )}

              {!products || products.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <ShoppingCart className="h-12 w-12 mx-auto mb-4 opacity-20" />
                  <p>Tidak ada produk tersedia.</p>
                </div>
              ) : (
                <div className="grid gap-3 md:grid-cols-3">
                  {products.map((product: any) => (
                    <button
                      key={product.id}
                      className="border rounded-lg p-3 text-left hover:bg-muted transition-colors"
                    >
                      <p className="font-semibold text-sm">{product.name}</p>
                      <p className="text-xs text-muted-foreground mb-2">{product.product_categories?.name}</p>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-muted-foreground">Stok: {product.stock}</span>
                        <span className="font-bold text-primary">
                          Rp {Number(product.sell_price).toLocaleString('id-ID')}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-1">
          <Card className="sticky top-6">
            <CardHeader><CardTitle>Keranjang</CardTitle></CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground">
                <ShoppingCart className="h-12 w-12 mx-auto mb-4 opacity-20" />
                <p className="text-sm">Keranjang kosong</p>
              </div>
              <div className="mt-4 pt-4 border-t space-y-3">
                <div className="flex justify-between text-sm">
                  <span>Subtotal</span>
                  <span>Rp 0</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Diskon</span>
                  <span>Rp 0</span>
                </div>
                <div className="flex justify-between font-bold text-lg pt-2 border-t">
                  <span>Total</span>
                  <span>Rp 0</span>
                </div>
                <button className="w-full bg-primary text-primary-foreground py-3 rounded font-semibold" disabled>
                  Bayar
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
