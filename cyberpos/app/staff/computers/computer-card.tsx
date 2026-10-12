'use client'

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { formatCurrency, formatDateTime } from "@/lib/utils"
import { Monitor, Play, Square, Settings } from "lucide-react"
import Link from "next/link"

interface ComputerCardProps {
  computer: any
}

const statusConfig = {
  AVAILABLE: { label: 'Tersedia', color: 'bg-green-500' },
  IN_USE: { label: 'Digunakan', color: 'bg-blue-500' },
  RESERVED: { label: 'Reservasi', color: 'bg-yellow-500' },
  MAINTENANCE: { label: 'Maintenance', color: 'bg-orange-500' },
  DISABLED: { label: 'Nonaktif', color: 'bg-gray-500' },
}

export function ComputerCard({ computer }: ComputerCardProps) {
  const status = statusConfig[computer.status as keyof typeof statusConfig]
  const session = computer.activeSession

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <Monitor className="h-5 w-5 text-slate-600" />
            <div>
              <CardTitle className="text-base">{computer.name}</CardTitle>
              <p className="text-xs text-slate-500">{computer.code}</p>
            </div>
          </div>
          <div className={`h-3 w-3 rounded-full ${status.color}`} />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-600">Status</span>
          <Badge variant={computer.status === 'AVAILABLE' ? 'default' : 'secondary'}>
            {status.label}
          </Badge>
        </div>

        {computer.location && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-600">Lokasi</span>
            <span className="font-medium">{computer.location}</span>
          </div>
        )}

        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-600">Tarif</span>
          <span className="font-medium">{formatCurrency(Number(computer.hourly_rate))}/jam</span>
        </div>

        {session && (
          <div className="rounded-lg bg-blue-50 p-3 text-sm">
            <p className="font-medium text-blue-900">
              {session.profiles?.full_name || 'Walk-in'}
            </p>
            <p className="text-xs text-blue-700">
              Mulai: {formatDateTime(session.started_at)}
            </p>
          </div>
        )}

        <div className="flex gap-2 pt-2">
          {computer.status === 'AVAILABLE' && (
            <Button asChild size="sm" className="flex-1">
              <Link href={`/staff/billing/start?computer=${computer.id}`}>
                <Play className="mr-1 h-3 w-3" />
                Mulai
              </Link>
            </Button>
          )}
          {computer.status === 'IN_USE' && session && (
            <Button asChild size="sm" variant="destructive" className="flex-1">
              <Link href={`/staff/billing/stop?session=${session.id}`}>
                <Square className="mr-1 h-3 w-3" />
                Stop
              </Link>
            </Button>
          )}
          <Button asChild size="sm" variant="outline">
            <Link href={`/staff/computers/${computer.id}`}>
              <Settings className="h-3 w-3" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
