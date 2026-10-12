'use client'

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { formatCurrency } from "@/lib/utils"
import { Clock, Square, User } from "lucide-react"
import Link from "next/link"

interface ActiveSessionCardProps {
  session: any
}

export function ActiveSessionCard({ session }: ActiveSessionCardProps) {
  const [duration, setDuration] = useState('')
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    const calculateDuration = () => {
      const start = new Date(session.started_at).getTime()
      const now = Date.now()
      const diffMs = now - start
      const diffMins = Math.floor(diffMs / 60000)
      setElapsed(diffMins)

      const hours = Math.floor(diffMins / 60)
      const mins = diffMins % 60
      setDuration(`${hours}j ${mins}m`)
    }

    calculateDuration()
    const interval = setInterval(calculateDuration, 30000) // Update every 30s

    return () => clearInterval(interval)
  }, [session.started_at])

  // Calculate estimated amount (rounded up to nearest 15 min)
  const roundedMins = Math.ceil(elapsed / 15) * 15
  const estimatedAmount = session.billing_plans
    ? Number(session.billing_plans.price)
    : (Number(session.hourly_rate) / 60 * roundedMins)

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-base">{session.computers?.name}</CardTitle>
            <p className="text-xs text-slate-500">{session.computers?.code}</p>
          </div>
          <Badge>Aktif</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2 text-sm">
          <User className="h-4 w-4 text-slate-500" />
          <span>{session.profiles?.full_name || 'Walk-in'}</span>
          {session.customers && (
            <span className="text-xs text-slate-500">({session.customers.member_number})</span>
          )}
        </div>

        <div className="flex items-center gap-2 text-sm">
          <Clock className="h-4 w-4 text-slate-500" />
          <span>{duration}</span>
        </div>

        {session.billing_plans && (
          <div className="rounded bg-blue-50 p-2 text-xs">
            <p className="font-medium text-blue-900">{session.billing_plans.name}</p>
            <p className="text-blue-700">
              {session.billing_plans.billing_type === 'PREPAID' 
                ? `Prepaid ${session.billing_plans.duration_minutes} menit`
                : 'Postpaid'}
            </p>
          </div>
        )}

        <div className="border-t pt-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-600">Estimasi Tagihan</span>
            <span className="font-bold text-lg">{formatCurrency(estimatedAmount)}</span>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            {roundedMins} menit (dibulatkan ke 15 menit)
          </p>
        </div>

        <Button asChild className="w-full" variant="destructive">
          <Link href={`/staff/billing/stop?session=${session.id}`}>
            <Square className="mr-2 h-4 w-4" />
            Stop & Bayar
          </Link>
        </Button>
      </CardContent>
    </Card>
  )
}
