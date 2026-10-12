'use client'

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { createClient } from "@/lib/supabase/client"
import { Badge } from "@/components/ui/badge"
import { UserPlus } from "lucide-react"

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    full_name: '',
    username: '',
    phone: '',
    role: 'CASHIER',
  })
  
  const { toast } = useToast()
  const supabase = createClient()

  useEffect(() => {
    loadUsers()
  }, [])

  const loadUsers = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .neq('role', 'CUSTOMER')
      .order('created_at', { ascending: false })
    setUsers(data || [])
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Note: Creating users requires admin API or service role
      // For production, this should call a secure API endpoint
      toast({
        title: "Info",
        description: "Pembuatan user memerlukan akses admin. Gunakan Supabase Dashboard atau SQL untuk membuat user baru.",
      })
      
      // ponytail: Implement secure user creation endpoint with service role
      // Example SQL for manual creation:
      // INSERT INTO auth.users (email, encrypted_password, email_confirmed_at)
      // VALUES ('email', crypt('password', gen_salt('bf')), now());
      
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

  const roleColors: Record<string, string> = {
    OWNER: 'bg-purple-100 text-purple-700',
    ADMIN: 'bg-blue-100 text-blue-700',
    CASHIER: 'bg-green-100 text-green-700',
    TECHNICIAN: 'bg-orange-100 text-orange-700',
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="border-b bg-white">
        <div className="container mx-auto flex h-16 items-center px-4">
          <Link href="/staff/dashboard" className="text-xl font-bold text-blue-600">
            ← Dashboard
          </Link>
        </div>
      </nav>

      <main className="container mx-auto max-w-6xl p-4">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Manajemen User</h1>
            <p className="text-sm text-slate-600">Kelola akun staff dan karyawan</p>
          </div>
          <Button onClick={() => setShowForm(!showForm)}>
            <UserPlus className="mr-2 h-4 w-4" />
            Tambah User
          </Button>
        </div>

        {showForm && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Tambah User Baru</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg bg-yellow-50 p-4 text-sm text-yellow-800">
                <p className="font-medium">Catatan:</p>
                <p className="mt-1">
                  Pembuatan user staff memerlukan akses service role. Untuk sekarang, gunakan Supabase Dashboard
                  atau jalankan SQL berikut untuk membuat user:
                </p>
                <code className="mt-2 block rounded bg-yellow-100 p-2 text-xs">
                  {`-- 1. Create auth user di Supabase Dashboard > Authentication
-- 2. Update role di profiles table:
UPDATE profiles SET role = 'CASHIER' WHERE email = 'email@example.com';`}
                </code>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Daftar User ({users.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium">Nama</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Email</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Username</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Phone</th>
                    <th className="px-4 py-3 text-center text-sm font-medium">Role</th>
                    <th className="px-4 py-3 text-center text-sm font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id} className="border-b hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium">{user.full_name}</td>
                      <td className="px-4 py-3 text-sm">{user.email}</td>
                      <td className="px-4 py-3 text-sm">{user.username || '-'}</td>
                      <td className="px-4 py-3 text-sm">{user.phone || '-'}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-block rounded-full px-3 py-1 text-xs font-medium ${roleColors[user.role] || 'bg-gray-100 text-gray-700'}`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge variant={user.is_active ? 'default' : 'secondary'}>
                          {user.is_active ? 'Aktif' : 'Nonaktif'}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
