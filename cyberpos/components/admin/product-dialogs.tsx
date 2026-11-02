'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { createProduct, updateProduct } from '@/lib/actions/products'
import { toast } from 'sonner'

type Product = {
  id?: string
  sku: string
  barcode?: string
  name: string
  description?: string
  category_id?: string
  cost_price: number
  sell_price: number
  stock: number
  min_stock: number
  unit: string
  image_url?: string
}

export function ProductFormDialog({
  open,
  onOpenChange,
  product,
  categories,
  mode = 'create'
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  product?: Product
  categories: Array<{ id: string; name: string }>
  mode?: 'create' | 'edit'
}) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState<Product>(product || {
    sku: '',
    name: '',
    description: '',
    category_id: '',
    cost_price: 0,
    sell_price: 0,
    stock: 0,
    min_stock: 0,
    unit: 'pcs',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (mode === 'create') {
        await createProduct(formData)
        toast.success('Produk berhasil ditambahkan')
      } else if (product?.id) {
        await updateProduct(product.id, formData)
        toast.success('Produk berhasil diperbarui')
      }
      onOpenChange(false)
    } catch (error: any) {
      toast.error(error.message || 'Terjadi kesalahan')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? 'Tambah Produk' : 'Edit Produk'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sku">SKU *</Label>
                <Input
                  id="sku"
                  value={formData.sku}
                  onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                  placeholder="PRD-001"
                  required
                  disabled={mode === 'edit'}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="barcode">Barcode</Label>
                <Input
                  id="barcode"
                  value={formData.barcode || ''}
                  onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                  placeholder="8901234567890"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Nama Produk *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Nama produk"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Deskripsi</Label>
              <Textarea
                id="description"
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Deskripsi produk"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Kategori</Label>
              <Select 
                value={formData.category_id || ''} 
                onValueChange={(value) => setFormData({ ...formData, category_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih kategori" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(cat => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cost_price">Harga Modal (Rp) *</Label>
                <Input
                  id="cost_price"
                  type="number"
                  value={formData.cost_price}
                  onChange={(e) => setFormData({ ...formData, cost_price: Number(e.target.value) })}
                  placeholder="10000"
                  required
                  min="0"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="sell_price">Harga Jual (Rp) *</Label>
                <Input
                  id="sell_price"
                  type="number"
                  value={formData.sell_price}
                  onChange={(e) => setFormData({ ...formData, sell_price: Number(e.target.value) })}
                  placeholder="15000"
                  required
                  min="0"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              {mode === 'create' && (
                <div className="space-y-2">
                  <Label htmlFor="stock">Stok Awal *</Label>
                  <Input
                    id="stock"
                    type="number"
                    value={formData.stock}
                    onChange={(e) => setFormData({ ...formData, stock: Number(e.target.value) })}
                    placeholder="0"
                    required
                    min="0"
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="min_stock">Stok Minimum *</Label>
                <Input
                  id="min_stock"
                  type="number"
                  value={formData.min_stock}
                  onChange={(e) => setFormData({ ...formData, min_stock: Number(e.target.value) })}
                  placeholder="10"
                  required
                  min="0"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="unit">Satuan *</Label>
                <Input
                  id="unit"
                  value={formData.unit}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                  placeholder="pcs"
                  required
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Batal
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Menyimpan...' : 'Simpan'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
