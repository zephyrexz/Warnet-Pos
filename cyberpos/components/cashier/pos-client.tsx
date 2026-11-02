'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Search, Plus, Minus, Trash2, ShoppingCart, X } from "lucide-react"
import { createSale } from '@/lib/actions/sales'
import { searchCustomers } from '@/lib/actions/customers'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

type Product = {
  id: string
  name: string
  sku: string
  sell_price: number
  stock: number
  unit: string
  product_categories?: { name: string }
}

type CartItem = {
  product_id: string
  name: string
  quantity: number
  unit_price: number
  unit: string
  stock: number
}

type Customer = {
  id: string
  member_number: string
  profiles: { full_name: string; email: string }
}

export default function POSClient({
  products,
  categories,
}: {
  products: Product[]
  categories: Array<{ id: string; name: string }>
}) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL')
  const [cart, setCart] = useState<CartItem[]>([])
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [customerSearch, setCustomerSearch] = useState('')
  const [customerResults, setCustomerResults] = useState<Customer[]>([])
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'QRIS' | 'TRANSFER' | 'WALLET'>('CASH')
  const [paidAmount, setPaidAmount] = useState<number>(0)
  const [loading, setLoading] = useState(false)
  const [showCheckout, setShowCheckout] = useState(false)

  const filteredProducts = products.filter(prod => {
    const matchSearch = search === '' || 
      prod.name.toLowerCase().includes(search.toLowerCase()) ||
      prod.sku.toLowerCase().includes(search.toLowerCase())
    
    const matchCategory = categoryFilter === 'ALL' || 
      prod.product_categories?.name === categories.find(c => c.id === categoryFilter)?.name
    
    return matchSearch && matchCategory && prod.stock > 0
  })

  const subtotal = cart.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0)
  const total = subtotal
  const change = paymentMethod === 'CASH' ? Math.max(0, paidAmount - total) : 0

  const addToCart = (product: Product) => {
    const existing = cart.find(item => item.product_id === product.id)
    
    if (existing) {
      if (existing.quantity >= product.stock) {
        toast.error('Stok tidak mencukupi')
        return
      }
      setCart(cart.map(item => 
        item.product_id === product.id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ))
    } else {
      setCart([...cart, {
        product_id: product.id,
        name: product.name,
        quantity: 1,
        unit_price: product.sell_price,
        unit: product.unit,
        stock: product.stock,
      }])
    }
    toast.success(`${product.name} ditambahkan ke keranjang`)
  }

  const updateQuantity = (product_id: string, delta: number) => {
    setCart(cart.map(item => {
      if (item.product_id === product_id) {
        const newQty = item.quantity + delta
        if (newQty > item.stock) {
          toast.error('Stok tidak mencukupi')
          return item
        }
        return { ...item, quantity: Math.max(1, newQty) }
      }
      return item
    }))
  }

  const removeFromCart = (product_id: string) => {
    setCart(cart.filter(item => item.product_id !== product_id))
  }

  const clearCart = () => {
    setCart([])
    setSelectedCustomer(null)
    setPaidAmount(0)
  }

  const searchCustomer = async () => {
    if (!customerSearch.trim()) return
    
    try {
      const results = await searchCustomers(customerSearch)
      setCustomerResults(results)
    } catch (error: any) {
      toast.error(error.message)
    }
  }

  const handleCheckout = async () => {
    if (cart.length === 0) {
      toast.error('Keranjang kosong')
      return
    }

    if (paymentMethod === 'CASH' && paidAmount < total) {
      toast.error('Jumlah pembayaran tidak cukup')
      return
    }

    setLoading(true)

    try {
      const items = cart.map(item => ({
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
      }))

      await createSale({
        customer_id: selectedCustomer?.id,
        items,
        payment_method: paymentMethod,
        paid_amount: paymentMethod === 'CASH' ? paidAmount : total,
      })

      toast.success('Transaksi berhasil')
      clearCart()
      setShowCheckout(false)
      router.refresh()
    } catch (error: any) {
      toast.error(error.message || 'Terjadi kesalahan')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (paymentMethod !== 'CASH') {
      setPaidAmount(total)
    }
  }, [paymentMethod, total])

  return (
    <div className="p-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-120px)]">
        {/* Products */}
        <div className="lg:col-span-2 space-y-4 overflow-hidden flex flex-col">
          <div>
            <h2 className="text-2xl font-bold">Point of Sale</h2>
            <p className="text-muted-foreground">Pilih produk untuk ditambahkan ke keranjang</p>
          </div>

          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari produk..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8"
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
          </div>

          <div className="flex-1 overflow-y-auto">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {filteredProducts.map(product => (
                <button
                  key={product.id}
                  onClick={() => addToCart(product)}
                  className="border rounded-lg p-3 hover:bg-gray-50 text-left transition-colors"
                >
                  <p className="font-semibold text-sm">{product.name}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Stok: {product.stock} {product.unit}
                  </p>
                  <p className="text-sm font-semibold text-blue-600 mt-2">
                    Rp {Number(product.sell_price).toLocaleString('id-ID')}
                  </p>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Cart */}
        <div className="space-y-4 flex flex-col">
          <Card className="flex-1 flex flex-col">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Keranjang</span>
                <Badge variant="outline">{cart.length} item</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col">
              {/* Customer Selection */}
              <div className="mb-4 pb-4 border-b">
                <Label className="text-sm mb-2 block">Pelanggan (Opsional)</Label>
                {selectedCustomer ? (
                  <div className="flex items-center justify-between bg-gray-50 p-2 rounded">
                    <div>
                      <p className="font-medium text-sm">{selectedCustomer.profiles.full_name}</p>
                      <p className="text-xs text-muted-foreground">{selectedCustomer.member_number}</p>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => setSelectedCustomer(null)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Input
                      placeholder="Cari pelanggan..."
                      value={customerSearch}
                      onChange={(e) => setCustomerSearch(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && searchCustomer()}
                      className="text-sm"
                    />
                    <Button size="sm" onClick={searchCustomer}>
                      <Search className="h-4 w-4" />
                    </Button>
                  </div>
                )}
                
                {customerResults.length > 0 && !selectedCustomer && (
                  <div className="mt-2 border rounded-md divide-y max-h-32 overflow-y-auto">
                    {customerResults.map(customer => (
                      <button
                        key={customer.id}
                        onClick={() => {
                          setSelectedCustomer(customer)
                          setCustomerResults([])
                          setCustomerSearch('')
                        }}
                        className="w-full text-left p-2 hover:bg-gray-50 text-sm"
                      >
                        <p className="font-medium">{customer.profiles.full_name}</p>
                        <p className="text-xs text-muted-foreground">{customer.member_number}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Cart Items */}
              <div className="flex-1 overflow-y-auto space-y-2 mb-4">
                {cart.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <ShoppingCart className="h-12 w-12 mx-auto mb-2 opacity-20" />
                    <p className="text-sm">Keranjang kosong</p>
                  </div>
                ) : (
                  cart.map(item => (
                    <div key={item.product_id} className="border rounded-lg p-2 space-y-2">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-medium text-sm">{item.name}</p>
                          <p className="text-xs text-muted-foreground">
                            Rp {Number(item.unit_price).toLocaleString('id-ID')} / {item.unit}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFromCart(item.product_id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => updateQuantity(item.product_id, -1)}
                            disabled={item.quantity <= 1}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="w-8 text-center font-medium">{item.quantity}</span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => updateQuantity(item.product_id, 1)}
                            disabled={item.quantity >= item.stock}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                        <p className="font-semibold">
                          Rp {(item.quantity * item.unit_price).toLocaleString('id-ID')}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Summary */}
              <div className="space-y-2 pt-4 border-t">
                <div className="flex justify-between text-sm">
                  <span>Subtotal</span>
                  <span className="font-medium">Rp {subtotal.toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span>Rp {total.toLocaleString('id-ID')}</span>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button 
                    variant="outline" 
                    className="flex-1"
                    onClick={clearCart}
                    disabled={cart.length === 0}
                  >
                    Batal
                  </Button>
                  <Button 
                    className="flex-1"
                    onClick={() => setShowCheckout(true)}
                    disabled={cart.length === 0}
                  >
                    Checkout
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Checkout Dialog */}
      <Dialog open={showCheckout} onOpenChange={setShowCheckout}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Pembayaran</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Metode Pembayaran</Label>
              <Select value={paymentMethod} onValueChange={(v: any) => setPaymentMethod(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CASH">Tunai</SelectItem>
                  <SelectItem value="QRIS">QRIS</SelectItem>
                  <SelectItem value="TRANSFER">Transfer</SelectItem>
                  <SelectItem value="WALLET">Wallet</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {paymentMethod === 'CASH' && (
              <div className="space-y-2">
                <Label>Jumlah Bayar</Label>
                <Input
                  type="number"
                  value={paidAmount || ''}
                  onChange={(e) => setPaidAmount(Number(e.target.value))}
                  placeholder="0"
                  min={total}
                />
              </div>
            )}

            <div className="space-y-2 pt-4 border-t">
              <div className="flex justify-between">
                <span>Total</span>
                <span className="font-bold">Rp {total.toLocaleString('id-ID')}</span>
              </div>
              {paymentMethod === 'CASH' && (
                <>
                  <div className="flex justify-between">
                    <span>Bayar</span>
                    <span>Rp {paidAmount.toLocaleString('id-ID')}</span>
                  </div>
                  <div className="flex justify-between text-green-600 font-bold">
                    <span>Kembalian</span>
                    <span>Rp {change.toLocaleString('id-ID')}</span>
                  </div>
                </>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCheckout(false)}>
              Batal
            </Button>
            <Button onClick={handleCheckout} disabled={loading}>
              {loading ? 'Memproses...' : 'Bayar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
