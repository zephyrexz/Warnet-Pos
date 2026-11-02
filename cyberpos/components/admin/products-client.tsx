'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Package, Plus, Search, MoreVertical, AlertTriangle } from "lucide-react"
import { ProductFormDialog } from '@/components/admin/product-dialogs'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { deleteProduct } from '@/lib/actions/products'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

type ProductType = {
  id: string
  sku: string
  name: string
  sell_price: number
  cost_price: number
  stock: number
  min_stock: number
  unit: string
  is_active: boolean
  product_categories?: { id: string; name: string }
}

export default function ProductsClient({
  initialProducts,
  categories,
  userRole,
}: {
  initialProducts: ProductType[]
  categories: Array<{ id: string; name: string }>
  userRole: string
}) {
  const router = useRouter()
  const [products, setProducts] = useState(initialProducts)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL')
  const [stockFilter, setStockFilter] = useState<string>('ALL')
  const [openForm, setOpenForm] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<any>(null)
  const [mode, setMode] = useState<'create' | 'edit'>('create')

  const filteredProducts = products.filter(prod => {
    const matchSearch = search === '' || 
      prod.name.toLowerCase().includes(search.toLowerCase()) ||
      prod.sku.toLowerCase().includes(search.toLowerCase())
    
    const matchCategory = categoryFilter === 'ALL' || 
      prod.product_categories?.id === categoryFilter
    
    let matchStock = true
    if (stockFilter === 'LOW') {
      matchStock = prod.stock <= prod.min_stock
    } else if (stockFilter === 'OUT') {
      matchStock = prod.stock === 0
    }
    
    return matchSearch && matchCategory && matchStock
  })

  const stats = {
    total: products.length,
    active: products.filter(p => p.is_active).length,
    low_stock: products.filter(p => p.stock <= p.min_stock && p.stock > 0).length,
    out_of_stock: products.filter(p => p.stock === 0).length,
  }

  const handleAdd = () => {
    setSelectedProduct(null)
    setMode('create')
    setOpenForm(true)
  }

  const handleEdit = (prod: ProductType) => {
    setSelectedProduct(prod)
    setMode('edit')
    setOpenForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Yakin ingin menonaktifkan produk ini?')) return

    try {
      await deleteProduct(id)
      toast.success('Produk berhasil dinonaktifkan')
      router.refresh()
    } catch (error: any) {
      toast.error(error.message || 'Terjadi kesalahan')
    }
  }

  const handleFormClose = (open: boolean) => {
    setOpenForm(open)
    if (!open) router.refresh()
  }

  const canManage = userRole === 'OWNER' || userRole === 'ADMIN'

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Produk</h2>
          <p className="text-muted-foreground mt-1">Kelola katalog produk warnet</p>
        </div>
        {canManage && (
          <Button onClick={handleAdd}>
            <Plus className="h-4 w-4 mr-2" />
            Tambah Produk
          </Button>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Produk</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aktif</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.active}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Stok Menipis</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.low_stock}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Habis</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.out_of_stock}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Daftar Produk</CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Cari produk..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8 w-[200px]"
                />
              </div>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="border rounded-md px-3 py-2 text-sm"
              >
                <option value="ALL">Semua Kategori</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
              <select
                value={stockFilter}
                onChange={(e) => setStockFilter(e.target.value)}
                className="border rounded-md px-3 py-2 text-sm"
              >
                <option value="ALL">Semua Stok</option>
                <option value="LOW">Stok Menipis</option>
                <option value="OUT">Stok Habis</option>
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredProducts.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p>Tidak ada produk ditemukan.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredProducts.map((prod) => (
                <div key={prod.id} className="border rounded-lg p-4 flex items-center justify-between hover:bg-gray-50">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <div>
                        <p className="font-semibold">{prod.name}</p>
                        <p className="text-sm text-muted-foreground">SKU: {prod.sku}</p>
                      </div>
                      {prod.product_categories && (
                        <Badge variant="outline">{prod.product_categories.name}</Badge>
                      )}
                      {prod.stock <= prod.min_stock && (
                        <Badge variant="destructive" className="bg-orange-100 text-orange-800">
                          {prod.stock === 0 ? 'Habis' : 'Stok Menipis'}
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Harga Jual</p>
                      <p className="font-semibold">Rp {Number(prod.sell_price).toLocaleString('id-ID')}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Stok</p>
                      <p className={`font-semibold ${prod.stock <= prod.min_stock ? 'text-orange-600' : ''}`}>
                        {prod.stock} {prod.unit}
                      </p>
                    </div>

                    {canManage && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(prod)}>
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleDelete(prod.id)}
                            className="text-red-600"
                          >
                            Nonaktifkan
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {canManage && (
        <ProductFormDialog
          open={openForm}
          onOpenChange={handleFormClose}
          product={selectedProduct}
          categories={categories}
          mode={mode}
        />
      )}
    </div>
  )
}
