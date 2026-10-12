'use client'

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { createClient } from "@/lib/supabase/client"
import { Plus, Edit, Trash2 } from "lucide-react"

export default function CategoriesPage() {
  const [categories, setCategories] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [newCategory, setNewCategory] = useState({ name: '', description: '' })
  const [editingId, setEditingId] = useState<string | null>(null)
  
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClient()

  useEffect(() => {
    loadCategories()
  }, [])

  const loadCategories = async () => {
    const { data } = await supabase
      .from('product_categories')
      .select('*')
      .order('name')
    setCategories(data || [])
  }

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { error } = await supabase
        .from('product_categories')
        .insert({
          name: newCategory.name,
          description: newCategory.description || null,
        })

      if (error) throw error

      toast({ title: "Kategori ditambahkan" })
      setNewCategory({ name: '', description: '' })
      loadCategories()
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

  const handleToggleActive = async (id: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('product_categories')
        .update({ is_active: !isActive })
        .eq('id', id)

      if (error) throw error

      toast({ title: isActive ? "Kategori dinonaktifkan" : "Kategori diaktifkan" })
      loadCategories()
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
          <Link href="/staff/products" className="text-xl font-bold text-blue-600">
            ← Kembali ke Produk
          </Link>
        </div>
      </nav>

      <main className="container mx-auto max-w-4xl p-4">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Kategori Produk</h1>
          <p className="text-sm text-slate-600">Kelola kategori untuk produk</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Tambah Kategori</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAdd} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nama Kategori *</Label>
                  <Input
                    id="name"
                    placeholder="Makanan"
                    value={newCategory.name}
                    onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Deskripsi</Label>
                  <Input
                    id="description"
                    placeholder="Makanan ringan dan berat"
                    value={newCategory.description}
                    onChange={(e) => setNewCategory({ ...newCategory, description: e.target.value })}
                  />
                </div>
                <Button type="submit" disabled={loading} className="w-full">
                  <Plus className="mr-2 h-4 w-4" />
                  {loading ? "Menyimpan..." : "Tambah"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Daftar Kategori ({categories.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {categories.map((cat) => (
                  <div key={cat.id} className="flex items-center justify-between rounded border p-3">
                    <div>
                      <p className="font-medium">{cat.name}</p>
                      {cat.description && (
                        <p className="text-xs text-slate-500">{cat.description}</p>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant={cat.is_active ? "outline" : "default"}
                      onClick={() => handleToggleActive(cat.id, cat.is_active)}
                    >
                      {cat.is_active ? "Nonaktifkan" : "Aktifkan"}
                    </Button>
                  </div>
                ))}
                {categories.length === 0 && (
                  <p className="py-8 text-center text-sm text-slate-500">Belum ada kategori</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
