'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, MoreVertical, FolderOpen } from "lucide-react"
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { createCategory, updateCategory, deleteCategory } from '@/lib/actions/categories'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

type Category = {
  id: string
  name: string
  description?: string
  is_active: boolean
  product_count: number
}

export default function CategoriesClient({
  initialCategories,
  userRole,
}: {
  initialCategories: Category[]
  userRole: string
}) {
  const router = useRouter()
  const [categories, setCategories] = useState(initialCategories)
  const [openForm, setOpenForm] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null)
  const [mode, setMode] = useState<'create' | 'edit'>('create')
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({ name: '', description: '' })

  const handleAdd = () => {
    setSelectedCategory(null)
    setMode('create')
    setFormData({ name: '', description: '' })
    setOpenForm(true)
  }

  const handleEdit = (cat: Category) => {
    setSelectedCategory(cat)
    setMode('edit')
    setFormData({ name: cat.name, description: cat.description || '' })
    setOpenForm(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (mode === 'create') {
        await createCategory(formData)
        toast.success('Kategori berhasil ditambahkan')
      } else if (selectedCategory) {
        await updateCategory(selectedCategory.id, formData)
        toast.success('Kategori berhasil diperbarui')
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
    if (!confirm('Yakin ingin menonaktifkan kategori ini?')) return

    try {
      await deleteCategory(id)
      toast.success('Kategori berhasil dinonaktifkan')
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
          <h2 className="text-3xl font-bold tracking-tight">Kategori Produk</h2>
          <p className="text-muted-foreground mt-1">Kelola kategori untuk mengorganisir produk</p>
        </div>
        {canManage && (
          <Button onClick={handleAdd}>
            <Plus className="h-4 w-4 mr-2" />
            Tambah Kategori
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Daftar Kategori</CardTitle>
        </CardHeader>
        <CardContent>
          {categories.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FolderOpen className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p>Belum ada kategori.</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {categories.map((cat) => (
                <div key={cat.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-semibold text-lg">{cat.name}</p>
                      {cat.description && (
                        <p className="text-sm text-muted-foreground mt-1">{cat.description}</p>
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
                          <DropdownMenuItem onClick={() => handleEdit(cat)}>
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleDelete(cat.id)}
                            className="text-red-600"
                            disabled={cat.product_count > 0}
                          >
                            Nonaktifkan
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2 pt-2 border-t">
                    <Badge variant="outline">{cat.product_count} produk</Badge>
                    {cat.is_active ? (
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
                {mode === 'create' ? 'Tambah Kategori' : 'Edit Kategori'}
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSubmit}>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nama Kategori *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Makanan & Minuman"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Deskripsi</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Deskripsi kategori"
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
