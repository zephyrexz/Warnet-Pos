'use client'

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { createClient } from "@/lib/supabase/client"

export const dynamic = 'force-dynamic'

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    fullName: "",
    username: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  })
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (formData.password !== formData.confirmPassword) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Password tidak cocok",
      })
      return
    }

    if (formData.password.length < 6) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Password minimal 6 karakter",
      })
      return
    }

    setLoading(true)

    try {
      const supabase = createClient()
      
      // Register with Supabase Auth with metadata
      const { data, error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.fullName,
            username: formData.username,
            phone: formData.phone,
          },
        },
      })

      if (error) throw error
      if (!data.user) throw new Error('Registrasi gagal')

      // Create profile with CUSTOMER role via RPC
      const { error: rpcError } = await supabase.rpc('create_user_profile', {
        user_id: data.user.id,
        user_email: formData.email,
        user_full_name: formData.fullName,
        user_username: formData.username,
        user_phone: formData.phone || null
      })

      if (rpcError) {
        console.error('Profile creation error:', rpcError)
        throw new Error('Gagal membuat profil pengguna: ' + rpcError.message)
      }

      toast({
        title: "Registrasi berhasil",
        description: "Anda akan dialihkan ke dashboard...",
      })

      // Refresh router to ensure session is available
      router.refresh()

      // Small delay for cookie propagation
      await new Promise(resolve => setTimeout(resolve, 100))

      // Auto-login: redirect to customer dashboard
      router.push('/customer/dashboard')
    } catch (error: any) {
      console.error('Registration error:', error)
      
      // Handle specific error cases
      let errorMessage = error.message || "Terjadi kesalahan"
      
      if (error.message?.includes('already registered')) {
        errorMessage = "Email sudah terdaftar"
      } else if (error.message?.includes('invalid email')) {
        errorMessage = "Format email tidak valid"
      } else if (error.message?.includes('username')) {
        errorMessage = "Username sudah digunakan"
      }
      
      toast({
        variant: "destructive",
        title: "Registrasi gagal",
        description: errorMessage,
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold tracking-tight">Daftar CyberPOS</CardTitle>
          <CardDescription>
            Buat akun pelanggan baru
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Nama Lengkap</Label>
              <Input
                id="fullName"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Nomor Telepon</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="08123456789"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Konfirmasi Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                required
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Memproses..." : "Daftar"}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              Sudah punya akun?{" "}
              <Link href="/login" className="font-medium text-primary hover:underline">
                Masuk di sini
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
