'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, MoreVertical, Clock } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { createBillingPlan, updateBillingPlan, deleteBillingPlan } from '@/lib/actions/billing'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

type BillingPlan = {
  id: string
  name: string
  billing_type: 'PREPAID' | 'POSTPAID'
  duration_minutes?: number
  price: number
  description?: string
  is_active: boolean
}

export default function BillingPlansClient({
  initialPlans,
  userRole,
}: {
  initialPlans: BillingPlan[]
  userRole: string
}) {
  const router = useRouter()
  const [plans, setPlans] = useState(initialPlans)
  const [openForm, setOpenForm] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<BillingPlan | null>(null)
  const [mode, setMode] = useState<'create' | 'edit'>('create')
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    billing_type: 'PREPAID' as 'PREPAID' | 'POSTPAID',
    duration_minutes: 0,
    price: 0,
    description: '',
  })

  const handleAdd = () => {
    setSelectedPlan(null)
    setMode('create')
    setFormData({
      name: '',
      billing_type: 'PREPAID',
      duration_minutes: 0,
      price: 0,
      description: '',
    })
    setOpenForm(true)
  }

  const handleEdit = (plan: BillingPlan) => {
    setSelectedPlan(plan)
    setMode('edit')
    setFormData({
      name: plan.name,
      billing_type: plan.billing_type,
      duration_minutes: plan.duration_minutes || 0,
      price: plan.price,
      description: plan.description || '',
    })
    setOpenForm(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const data = {
        ...formData,
        duration_minutes: formData.billing_type === 'PREPAID' ? formData.duration_minutes : undefined,
      }

      if (mode === 'create') {
        await createBillingPlan(data)
        toast.success('Paket billing berhasil ditambahkan')
      } else if (selectedPlan) {
        await updateBillingPlan(selectedPlan.id, data)
        toast.success('Paket billing berhasil diperbarui')
      }
      setOpenForm(false)
      router.refresh()
    } catch (error: any) {
      toast.error(error.message || 'Terjadi kesalahan')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Yakin ingin menonaktifkan paket ini?')) return

    try {
      await deleteBillingPlan(id)
      toast.success('Paket billing berhasil dinonaktifkan')
      router.refresh()
    } catch (error: any) {
      toast.error(error.message || 'Terjadi kesalahan')
    }
  }

  const canManage = userRole === 'OWNER' || userRole === 'ADMIN'

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Paket Billing</h2>
          <p className="text-muted-foreground mt-1">Kelola paket dan tarif billing komputer</p>
        </div>
        {canManage && (
          <Button onClick={handleAdd}>
            <Plus className="h-4 w-4 mr-2" />
            Tambah Paket
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Daftar Paket</CardTitle>
        </CardHeader>
        <CardContent>
          {plans.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Clock className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p>Belum ada paket billing.</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {plans.map((plan) => (
                <div key={plan.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-semibold text-lg">{plan.name}</p>
                      {plan.description && (
                        <p className="text-sm text-muted-foreground mt-1">{plan.description}</p>
                      )}
                    </div>
                    {canManage && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(plan)}>
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleDelete(plan.id)}
                            className="text-red-600"
                          >
                            Nonaktifkan
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Tipe</span>
                      <Badge variant={plan.billing_type === 'PREPAID' ? 'default' : 'secondary'}>
                        {plan.billing_type}
                      </Badge>
                    </div>
                    
                    {plan.duration_minutes && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Durasi</span>
                        <span className="font-medium">{plan.duration_minutes} menit</span>
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Harga</span>
                      <span className="text-lg font-bold text-blue-600">
                        Rp {Number(plan.price).toLocaleString('id-ID')}
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 border-t">
                    {plan.is_active ? (
                      <Badge className="bg-green-100 text-green-800">Aktif</Badge>
                    ) : (
                      <Badge variant="secondary">Nonaktif</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {canManage && (
        <Dialog open={openForm} onOpenChange={setOpenForm}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {mode === 'create' ? 'Tambah Paket' : 'Edit Paket'}
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSubmit}>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nama Paket *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Paket 1 Jam"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="billing_type">Tipe Billing *</Label>
                  <Select 
                    value={formData.billing_type} 
                    onValueChange={(v: 'PREPAID' | 'POSTPAID') => setFormData({ ...formData, billing_type: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PREPAID">Prepaid (Bayar Dulu)</SelectItem>
                      <SelectItem value="POSTPAID">Postpaid (Bayar Belakangan)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {formData.billing_type === 'PREPAID' && (
                  <div className="space-y-2">
                    <Label htmlFor="duration">Durasi (menit) *</Label>
                    <Input
                      id="duration"
                      type="number"
                      value={formData.duration_minutes || ''}
                      onChange={(e) => setFormData({ ...formData, duration_minutes: Number(e.target.value) })}
                      placeholder="60"
                      required
                      min="1"
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="price">Harga (Rp) *</Label>
                  <Input
                    id="price"
                    type="number"
                    value={formData.price || ''}
                    onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                    placeholder="5000"
                    required
                    min="0"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Deskripsi</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Deskripsi paket"
                    rows={3}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOpenForm(false)}>
                  Batal
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? 'Menyimpan...' : 'Simpan'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
