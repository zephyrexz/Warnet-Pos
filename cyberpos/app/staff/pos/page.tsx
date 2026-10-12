'use client'

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { createClient } from "@/lib/supabase/client"
import { formatCurrency, generateId } from "@/lib/utils"
import { ShoppingCart, Trash2, Plus, Minus, Search } from "lucide-react"

interface CartItem {
  product_id: string
  name: string
  price: number
  quantity: number
  stock: number
}

export default function POSPage() {
  const [loading, setLoading] = useState(false)
  const [products, setProducts] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [customers, setCustomers] = useState<any[]>([])
  const [cart, setCart] = useState<CartItem[]>([])
  const [user, setUser] = useState<any>(null)
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [selectedCustomer, setSelectedCustomer] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('CASH')
  const [paidAmount, setPaidAmount] = useState('')
  
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClient()

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    setUser(user)

    const { data: prods } = await supabase
      .from('products')
      .select('*, product_categories(name)')
      .eq('is_active', true)
      .gt('stock', 0)
      .order('name')
    setProducts(prods || [])

    const { data: cats } = await supabase
      .from('product_categories')
      .select('*')
      .eq('is_active', true)
      .order('name')
    setCategories(cats || [])

    const { data: custs } = await supabase
      .from('customers')
      .select('id, member_number, profiles!inner(full_name)')
      .limit(50)
    setCustomers(custs || [])
  }

  const filteredProducts = products.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
                       p.sku.toLowerCase().includes(search.toLowerCase()) ||
                       (p.barcode && p.barcode.includes(search))
    const matchCategory = !selectedCategory || p.category_id === selectedCategory
    return matchSearch && matchCategory
  })

  const addToCart = (product: any) => {
    const existing = cart.find(item => item.product_id === product.id)
    if (existing) {
      if (existing.quantity >= product.stock) {
        toast({
          variant: "destructive",
          title: "Stok tidak cukup",
          description: `Stok ${product.name} hanya ${product.stock}`,
        })
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
        price: Number(product.sell_price),
        quantity: 1,
        stock: product.stock,
      }])
    }
  }

  const updateQuantity = (productId: string, delta: number) => {
    setCart(cart.map(item => {
      if (item.product_id === productId) {
        const newQty = item.quantity + delta
        if (newQty <= 0) return item
        if (newQty > item.stock) {
          toast({
            variant: "destructive",
            title: "Stok tidak cukup",
          })
          return item
        }
        return { ...item, quantity: newQty }
      }
      return item
    }))
  }

  const removeFromCart = (productId: string) => {
    setCart(cart.filter(item => item.product_id !== productId))
  }

  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0)
  const total = subtotal
  const change = paymentMethod === 'CASH' ? Math.max(0, parseFloat(paidAmount || '0') - total) : 0

  const handleCheckout = async () => {
    if (cart.length === 0) {
      toast({
        variant: "destructive",
        title: "Keranjang kosong",
      })
      return
    }

    if (paymentMethod === 'CASH' && parseFloat(paidAmount) < total) {
      toast({
        variant: "destructive",
        title: "Pembayaran kurang",
      })
      return
    }

    setLoading(true)

    try {
      const response = await fetch('/api/pos/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cashier_id: user.id,
          customer_id: selectedCustomer || null,
          items: cart.map(item => ({
            product_id: item.product_id,
            quantity: item.quantity,
          })),
          payment_method: paymentMethod,
          paid_amount: paymentMethod === 'CASH' ? parseFloat(paidAmount) : total,
          idempotency_key: generateId('checkout'),
        }),
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error)
      }

      toast({
        title: "Transaksi berhasil",
        description: `Invoice: ${result.invoice_number}`,
      })

      // Reset
      setCart([])
      setPaidAmount('')
      setSelectedCustomer('')
      loadData() // Reload to update stock
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Transaksi gagal",
        description: error.message,
      })
    } finally {
      setLoading(false)
    }
  }

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
              <Link href="/staff/pos" className="font-medium text-slate-900">
                POS
              </Link>
              <Link href="/staff/products" className="text-slate-600 hover:text-slate-900">
                Produk
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <main className="container mx-auto p-4">
        <div className="grid gap-4 lg:grid-cols-3">
          {/* Products */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  placeholder="Cari produk (nama, SKU, barcode)..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Semua Kategori" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Semua Kategori</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {filteredProducts.map((product) => (
                <Card 
                  key={product.id} 
                  className="cursor-pointer transition-colors hover:border-blue-500"
                  onClick={() => addToCart(product)}
                >
                  <CardContent className="p-4">
                    <h3 className="font-medium">{product.name}</h3>
                    <p className="text-xs text-slate-500">{product.sku}</p>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-lg font-bold text-blue-600">
                        {formatCurrency(Number(product.sell_price))}
                      </span>
                      <Badge variant={product.stock <= product.min_stock ? "destructive" : "secondary"}>
                        Stok: {product.stock}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Cart */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5" />
                  Keranjang ({cart.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {cart.length === 0 ? (
                  <p className="py-8 text-center text-sm text-slate-500">Keranjang kosong</p>
                ) : (
                  <>
                    <div className="max-h-64 space-y-2 overflow-y-auto">
                      {cart.map((item) => (
                        <div key={item.product_id} className="flex items-center gap-2 rounded border p-2">
                          <div className="flex-1">
                            <p className="text-sm font-medium">{item.name}</p>
                            <p className="text-xs text-slate-500">{formatCurrency(item.price)}</p>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              size="icon"
                              variant="outline"
                              className="h-7 w-7"
                              onClick={() => updateQuantity(item.product_id, -1)}
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className="w-8 text-center text-sm">{item.quantity}</span>
                            <Button
                              size="icon"
                              variant="outline"
                              className="h-7 w-7"
                              onClick={() => updateQuantity(item.product_id, 1)}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            onClick={() => removeFromCart(item.product_id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>

                    <div className="space-y-2 border-t pt-2">
                      <div className="flex justify-between text-sm">
                        <span>Subtotal</span>
                        <span>{formatCurrency(subtotal)}</span>
                      </div>
                      <div className="flex justify-between text-lg font-bold">
                        <span>Total</span>
                        <span>{formatCurrency(total)}</span>
                      </div>
                    </div>

                    <div className="space-y-3 border-t pt-3">
                      <Select value={selectedCustomer} onValueChange={setSelectedCustomer}>
                        <SelectTrigger>
                          <SelectValue placeholder="Walk-in" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">Walk-in</SelectItem>
                          {customers.map((cust: any) => (
                            <SelectItem key={cust.id} value={cust.id}>
                              {cust.profiles?.full_name} ({cust.member_number})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="CASH">Tunai</SelectItem>
                          <SelectItem value="QRIS">QRIS</SelectItem>
                          <SelectItem value="TRANSFER">Transfer</SelectItem>
                        </SelectContent>
                      </Select>

                      {paymentMethod === 'CASH' && (
                        <>
                          <Input
                            type="number"
                            placeholder="Jumlah dibayar"
                            value={paidAmount}
                            onChange={(e) => setPaidAmount(e.target.value)}
                          />
                          <div className="flex justify-between rounded bg-slate-100 p-2 text-sm">
                            <span>Kembalian</span>
                            <span className="font-bold">{formatCurrency(change)}</span>
                          </div>
                        </>
                      )}

                      <Button 
                        onClick={handleCheckout} 
                        disabled={loading || (paymentMethod === 'CASH' && parseFloat(paidAmount) < total)}
                        className="w-full"
                      >
                        {loading ? "Memproses..." : "Bayar"}
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
