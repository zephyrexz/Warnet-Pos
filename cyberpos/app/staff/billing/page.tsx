import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Play } from "lucide-react"
import { ActiveSessionCard } from "./active-session-card"

export default async function BillingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!['OWNER', 'ADMIN', 'CASHIER'].includes(profile?.role || '')) {
    redirect('/customer/dashboard')
  }

  const { data: sessions } = await supabase
    .from('computer_sessions')
    .select(`
      *,
      computers (id, name, code, hourly_rate),
      customers (member_number),
      profiles!computer_sessions_customer_id_fkey (full_name),
      billing_plans (name, billing_type, duration_minutes, price)
    `)
    .is('ended_at', null)
    .order('started_at', { ascending: false })

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
              <Link href="/staff/computers" className="text-slate-600 hover:text-slate-900">
                Komputer
              </Link>
              <Link href="/staff/billing" className="font-medium text-slate-900">
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
            <h1 className="text-2xl font-bold">Sesi Billing Aktif</h1>
            <p className="text-sm text-slate-600">Monitor dan kelola sesi komputer</p>
          </div>
          <Button asChild>
            <Link href="/staff/billing/start">
              <Play className="mr-2 h-4 w-4" />
              Mulai Sesi Baru
            </Link>
          </Button>
        </div>

        {sessions && sessions.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {sessions.map((session) => (
              <ActiveSessionCard key={session.id} session={session} />
            ))}
          </div>
        ) : (
          <Card className="p-12 text-center">
            <p className="mb-4 text-slate-600">Tidak ada sesi aktif</p>
            <Button asChild>
              <Link href="/staff/billing/start">
                <Play className="mr-2 h-4 w-4" />
                Mulai Sesi Baru
              </Link>
            </Button>
          </Card>
        )}
      </main>
    </div>
  )
}
