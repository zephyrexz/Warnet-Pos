'use server'

import { createClient } from '@/lib/supabase/server'
import { requirePermission } from '@/lib/permissions'
import { revalidatePath } from 'next/cache'

export async function createCategory(data: {
  name: string
  description?: string
}) {
  await requirePermission('manage_categories')
  const supabase = await createClient()

  const { data: category, error } = await supabase
    .from('product_categories')
    .insert({
      name: data.name,
      description: data.description,
      is_active: true,
    })
    .select()
    .single()

  if (error) throw new Error(error.message)

  revalidatePath('/admin/categories')
  revalidatePath('/admin/products')
  return category
}

export async function updateCategory(id: string, data: {
  name?: string
  description?: string
  is_active?: boolean
}) {
  await requirePermission('manage_categories')
  const supabase = await createClient()

  const { data: category, error } = await supabase
    .from('product_categories')
    .update(data)
    .eq('id', id)
    .select()
    .single()

  if (error) throw new Error(error.message)

  revalidatePath('/admin/categories')
  revalidatePath('/admin/products')
  return category
}

export async function deleteCategory(id: string) {
  await requirePermission('manage_categories')
  const supabase = await createClient()

  // Check if category has products
  const { data: products } = await supabase
    .from('products')
    .select('id')
    .eq('category_id', id)
    .limit(1)

  if (products && products.length > 0) {
    throw new Error('Tidak dapat menghapus kategori yang masih memiliki produk')
  }

  const { error } = await supabase
    .from('product_categories')
    .update({ is_active: false })
    .eq('id', id)

  if (error) throw new Error(error.message)

  revalidatePath('/admin/categories')
}

export async function getCategories(includeInactive = false) {
  const supabase = await createClient()
  
  let query = supabase
    .from('product_categories')
    .select(`
      *,
      products (id)
    `)
    .order('name', { ascending: true })

  if (!includeInactive) {
    query = query.eq('is_active', true)
  }

  const { data, error } = await query

  if (error) throw new Error(error.message)
  
  return data?.map(cat => ({
    ...cat,
    product_count: cat.products?.length || 0,
  }))
}
