import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import ComputersClient from "@/components/admin/computers-client"

export default async function ComputersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  
  if (profile?.role !== 'OWNER' && profile?.role !== 'ADMIN') redirect('/login')

  const { data: computers } = await supabase
    .from('computers')
    .select(`
      *,
      computer_sessions!computer_sessions_computer_id_fkey (
        id,
        started_at,
        ended_at,
        customer_id,
        profiles!computer_sessions_customer_id_fkey (full_name)
      )
    `)
    .eq('is_active', true)
    .order('code', { ascending: true })

  return <ComputersClient initialComputers={computers || []} userRole={profile.role} />
}
