import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/permissions'

type CheckoutItem = {
  product_id: string
  quantity: number
}

type CheckoutInput = {
  items: CheckoutItem[]
  customer_id?: string
  payment_method: 'CASH' | 'QRIS' | 'TRANSFER' | 'WALLET'
  paid_amount?: number
  discount_percent?: number
  notes?: string
}

export async function POST(request: Request) {
  try {
    // Only CASHIER, ADMIN, OWNER can process sales
    const user = await requireRole(['CASHIER', 'ADMIN', 'OWNER'])
    
    const body: CheckoutInput = await request.json()
    const { items, customer_id, payment_method, paid_amount, discount_percent, notes } = body

    if (!items || items.length === 0) {
      return Response.json({ error: 'Keranjang kosong' }, { status: 400 })
    }

    const supabase = await createClient()

    // Fetch product details and validate stock
    const productIds = items.map(i => i.product_id)
    const { data: products, error: fetchError } = await supabase
      .from('products')
      .select('id, name, sell_price, stock, cost_price')
      .in('id', productIds)
      .eq('is_active', true)

    if (fetchError || !products) {
      return Response.json({ error: 'Gagal memuat produk' }, { status: 500 })
    }

    // Validate all items
    const saleItems = []
    let subtotal = 0

    for (const item of items) {
      const product = products.find(p => p.id === item.product_id)
      if (!product) {
        return Response.json({ error: `Produk tidak ditemukan` }, { status: 400 })
      }

      if (product.stock < item.quantity) {
        return Response.json({ 
          error: `Stok ${product.name} tidak cukup (tersedia: ${product.stock})` 
        }, { status: 400 })
      }

      const itemSubtotal = Number(product.sell_price) * item.quantity
      subtotal += itemSubtotal

      saleItems.push({
        product_id: product.id,
        product_name: product.name,
        quantity: item.quantity,
        unit_price: product.sell_price,
        subtotal: itemSubtotal,
      })
    }

    // Calculate totals
    const discountAmount = (discount_percent || 0) * subtotal / 100
    const total = subtotal - discountAmount
    const changeAmount = paid_amount ? Math.max(0, paid_amount - total) : 0

    // Generate invoice number
    const invoiceNumber = `INV-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`

    // Create sale record
    const { data: sale, error: saleError } = await supabase
      .from('sales')
      .insert({
        invoice_number: invoiceNumber,
        customer_id: customer_id || null,
        cashier_id: user.id,
        subtotal,
        discount_percent: discount_percent || 0,
        discount_amount: discountAmount,
        total,
        payment_method,
        payment_status: 'PAID',
        paid_amount: paid_amount || total,
        change_amount: changeAmount,
        notes,
      })
      .select()
      .single()

    if (saleError) {
      return Response.json({ error: 'Gagal membuat transaksi' }, { status: 500 })
    }

    // Insert sale items
    const itemsWithSaleId = saleItems.map(item => ({ ...item, sale_id: sale.id }))
    const { error: itemsError } = await supabase
      .from('sale_items')
      .insert(itemsWithSaleId)

    if (itemsError) {
      // Rollback: delete sale
      await supabase.from('sales').delete().eq('id', sale.id)
      return Response.json({ error: 'Gagal menyimpan item' }, { status: 500 })
    }

    // Reduce stock and record movements
    for (const item of items) {
      const product = products.find(p => p.id === item.product_id)!
      const newStock = product.stock - item.quantity

      // Update stock
      const { error: stockError } = await supabase
        .from('products')
        .update({ 
          stock: newStock,
          updated_at: new Date().toISOString(),
        })
        .eq('id', item.product_id)

      if (stockError) {
        console.error('Stock update error:', stockError)
        // Continue - don't rollback entire transaction for stock tracking
      }

      // Record inventory movement
      await supabase
        .from('inventory_movements')
        .insert({
          product_id: item.product_id,
          movement_type: 'SALE',
          quantity: item.quantity,
          stock_before: product.stock,
          stock_after: newStock,
          reference_id: sale.id,
          reason: `Sale ${invoiceNumber}`,
          created_by: user.id,
        })
    }

    return Response.json({
      success: true,
      data: {
        sale_id: sale.id,
        invoice_number: invoiceNumber,
        total,
        paid_amount: paid_amount || total,
        change_amount: changeAmount,
      }
    })

  } catch (error: any) {
    console.error('POS checkout error:', error)
    return Response.json(
      { error: error.message || 'Terjadi kesalahan server' },
      { status: 500 }
    )
  }
}
