'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Clock, DollarSign, TrendingUp } from "lucide-react"
import { openShift, closeShift } from '@/lib/actions/shifts'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"

type Shift = {
  id: string
  opened_at: string
  closed_at?: string
  opening_balance: number
  expected_balance?: number
  actual_balance?: number
  difference?: number
  notes?: string
}

export default function ShiftsClient({
  currentShift,
  shiftHistory,
}: {
  currentShift: Shift | null
  shiftHistory: Shift[]
}) {
  const router = useRouter()
  const [openingBalance, setOpeningBalance] = useState<number>(0)
  const [actualBalance, setActualBalance] = useState<number>(0)
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [showOpen, setShowOpen] = useState(false)
  const [showClose, setShowClose] = useState(false)

  const handleOpenShift = async () => {
    if (openingBalance < 0) {
      toast.error('Saldo awal tidak valid')
      return
    }

    setLoading(true)
    try {
      await openShift(openingBalance)
      toast.success('Shift berhasil dibuka')
      setShowOpen(false)
      setOpeningBalance(0)
      router.refresh()
    } catch (error: any) {
      toast.error(error.message || 'Terjadi kesalahan')
    } finally {
      setLoading(false)
    }
  }

  const handleCloseShift = async () => {
    if (!currentShift) return

    setLoading(true)
    try {
      await closeShift(currentShift.id, actualBalance, notes)
      toast.success('Shift berhasil ditutup')
      setShowClose(false)
      setActualBalance(0)
      setNotes('')
      router.refresh()
    } catch (error: any) {
      toast.error(error.message || 'Terjadi kesalahan')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Shift Kasir</h2>
          <p className="text-muted-foreground mt-1">Kelola shift dan kas Anda</p>
        </div>
        {!currentShift && (
          <Button onClick={() => setShowOpen(true)}>
            <Clock className="h-4 w-4 mr-2" />
            Buka Shift
          </Button>
        )}
      </div>

      {/* Current Shift */}
      {currentShift ? (
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-green-600" />
                Shift Aktif
              </span>
              <Badge className="bg-green-600">BERJALAN</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Dibuka Pada</p>
                <p className="font-semibold">
                  {new Date(currentShift.opened_at).toLocaleString('id-ID')}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Saldo Awal</p>
                <p className="font-semibold">
                  Rp {Number(currentShift.opening_balance).toLocaleString('id-ID')}
                </p>
              </div>
            </div>

            <Button 
              onClick={() => setShowClose(true)} 
              variant="destructive"
              className="w-full"
            >
              Tutup Shift
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Clock className="h-12 w-12 mx-auto mb-4 opacity-20" />
            <p>Tidak ada shift aktif</p>
            <p className="text-sm mt-2">Buka shift untuk memulai transaksi</p>
          </CardContent>
        </Card>
      )}

      {/* Shift History */}
      <Card>
        <CardHeader>
          <CardTitle>Riwayat Shift</CardTitle>
        </CardHeader>
        <CardContent>
          {shiftHistory.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Belum ada riwayat shift
            </p>
          ) : (
            <div className="space-y-3">
              {shiftHistory.map((shift) => {
                const difference = shift.difference || 0
                const isDifferent = Math.abs(difference) > 0
                
                return (
                  <div key={shift.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium">
                          {new Date(shift.opened_at).toLocaleDateString('id-ID')}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(shift.opened_at).toLocaleTimeString('id-ID')} - {' '}
                          {shift.closed_at && new Date(shift.closed_at).toLocaleTimeString('id-ID')}
                        </p>
                      </div>
                      {isDifferent && (
                        <Badge variant={difference > 0 ? 'default' : 'destructive'}>
                          {difference > 0 ? 'Lebih' : 'Kurang'} Rp {Math.abs(difference).toLocaleString('id-ID')}
                        </Badge>
                      )}
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                      <div>
                        <p className="text-muted-foreground">Saldo Awal</p>
                        <p className="font-medium">
                          Rp {Number(shift.opening_balance).toLocaleString('id-ID')}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Saldo Harapan</p>
                        <p className="font-medium">
                          Rp {Number(shift.expected_balance || 0).toLocaleString('id-ID')}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Saldo Aktual</p>
                        <p className="font-medium">
                          Rp {Number(shift.actual_balance || 0).toLocaleString('id-ID')}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Selisih</p>
                        <p className={`font-medium ${difference > 0 ? 'text-green-600' : difference < 0 ? 'text-red-600' : ''}`}>
                          Rp {Math.abs(difference).toLocaleString('id-ID')}
                        </p>
                      </div>
                    </div>

                    {shift.notes && (
                      <p className="text-sm text-muted-foreground border-t pt-2">
                        Catatan: {shift.notes}
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Open Shift Dialog */}
      <Dialog open={showOpen} onOpenChange={setShowOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Buka Shift</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="opening_balance">Saldo Awal (Rp) *</Label>
              <Input
                id="opening_balance"
                type="number"
                value={openingBalance || ''}
                onChange={(e) => setOpeningBalance(Number(e.target.value))}
                placeholder="0"
                min="0"
              />
              <p className="text-xs text-muted-foreground">
                Masukkan jumlah kas awal yang ada di kasir
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowOpen(false)}>
              Batal
            </Button>
            <Button onClick={handleOpenShift} disabled={loading || openingBalance < 0}>
              {loading ? 'Membuka...' : 'Buka Shift'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Close Shift Dialog */}
      <Dialog open={showClose} onOpenChange={setShowClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tutup Shift</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {currentShift && (
              <div className="bg-gray-50 p-3 rounded space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Saldo Awal</span>
                  <span className="font-medium">
                    Rp {Number(currentShift.opening_balance).toLocaleString('id-ID')}
                  </span>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="actual_balance">Saldo Akhir Aktual (Rp) *</Label>
              <Input
                id="actual_balance"
                type="number"
                value={actualBalance || ''}
                onChange={(e) => setActualBalance(Number(e.target.value))}
                placeholder="0"
                min="0"
              />
              <p className="text-xs text-muted-foreground">
                Hitung dan masukkan jumlah kas aktual di kasir
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Catatan (Opsional)</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Tambahkan catatan jika diperlukan"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowClose(false)}>
              Batal
            </Button>
            <Button onClick={handleCloseShift} disabled={loading} variant="destructive">
              {loading ? 'Menutup...' : 'Tutup Shift'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
