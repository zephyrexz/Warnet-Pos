'use server'

import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/permissions'
import { revalidatePath } from 'next/cache'

type CartItem = {
  product_id: string
  quantity: number
  unit_price: number
}

export async function createSale(data: {
  customer_id?: string
  session_id?: string
  items: CartItem[]
  discount_percent?: number
  payment_method: 'CASH' | 'QRIS' | 'TRANSFER' | 'WALLET'
  paid_amount?: number
  notes?: string
}) {
  await requireRole(['OWNER', 'ADMIN', 'CASHIER'])
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Calculate totals
  const subtotal = data.items.reduce((sum, item) => 
    sum + (item.quantity * item.unit_price), 0
  )
  const discount_percent = data.discount_percent || 0
  const discount_amount = subtotal * (discount_percent / 100)
  const total = subtotal - discount_amount

  // Validate payment
  if (data.payment_method === 'CASH' && (!data.paid_amount || data.paid_amount < total)) {
    throw new Error('Jumlah pembayaran tidak cukup')
  }

  const change_amount = data.payment_method === 'CASH' 
    ? (data.paid_amount || 0) - total 
    : 0

  // Generate invoice number
  const invoice_number = `INV-${Date.now()}`

  // Start transaction - create sale
  const { data: sale, error: saleError } = await supabase
    .from('sales')
    .insert({
      invoice_number,
      customer_id: data.customer_id,
      cashier_id: user!.id,
      session_id: data.session_id,
      subtotal,
      discount_percent,
      discount_amount,
      total,
      payment_method: data.payment_method,
      payment_status: 'PAID',
      paid_amount: data.paid_amount,
      change_amount,
      notes: data.notes,
    })
    .select()
    .single()

  if (saleError) throw new Error(saleError.message)

  // Insert sale items and update stock
  for (const item of data.items) {
    // Get product info
    const { data: product } = await supabase
      .from('products')
      .select('name, stock')
      .eq('id', item.product_id)
      .single()

    if (!product) throw new Error(`Product ${item.product_id} not found`)
    if (product.stock < item.quantity) {
      throw new Error(`Stok ${product.name} tidak cukup`)
    }

    // Insert sale item
    await supabase.from('sale_items').insert({
      sale_id: sale.id,
      product_id: item.product_id,
      product_name: product.name,
      quantity: item.quantity,
      unit_price: item.unit_price,
      subtotal: item.quantity * item.unit_price,
    })

    // Update stock
    const new_stock = product.stock - item.quantity
    await supabase
      .from('products')
      .update({ stock: new_stock })
      .eq('id', item.product_id)

    // Record inventory movement
    await supabase.from('inventory_movements').insert({
      product_id: item.product_id,
      movement_type: 'SALE',
      quantity: item.quantity,
      stock_before: product.stock,
      stock_after: new_stock,
      reference_id: sale.id,
      reason: `Sale ${invoice_number}`,
      created_by: user!.id,
    })
  }

  // If payment is from wallet, deduct balance
  if (data.payment_method === 'WALLET' && data.customer_id) {
    const { data: customer } = await supabase
      .from('customers')
      .select('wallet_balance')
      .eq('id', data.customer_id)
      .single()

    if (!customer || customer.wallet_balance < total) {
      throw new Error('Saldo wallet tidak cukup')
    }

    const new_balance = customer.wallet_balance - total

    await supabase
      .from('customers')
      .update({ wallet_balance: new_balance })
      .eq('id', data.customer_id)

    await supabase.from('wallet_transactions').insert({
      customer_id: data.customer_id,
      amount: -total,
      balance_before: customer.wallet_balance,
      balance_after: new_balance,
      transaction_type: 'PAYMENT',
      reference_id: sale.id,
      description: `Payment for ${invoice_number}`,
      created_by: user!.id,
    })
  }

  revalidatePath('/cashier/pos')
  revalidatePath('/admin/transactions')
  revalidatePath('/admin/inventory')
  
  return sale
}

export async function getSales(filters?: {
  start_date?: string
  end_date?: string
  cashier_id?: string
  payment_method?: string
  status?: string
}) {
  await requireRole(['OWNER', 'ADMIN', 'CASHIER'])
  const supabase = await createClient()

  let query = supabase
    .from('sales')
    .select(`
      *,
      profiles!sales_cashier_id_fkey (full_name),
      customers (profiles!inner(full_name))
    `)
    .order('created_at', { ascending: false })

  if (filters?.start_date) {
    query = query.gte('created_at', filters.start_date)
  }
  if (filters?.end_date) {
    query = query.lte('created_at', filters.end_date)
  }
  if (filters?.cashier_id) {
    query = query.eq('cashier_id', filters.cashier_id)
  }
  if (filters?.payment_method) {
    query = query.eq('payment_method', filters.payment_method)
  }
  if (filters?.status) {
    query = query.eq('payment_status', filters.status)
  }

  const { data, error } = await query

  if (error) throw new Error(error.message)
  return data
}

export async function getSaleById(id: string) {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('sales')
    .select(`
      *,
      profiles!sales_cashier_id_fkey (full_name, email),
      customers (
        profiles!inner(full_name, email),
        member_number
      ),
      sale_items (
        *,
        products (name, sku)
      ),
      computer_sessions (
        computers (code, name)
      )
    `)
    .eq('id', id)
    .single()

  if (error) throw new Error(error.message)
  return data
}
