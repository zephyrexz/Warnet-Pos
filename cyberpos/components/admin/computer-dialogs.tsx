'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { createComputer, updateComputer } from '@/lib/actions/computers'
import { toast } from 'sonner'

type Computer = {
  id?: string
  code: string
  name: string
  location?: string
  specs?: any
  hourly_rate: number
  notes?: string
}

export function ComputerFormDialog({
  open,
  onOpenChange,
  computer,
  mode = 'create'
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  computer?: Computer
  mode?: 'create' | 'edit'
}) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState<Computer>(computer || {
    code: '',
    name: '',
    location: '',
    hourly_rate: 0,
    notes: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (mode === 'create') {
        await createComputer(formData)
        toast.success('Komputer berhasil ditambahkan')
      } else if (computer?.id) {
        await updateComputer(computer.id, formData)
        toast.success('Komputer berhasil diperbarui')
      }
      onOpenChange(false)
    } catch (error: any) {
      toast.error(error.message || 'Terjadi kesalahan')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? 'Tambah Komputer' : 'Edit Komputer'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="code">Kode Komputer *</Label>
              <Input
                id="code"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                placeholder="PC-01"
                required
                disabled={mode === 'edit'}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Nama Komputer *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Komputer 1"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Lokasi</Label>
              <Input
                id="location"
                value={formData.location || ''}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="Lantai 1, Meja A1"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="hourly_rate">Tarif Per Jam (Rp) *</Label>
              <Input
                id="hourly_rate"
                type="number"
                value={formData.hourly_rate}
                onChange={(e) => setFormData({ ...formData, hourly_rate: Number(e.target.value) })}
                placeholder="5000"
                required
                min="0"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Catatan</Label>
              <Textarea
                id="notes"
                value={formData.notes || ''}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Spesifikasi atau catatan lainnya"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Batal
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Menyimpan...' : 'Simpan'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function ComputerStatusDialog({
  open,
  onOpenChange,
  computer,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  computer: { id: string; name: string; status: string }
}) {
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState(computer.status)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { updateComputerStatus } = await import('@/lib/actions/computers')
      await updateComputerStatus(computer.id, status)
      toast.success('Status komputer berhasil diperbarui')
      onOpenChange(false)
    } catch (error: any) {
      toast.error(error.message || 'Terjadi kesalahan')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ubah Status - {computer.name}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="AVAILABLE">Tersedia</SelectItem>
                  <SelectItem value="MAINTENANCE">Maintenance</SelectItem>
                  <SelectItem value="DISABLED">Nonaktif</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Batal
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Menyimpan...' : 'Simpan'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
