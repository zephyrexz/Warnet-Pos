import { getAuthProfile } from "@/lib/auth-helpers"
import CategoriesClient from "@/components/admin/categories-client"
import { getCategories } from "@/lib/actions/categories"

export default async function CategoriesPage() {
  const profile = await getAuthProfile()
  const categories = await getCategories()

  return <CategoriesClient initialCategories={categories || []} userRole={profile.role} />
}
