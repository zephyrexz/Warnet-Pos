import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import CategoriesClient from "@/components/admin/categories-client"
import { getCategories } from "@/lib/actions/categories"

export default async function CategoriesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  
  if (profile?.role !== 'OWNER' && profile?.role !== 'ADMIN') redirect('/login')

  const categories = await getCategories()

  return <CategoriesClient initialCategories={categories || []} userRole={profile.role} />
}
