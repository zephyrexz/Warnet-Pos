import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import POSClient from "@/components/cashier/pos-client"

export default async function POSPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  
  if (profile?.role !== 'OWNER' && profile?.role !== 'ADMIN' && profile?.role !== 'CASHIER') {
    redirect('/login')
  }

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
