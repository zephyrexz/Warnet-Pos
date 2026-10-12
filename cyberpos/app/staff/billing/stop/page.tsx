'use client'

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { createClient } from "@/lib/supabase/client"
import { formatCurrency } from "@/lib/utils"

function StopBillingForm() {
  const [loading, setLoading] = useState(false)
  const [session, setSession] = useState<any>(null)
  const [user, setUser] = useState<any>(null)
  const [calculation, setCalculation] = useState<any>(null)
  const [paymentMethod, setPaymentMethod] = useState('CASH')
  const [paidAmount, setPaidAmount] = useState('')
  
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const supabase = createClient()

  useEffect(() => {
    loadSession()
  }, [searchParams])

  const loadSession = async () => {
    const sessionId = searchParams.get('session')
    if (!sessionId) return

    const { data: { user } } = await supabase.auth.getUser()
    setUser(user)

    const { data } = await supabase
      .from('computer_sessions')
      .select(`
        *,
        computers (name, code, hourly_rate),
        customers (member_number, wallet_balance),
        profiles!computer_sessions_customer_id_fkey (full_name),
        billing_plans (name, billing_type, duration_minutes, price)
      `)
      .eq('id', sessionId)
      .single()

    setSession(data)

    // Calculate duration and amount
    if (data) {
      const start = new Date(data.started_at).getTime()
      const now = Date.now()
      const durationMins = Math.ceil((now - start) / 60000 / 15) * 15 // Round up to 15 min
      
      const amount = data.billing_plans
        ? Number(data.billing_plans.price)
        : (Number(data.hourly_rate) / 60 * durationMins)

      setCalculation({
        duration_minutes: durationMins,
        amount: amount * (1 - Number(data.discount_percent) / 100),
        subtotal: amount,
        discount: amount * Number(data.discount_percent) / 100,
      })

      setPaidAmount(String(Math.ceil(amount)))
    }
  }

  const handleStop = async () => {
    if (!user || !session) return

    setLoading(true)

    try {
      // Stop session
      const stopResponse = await fetch('/api/billing/stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: session.id,
          stopped_by: user.id,
        }),
      })

      const stopResult = await stopResponse.json()
      if (!stopResult.success) throw new Error(stopResult.error)

      // Create sale for billing
      const saleResponse = await fetch('/api/pos/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cashier_id: user.id,
          customer_id: session.customer_id,
          items: [],
          payment_method: paymentMethod,
          paid_amount: paymentMethod === 'CASH' ? parseFloat(paidAmount) : calculation.amount,
          idempotency_key: `billing-${session.id}`,
        }),
      })

      // Store billing info in sale notes (ponytail: create billing_sales table for proper tracking)
      await supabase
        .from('sales')
        .update({
          session_id: session.id,
          notes: `Billing ${session.computers.name} - ${stopResult.duration_minutes} menit`,
          subtotal: stopResult.amount,
          total: stopResult.amount,
        })
        .eq('invoice_number', (await saleResponse.json()).invoice_number)

      toast({
        title: "Sesi selesai",
        description: "Billing berhasil diproses",
      })

      router.push('/staff/billing')
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

  if (!session || !calculation) {
    return <div className="flex min-h-screen items-center justify-center">Loading...</div>
  }

  const change = paymentMethod === 'CASH' ? Math.max(0, parseFloat(paidAmount) - calculation.amount) : 0

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
            <CardTitle>Stop Sesi & Pembayaran</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="rounded-lg bg-slate-50 p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Komputer</span>
                <span className="font-medium">{session.computers.name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Pelanggan</span>
                <span className="font-medium">{session.profiles?.full_name || 'Walk-in'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Durasi</span>
                <span className="font-medium">{calculation.duration_minutes} menit</span>
              </div>
              {session.billing_plans && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Paket</span>
                  <span className="font-medium">{session.billing_plans.name}</span>
                </div>
              )}
            </div>

            <div className="space-y-2 border-t pt-4">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>{formatCurrency(calculation.subtotal)}</span>
              </div>
              {calculation.discount > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>Diskon</span>
                  <span>-{formatCurrency(calculation.discount)}</span>
                </div>
              )}
              <div className="flex justify-between text-xl font-bold">
                <span>Total</span>
                <span>{formatCurrency(calculation.amount)}</span>
              </div>
            </div>

            <div className="space-y-4 border-t pt-4">
              <div className="space-y-2">
                <Label>Metode Pembayaran</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CASH">Tunai</SelectItem>
                    <SelectItem value="QRIS">QRIS</SelectItem>
                    <SelectItem value="TRANSFER">Transfer</SelectItem>
                    {session.customers && Number(session.customers.wallet_balance) >= calculation.amount && (
                      <SelectItem value="WALLET">Wallet ({formatCurrency(Number(session.customers.wallet_balance))})</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>

              {paymentMethod === 'CASH' && (
                <>
                  <div className="space-y-2">
                    <Label>Jumlah Dibayar</Label>
                    <Input
                      type="number"
                      value={paidAmount}
                      onChange={(e) => setPaidAmount(e.target.value)}
                      placeholder="0"
                    />
                  </div>
                  <div className="flex justify-between rounded-lg bg-slate-50 p-3">
                    <span className="font-medium">Kembalian</span>
                    <span className="text-xl font-bold">{formatCurrency(change)}</span>
                  </div>
                </>
              )}
            </div>

            <div className="flex gap-2 pt-4">
              <Button 
                onClick={handleStop} 
                disabled={loading || (paymentMethod === 'CASH' && parseFloat(paidAmount) < calculation.amount)}
                className="flex-1"
              >
                {loading ? "Memproses..." : "Konfirmasi Pembayaran"}
              </Button>
              <Button type="button" variant="outline" asChild>
                <Link href="/staff/billing">Batal</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}

export default function StopBillingPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center">Loading...</div>}>
      <StopBillingForm />
    </Suspense>
  )
}
