import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Package } from "lucide-react"

export default async function ProductsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'OWNER' && profile?.role !== 'ADMIN') redirect('/login')

  const { data: products } = await supabase
    .from('products')
    .select(`*, product_categories (name)`)
    .eq('is_active', true)
    .order('name', { ascending: true })

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Produk</h2>
        <p className="text-muted-foreground mt-1">Kelola katalog produk</p>
      </div>

      <Card>
        <CardHeader><CardTitle>Daftar Produk</CardTitle></CardHeader>
        <CardContent>
          {!products || products.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p>Belum ada produk.</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {products.map((product: any) => (
                <div key={product.id} className="border rounded-lg p-4 space-y-2">
                  <p className="font-semibold">{product.name}</p>
                  <p className="text-sm text-muted-foreground">{product.product_categories?.name}</p>
                  <p className="text-sm">SKU: {product.sku}</p>
                  <div className="flex justify-between items-end">
                    <div className="text-sm">
                      <span className="text-muted-foreground">Stok:</span> {product.stock} {product.unit}
                    </div>
                    <p className="text-lg font-bold text-primary">
                      Rp {Number(product.sell_price).toLocaleString('id-ID')}
                    </p>
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
