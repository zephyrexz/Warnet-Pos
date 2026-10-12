'use client'

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { createClient } from "@/lib/supabase/client"

export default function NewComputerPage() {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    location: '',
    hourly_rate: '',
    status: 'AVAILABLE',
    specs: '',
    notes: '',
  })
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { error } = await supabase
        .from('computers')
        .insert({
          code: formData.code,
          name: formData.name,
          location: formData.location || null,
          hourly_rate: parseFloat(formData.hourly_rate),
          status: formData.status,
          specs: formData.specs ? JSON.parse(formData.specs) : null,
          notes: formData.notes || null,
        })

      if (error) throw error

      toast({
        title: "Berhasil",
        description: "Komputer berhasil ditambahkan",
      })

      router.push('/staff/computers')
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

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="border-b bg-white">
        <div className="container mx-auto flex h-16 items-center px-4">
          <Link href="/staff/computers" className="text-xl font-bold text-blue-600">
            ← Kembali
          </Link>
        </div>
      </nav>

      <main className="container mx-auto max-w-2xl p-4">
        <Card>
          <CardHeader>
            <CardTitle>Tambah Komputer Baru</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="code">Kode Komputer *</Label>
                <Input
                  id="code"
                  placeholder="PC-01"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Nama Komputer *</Label>
                <Input
                  id="name"
                  placeholder="Komputer 1"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">Lokasi</Label>
                <Input
                  id="location"
                  placeholder="Lantai 1 - Kiri"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="hourly_rate">Tarif per Jam (Rp) *</Label>
                <Input
                  id="hourly_rate"
                  type="number"
                  placeholder="5000"
                  value={formData.hourly_rate}
                  onChange={(e) => setFormData({ ...formData, hourly_rate: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
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

              <div className="space-y-2">
                <Label htmlFor="specs">Spesifikasi (JSON opsional)</Label>
                <Textarea
                  id="specs"
                  placeholder='{"cpu": "Intel i5", "ram": "16GB", "gpu": "GTX 1650"}'
                  value={formData.specs}
                  onChange={(e) => setFormData({ ...formData, specs: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Catatan</Label>
                <Textarea
                  id="notes"
                  placeholder="Catatan tambahan..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="flex gap-2 pt-4">
                <Button type="submit" disabled={loading} className="flex-1">
                  {loading ? "Menyimpan..." : "Simpan"}
                </Button>
                <Button type="button" variant="outline" asChild>
                  <Link href="/staff/computers">Batal</Link>
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
