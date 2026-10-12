'use client'

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { createClient } from "@/lib/supabase/client"
import { formatCurrency } from "@/lib/utils"

function StartBillingForm() {
  const [loading, setLoading] = useState(false)
  const [computers, setComputers] = useState<any[]>([])
  const [customers, setCustomers] = useState<any[]>([])
  const [plans, setPlans] = useState<any[]>([])
  const [user, setUser] = useState<any>(null)
  
  const [formData, setFormData] = useState({
    computer_id: '',
    customer_id: '',
    billing_plan_id: '',
    duration_minutes: '',
  })
  
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const supabase = createClient()

  useEffect(() => {
    loadData()
    const preselectedComputer = searchParams.get('computer')
    if (preselectedComputer) {
      setFormData(prev => ({ ...prev, computer_id: preselectedComputer }))
    }
  }, [searchParams])

  const loadData = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    setUser(user)

    const { data: comps } = await supabase
      .from('computers')
      .select('*')
      .eq('status', 'AVAILABLE')
      .eq('is_active', true)
      .order('code')
    setComputers(comps || [])

    const { data: custs } = await supabase
      .from('customers')
      .select('id, member_number, profiles!inner(full_name)')
      .order('member_number')
      .limit(50)
    setCustomers(custs || [])

    const { data: plns } = await supabase
      .from('billing_plans')
      .select('*')
      .eq('is_active', true)
      .order('price')
    setPlans(plns || [])
  }

  const selectedPlan = plans.find(p => p.id === formData.billing_plan_id)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setLoading(true)

    try {
      const response = await fetch('/api/billing/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          computer_id: formData.computer_id,
          customer_id: formData.customer_id || null,
          billing_plan_id: formData.billing_plan_id || null,
          started_by: user.id,
          planned_duration_minutes: formData.duration_minutes ? parseInt(formData.duration_minutes) : null,
        }),
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error)
      }

      toast({
        title: "Sesi dimulai",
        description: "Billing komputer berhasil dimulai",
      })

      router.push('/staff/billing')
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Gagal memulai sesi",
        description: error.message,
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="border-b bg-white">
        <div className="container mx-auto flex h-16 items-center px-4">
          <Link href="/staff/billing" className="text-xl font-bold text-blue-600">
            ← Kembali
          </Link>
        </div>
      </nav>

      <main className="container mx-auto max-w-2xl p-4">
        <Card>
          <CardHeader>
            <CardTitle>Mulai Sesi Billing</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="computer_id">Komputer *</Label>
                <Select value={formData.computer_id} onValueChange={(v) => setFormData({ ...formData, computer_id: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih komputer" />
                  </SelectTrigger>
                  <SelectContent>
                    {computers.map((comp) => (
                      <SelectItem key={comp.id} value={comp.id}>
                        {comp.name} ({comp.code}) - {formatCurrency(Number(comp.hourly_rate))}/jam
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="customer_id">Pelanggan (opsional)</Label>
                <Select value={formData.customer_id} onValueChange={(v) => setFormData({ ...formData, customer_id: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Walk-in / Pilih pelanggan" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Walk-in (tidak ada member)</SelectItem>
                    {customers.map((cust: any) => (
                      <SelectItem key={cust.id} value={cust.id}>
                        {cust.profiles?.full_name} ({cust.member_number})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="billing_plan_id">Paket (opsional)</Label>
                <Select value={formData.billing_plan_id} onValueChange={(v) => setFormData({ ...formData, billing_plan_id: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Tarif standar / Pilih paket" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Tarif Standar (per jam)</SelectItem>
                    {plans.map((plan) => (
                      <SelectItem key={plan.id} value={plan.id}>
                        {plan.name} - {formatCurrency(Number(plan.price))}
                        {plan.duration_minutes && ` (${plan.duration_minutes} menit)`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedPlan && selectedPlan.billing_type === 'PREPAID' && (
                <div className="rounded-lg bg-blue-50 p-3 text-sm text-blue-900">
                  Paket prepaid: Durasi {selectedPlan.duration_minutes} menit
                </div>
              )}

              {!selectedPlan && (
                <div className="space-y-2">
                  <Label htmlFor="duration_minutes">Durasi Rencana (menit, opsional)</Label>
                  <Input
                    id="duration_minutes"
                    type="number"
                    placeholder="60"
                    value={formData.duration_minutes}
                    onChange={(e) => setFormData({ ...formData, duration_minutes: e.target.value })}
                  />
                </div>
              )}

              <div className="flex gap-2 pt-4">
                <Button type="submit" disabled={loading || !formData.computer_id} className="flex-1">
                  {loading ? "Memproses..." : "Mulai Sesi"}
                </Button>
                <Button type="button" variant="outline" asChild>
                  <Link href="/staff/billing">Batal</Link>
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}

export default function StartBillingPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center">Loading...</div>}>
      <StartBillingForm />
    </Suspense>
  )
}
