'use server'

import { createClient } from '@/lib/supabase/server'
import { requirePermission, requireRole } from '@/lib/permissions'
import { revalidatePath } from 'next/cache'

export async function createProduct(data: {
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
}) {
  await requirePermission('manage_products')
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: product, error } = await supabase
    .from('products')
    .insert({
      ...data,
      is_active: true,
    })
    .select()
    .single()

  if (error) throw new Error(error.message)

  // Record initial inventory
  if (data.stock > 0) {
    await supabase.from('inventory_movements').insert({
      product_id: product.id,
      movement_type: 'IN',
      quantity: data.stock,
      stock_before: 0,
      stock_after: data.stock,
      reason: 'Initial stock',
      created_by: user!.id,
    })
  }

  revalidatePath('/admin/products')
  return product
}

export async function updateProduct(id: string, data: {
  name?: string
  description?: string
  category_id?: string
  cost_price?: number
  sell_price?: number
  min_stock?: number
  unit?: string
  image_url?: string
  is_active?: boolean
}) {
  await requirePermission('manage_products')
  const supabase = await createClient()

  const { data: product, error } = await supabase
    .from('products')
    .update({
      ...data,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()

  if (error) throw new Error(error.message)

  revalidatePath('/admin/products')
  return product
}

export async function deleteProduct(id: string) {
  await requirePermission('manage_products')
  const supabase = await createClient()

  // Soft delete to preserve transaction history
  const { error } = await supabase
    .from('products')
    .update({ is_active: false })
    .eq('id', id)

  if (error) throw new Error(error.message)

  revalidatePath('/admin/products')
}

export async function adjustStock(
  product_id: string,
  quantity: number,
  reason: string
) {
  await requirePermission('manage_inventory')
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Get current stock
  const { data: product } = await supabase
    .from('products')
    .select('stock')
    .eq('id', product_id)
    .single()

  if (!product) throw new Error('Product not found')

  const newStock = product.stock + quantity
  if (newStock < 0) throw new Error('Stock tidak boleh negatif')

  // Update stock in transaction
  const { error: updateError } = await supabase
    .from('products')
    .update({ stock: newStock })
    .eq('id', product_id)

  if (updateError) throw new Error(updateError.message)

  // Record movement
  await supabase.from('inventory_movements').insert({
    product_id,
    movement_type: 'ADJUSTMENT',
    quantity: Math.abs(quantity),
    stock_before: product.stock,
    stock_after: newStock,
    reason,
    created_by: user!.id,
  })

  revalidatePath('/admin/inventory')
  revalidatePath('/admin/products')
}

export async function getProducts(includeInactive = false) {
  const supabase = await createClient()
  
  let query = supabase
    .from('products')
    .select(`
      *,
      product_categories (id, name)
    `)
    .order('name', { ascending: true })

  if (!includeInactive) {
    query = query.eq('is_active', true)
  }

  const { data, error } = await query

  if (error) throw new Error(error.message)
  return data
}

export async function getProductById(id: string) {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('products')
    .select(`
      *,
      product_categories (id, name)
    `)
    .eq('id', id)
    .single()

  if (error) throw new Error(error.message)
  return data
}

export async function getLowStockProducts() {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('is_active', true)
    .filter('stock', 'lte', 'min_stock')
    .order('stock', { ascending: true })

  if (error) throw new Error(error.message)
  return data
}

export async function getInventoryMovements(product_id?: string) {
  const supabase = await createClient()
  
  let query = supabase
    .from('inventory_movements')
    .select(`
      *,
      products (name, sku),
      profiles (full_name)
    `)
    .order('created_at', { ascending: false })

  if (product_id) {
    query = query.eq('product_id', product_id)
  }

  const { data, error } = await query

  if (error) throw new Error(error.message)
  return data
}
