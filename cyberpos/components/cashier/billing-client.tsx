'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Monitor, Play, Square, Clock } from "lucide-react"
import { startSession, endSession, calculateBillingAmount } from '@/lib/actions/billing'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

type Computer = {
  id: string
  code: string
  name: string
  status: string
  hourly_rate: number
  computer_sessions?: Array<{
    id: string
    started_at: string
    hourly_rate: number
    profiles?: { full_name: string }
  }>
}

type BillingPlan = {
  id: string
  name: string
  duration_minutes?: number
  price: number
  billing_type: string
}

export default function BillingClient({
  computers,
  plans,
}: {
  computers: Computer[]
  plans: BillingPlan[]
}) {
  const router = useRouter()
  const [openStart, setOpenStart] = useState(false)
  const [openEnd, setOpenEnd] = useState(false)
  const [selectedComputer, setSelectedComputer] = useState<Computer | null>(null)
  const [selectedPlan, setSelectedPlan] = useState<string>('')
  const [customDuration, setCustomDuration] = useState<number>(0)
  const [loading, setLoading] = useState(false)
  const [billingAmount, setBillingAmount] = useState<any>(null)

  const statusColors: Record<string, string> = {
    AVAILABLE: 'bg-green-100 text-green-800',
    IN_USE: 'bg-blue-100 text-blue-800',
    MAINTENANCE: 'bg-orange-100 text-orange-800',
  }

  const availableComputers = computers.filter(c => c.status === 'AVAILABLE')
  const activeComputers = computers.filter(c => c.status === 'IN_USE')

  const handleStartClick = (computer: Computer) => {
    setSelectedComputer(computer)
    setOpenStart(true)
  }

  const handleEndClick = async (computer: Computer) => {
    const session = computer.computer_sessions?.find(s => !s.ended_at)
    if (!session) return

    setSelectedComputer(computer)
    
    try {
      const amount = await calculateBillingAmount(session.id)
      setBillingAmount(amount)
      setOpenEnd(true)
    } catch (error: any) {
      toast.error(error.message)
    }
  }

  const handleStartSession = async () => {
    if (!selectedComputer) return

    setLoading(true)

    try {
      const plan = plans.find(p => p.id === selectedPlan)
      
      await startSession({
        computer_id: selectedComputer.id,
        hourly_rate: selectedComputer.hourly_rate,
        billing_plan_id: selectedPlan || undefined,
        planned_duration_minutes: plan?.duration_minutes || customDuration || undefined,
      })

      toast.success('Sesi berhasil dimulai')
      setOpenStart(false)
      setSelectedPlan('')
      setCustomDuration(0)
      router.refresh()
    } catch (error: any) {
      toast.error(error.message || 'Terjadi kesalahan')
    } finally {
      setLoading(false)
    }
  }

  const handleEndSession = async () => {
    if (!selectedComputer) return

    const session = selectedComputer.computer_sessions?.find(s => !s.ended_at)
    if (!session) return

    setLoading(true)

    try {
      await endSession(session.id)
      toast.success('Sesi berhasil diakhiri')
      setOpenEnd(false)
      setBillingAmount(null)
      router.refresh()
    } catch (error: any) {
      toast.error(error.message || 'Terjadi kesalahan')
    } finally {
      setLoading(false)
    }
  }

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return `${hours}j ${mins}m`
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Billing Komputer</h2>
        <p className="text-muted-foreground mt-1">Kelola sesi billing komputer</p>
      </div>

      {/* Active Sessions */}
      <Card>
        <CardHeader>
          <CardTitle>Sesi Aktif ({activeComputers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {activeComputers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Clock className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p>Tidak ada sesi aktif</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {activeComputers.map(comp => {
                const session = comp.computer_sessions?.find(s => !s.ended_at)
                const startTime = session ? new Date(session.started_at) : new Date()
                const duration = Math.floor((Date.now() - startTime.getTime()) / 60000)
                
                return (
                  <div key={comp.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold text-lg">{comp.name}</p>
                        <p className="text-sm text-muted-foreground">{comp.code}</p>
                      </div>
                      <Badge className={statusColors.IN_USE}>
                        AKTIF
                      </Badge>
                    </div>

                    <div className="space-y-1 text-sm">
                      <p className="text-muted-foreground">Pengguna</p>
                      <p className="font-medium">
                        {session?.profiles?.full_name || 'Walk-in'}
                      </p>
                    </div>

                    <div className="space-y-1 text-sm">
                      <p className="text-muted-foreground">Durasi</p>
                      <p className="font-medium">{formatDuration(duration)}</p>
                    </div>

                    <div className="space-y-1 text-sm">
                      <p className="text-muted-foreground">Tarif</p>
                      <p className="font-medium">
                        Rp {Number(session?.hourly_rate || comp.hourly_rate).toLocaleString('id-ID')}/jam
                      </p>
                    </div>

                    <Button 
                      onClick={() => handleEndClick(comp)}
                      className="w-full"
                      variant="destructive"
                    >
                      <Square className="h-4 w-4 mr-2" />
                      Akhiri Sesi
                    </Button>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Available Computers */}
      <Card>
        <CardHeader>
          <CardTitle>Komputer Tersedia ({availableComputers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {availableComputers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Monitor className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p>Semua komputer sedang digunakan</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {availableComputers.map(comp => (
                <div key={comp.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-lg">{comp.name}</p>
                      <p className="text-sm text-muted-foreground">{comp.code}</p>
                    </div>
                    <Badge className={statusColors.AVAILABLE}>
                      TERSEDIA
                    </Badge>
                  </div>

                  <div className="text-sm">
                    <p className="text-muted-foreground">Tarif</p>
                    <p className="font-medium">
                      Rp {Number(comp.hourly_rate).toLocaleString('id-ID')}/jam
                    </p>
                  </div>

                  <Button 
                    onClick={() => handleStartClick(comp)}
                    className="w-full"
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Mulai Sesi
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Start Session Dialog */}
      <Dialog open={openStart} onOpenChange={setOpenStart}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mulai Sesi - {selectedComputer?.name}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Paket Billing (Opsional)</Label>
              <Select value={selectedPlan} onValueChange={setSelectedPlan}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih paket atau atur manual" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Tanpa Paket</SelectItem>
                  {plans.map(plan => (
                    <SelectItem key={plan.id} value={plan.id}>
                      {plan.name} - {plan.duration_minutes ? `${plan.duration_minutes} menit` : 'Postpaid'} - Rp {Number(plan.price).toLocaleString('id-ID')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {!selectedPlan && (
              <div className="space-y-2">
                <Label>Durasi (menit) - Opsional</Label>
                <Input
                  type="number"
                  value={customDuration || ''}
                  onChange={(e) => setCustomDuration(Number(e.target.value))}
                  placeholder="Kosongkan untuk postpaid"
                  min="0"
                />
              </div>
            )}

            <div className="bg-gray-50 p-3 rounded space-y-1">
              <p className="text-sm text-muted-foreground">Tarif Per Jam</p>
              <p className="font-bold text-lg">
                Rp {Number(selectedComputer?.hourly_rate || 0).toLocaleString('id-ID')}
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenStart(false)}>
              Batal
            </Button>
            <Button onClick={handleStartSession} disabled={loading}>
              {loading ? 'Memulai...' : 'Mulai Sesi'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* End Session Dialog */}
      <Dialog open={openEnd} onOpenChange={setOpenEnd}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Akhiri Sesi - {selectedComputer?.name}</DialogTitle>
          </DialogHeader>

          {billingAmount && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Durasi</span>
                  <span className="font-medium">{formatDuration(billingAmount.duration_minutes)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tarif</span>
                  <span className="font-medium">Rp {billingAmount.hourly_rate.toLocaleString('id-ID')}/jam</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-medium">Rp {Math.round(billingAmount.subtotal).toLocaleString('id-ID')}</span>
                </div>
                {billingAmount.discount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Diskon ({billingAmount.discount_percent}%)</span>
                    <span className="font-medium text-green-600">
                      - Rp {Math.round(billingAmount.discount).toLocaleString('id-ID')}
                    </span>
                  </div>
                )}
              </div>

              <div className="pt-4 border-t">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-lg">Total</span>
                  <span className="font-bold text-2xl text-blue-600">
                    Rp {billingAmount.total.toLocaleString('id-ID')}
                  </span>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenEnd(false)}>
              Batal
            </Button>
            <Button onClick={handleEndSession} disabled={loading} variant="destructive">
              {loading ? 'Mengakhiri...' : 'Akhiri & Tagih'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
