import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, Settings } from "lucide-react"
import { ComputerCard } from "./computer-card"

export default async function ComputersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!['OWNER', 'ADMIN', 'CASHIER', 'TECHNICIAN'].includes(profile?.role || '')) {
    redirect('/customer/dashboard')
  }

  const { data: computers } = await supabase
    .from('computers')
    .select(`
      *,
      computer_sessions!computer_sessions_computer_id_fkey(
        id,
        started_at,
        ended_at,
        customers(member_number),
        profiles!computer_sessions_customer_id_fkey(full_name)
      )
    `)
    .order('code', { ascending: true })

  const activeComputers = computers?.map(comp => ({
    ...comp,
    activeSession: comp.computer_sessions?.find((s: any) => !s.ended_at)
  }))

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="border-b bg-white">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-6">
            <Link href="/staff/dashboard" className="text-xl font-bold text-blue-600">
              CyberPOS
            </Link>
            <div className="flex gap-4 text-sm">
              <Link href="/staff/dashboard" className="text-slate-600 hover:text-slate-900">
                Dashboard
              </Link>
              <Link href="/staff/computers" className="font-medium text-slate-900">
                Komputer
              </Link>
              <Link href="/staff/billing" className="text-slate-600 hover:text-slate-900">
                Billing
              </Link>
              <Link href="/staff/pos" className="text-slate-600 hover:text-slate-900">
                POS
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <main className="container mx-auto p-4">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Manajemen Komputer</h1>
            <p className="text-sm text-slate-600">Kelola komputer dan status</p>
          </div>
          <div className="flex gap-2">
            <Button asChild>
              <Link href="/staff/computers/new">
                <Plus className="mr-2 h-4 w-4" />
                Tambah Komputer
              </Link>
            </Button>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {activeComputers?.map((computer) => (
            <ComputerCard key={computer.id} computer={computer} />
          ))}
        </div>

        {(!activeComputers || activeComputers.length === 0) && (
          <Card className="p-12 text-center">
            <p className="text-slate-600">Belum ada komputer. Tambahkan komputer pertama Anda.</p>
            <Button asChild className="mt-4">
              <Link href="/staff/computers/new">
                <Plus className="mr-2 h-4 w-4" />
                Tambah Komputer
              </Link>
            </Button>
          </Card>
        )}
      </main>
    </div>
  )
}
