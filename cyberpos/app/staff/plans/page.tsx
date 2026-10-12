'use client'

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { createClient } from "@/lib/supabase/client"
import { formatCurrency } from "@/lib/utils"
import { Plus } from "lucide-react"

export default function BillingPlansPage() {
  const [plans, setPlans] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    billing_type: 'PREPAID',
    duration_minutes: '',
    price: '',
    description: '',
  })
  
  const { toast } = useToast()
  const supabase = createClient()

  useEffect(() => {
    loadPlans()
  }, [])

  const loadPlans = async () => {
    const { data } = await supabase
      .from('billing_plans')
      .select('*')
      .order('price')
    setPlans(data || [])
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { error } = await supabase
        .from('billing_plans')
        .insert({
          name: formData.name,
          billing_type: formData.billing_type,
          duration_minutes: formData.duration_minutes ? parseInt(formData.duration_minutes) : null,
          price: parseFloat(formData.price),
          description: formData.description || null,
        })

      if (error) throw error

      toast({ title: "Paket billing ditambahkan" })
      setFormData({
        name: '',
        billing_type: 'PREPAID',
        duration_minutes: '',
        price: '',
        description: '',
      })
      loadPlans()
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Gagal",
        description: error.message,
      })
    } finally {
      setLoading(false)
    }
  }

  const toggleActive = async (id: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('billing_plans')
        .update({ is_active: !isActive })
        .eq('id', id)

      if (error) throw error
      loadPlans()
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Gagal",
        description: error.message,
      })
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="border-b bg-white">
        <div className="container mx-auto flex h-16 items-center px-4">
          <Link href="/staff/dashboard" className="text-xl font-bold text-blue-600">
            ← Dashboard
          </Link>
        </div>
      </nav>

      <main className="container mx-auto max-w-6xl p-4">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Paket Billing</h1>
          <p className="text-sm text-slate-600">Kelola paket dan tarif billing</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>Tambah Paket</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nama Paket *</Label>
                  <Input
                    id="name"
                    placeholder="Paket 1 Jam"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="billing_type">Tipe Billing *</Label>
                  <Select 
                    value={formData.billing_type} 
                    onValueChange={(v) => setFormData({ ...formData, billing_type: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PREPAID">Prepaid (Dibayar Dulu)</SelectItem>
                      <SelectItem value="POSTPAID">Postpaid (Dibayar Akhir)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="duration_minutes">Durasi (menit)</Label>
                  <Input
                    id="duration_minutes"
                    type="number"
                    placeholder="60"
                    value={formData.duration_minutes}
                    onChange={(e) => setFormData({ ...formData, duration_minutes: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="price">Harga (Rp) *</Label>
                  <Input
                    id="price"
                    type="number"
                    placeholder="5000"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Deskripsi</Label>
                  <Input
                    id="description"
                    placeholder="Paket hemat untuk 1 jam"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>

                <Button type="submit" disabled={loading} className="w-full">
                  <Plus className="mr-2 h-4 w-4" />
                  {loading ? "Menyimpan..." : "Tambah Paket"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Daftar Paket ({plans.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {plans.map((plan) => (
                  <div key={plan.id} className="flex items-center justify-between rounded-lg border p-4">
                    <div>
                      <h3 className="font-medium">{plan.name}</h3>
                      <div className="mt-1 flex gap-4 text-sm text-slate-600">
                        <span>{plan.billing_type === 'PREPAID' ? 'Prepaid' : 'Postpaid'}</span>
                        {plan.duration_minutes && <span>{plan.duration_minutes} menit</span>}
                        <span className="font-bold text-blue-600">{formatCurrency(Number(plan.price))}</span>
                      </div>
                      {plan.description && (
                        <p className="mt-1 text-xs text-slate-500">{plan.description}</p>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant={plan.is_active ? "outline" : "default"}
                      onClick={() => toggleActive(plan.id, plan.is_active)}
                    >
                      {plan.is_active ? "Nonaktifkan" : "Aktifkan"}
                    </Button>
                  </div>
                ))}
                {plans.length === 0 && (
                  <p className="py-8 text-center text-sm text-slate-500">Belum ada paket</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
