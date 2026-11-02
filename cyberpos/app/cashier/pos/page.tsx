import { createClient } from "@/lib/supabase/server"
import POSClient from "@/components/cashier/pos-client"

export default async function POSPage() {
  const supabase = await createClient()

  const { data: products } = await supabase
    .from('products')
    .select(`
      *,
      product_categories (id, name)
    `)
    .eq('is_active', true)
    .gt('stock', 0)
    .order('name', { ascending: true })

  const { data: categories } = await supabase
    .from('product_categories')
    .select('id, name')
    .eq('is_active', true)
    .order('name', { ascending: true })

  return <POSClient products={products || []} categories={categories || []} />
}
