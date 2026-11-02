import { getAuthProfile } from "@/lib/auth-helpers"
import { createClient } from "@/lib/supabase/server"
import ProductsClient from "@/components/admin/products-client"

export default async function ProductsPage() {
  const profile = await getAuthProfile()
  const supabase = await createClient()

  const { data: products } = await supabase
    .from('products')
    .select(`
      *,
      product_categories (id, name)
    `)
    .eq('is_active', true)
    .order('name', { ascending: true })

  const { data: categories } = await supabase
    .from('product_categories')
    .select('id, name')
    .eq('is_active', true)
    .order('name', { ascending: true })

  return (
    <ProductsClient 
      initialProducts={products || []} 
      categories={categories || []}
      userRole={profile.role}
    />
  )
}
