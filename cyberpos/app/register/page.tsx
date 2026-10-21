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

      const normalizedEmail = formData.email.trim().toLowerCase()

      // 1. Kirim ke server-side API route yang pakai Admin API
      //    → auto-verifikasi tanpa email konfirmasi
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email:     normalizedEmail,
          password:  formData.password,
          full_name: formData.fullName.trim(),
          username:  formData.username.trim(),
          phone:     formData.phone.trim(),
        }),
      })

      // Selalu parse sebagai text dulu — hindari crash jika body kosong
      const rawText = await res.text()
      let result: { error?: string; success?: boolean } = {}
      try {
        result = rawText ? JSON.parse(rawText) : {}
      } catch {
        throw new Error(`Server error (${res.status}): respons tidak valid.`)
      }

      if (!res.ok) {
        throw new Error(result.error || `Registrasi gagal (${res.status}).`)
      }

      // 2. Login langsung — akun sudah verified, session langsung terbentuk
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email:    normalizedEmail,
        password: formData.password,
      })

      if (signInError) {
        // Akun berhasil dibuat tapi login gagal — arahkan ke login manual
        toast({
          title: 'Registrasi berhasil',
          description: 'Silakan login dengan email dan password Anda.',
        })
        router.push('/login')
        return
      }

      toast({
        title: 'Registrasi berhasil',
        description: 'Anda akan dialihkan ke dashboard...',
      })

      router.refresh()
      router.push('/customer/dashboard')
    } catch (error: any) {
      console.error('Registration error:', error)

      let errorMessage: string = error.message || 'Terjadi kesalahan'

      if (errorMessage.includes('sudah terdaftar') || errorMessage.includes('already')) {
        errorMessage = 'Email sudah terdaftar. Silakan login atau gunakan fitur lupa password.'
      } else if (errorMessage.includes('invalid email') || errorMessage.includes('validate email')) {
        errorMessage = 'Format email tidak valid.'
      } else if (errorMessage.includes('username')) {
        errorMessage = 'Username sudah digunakan.'
      }

      toast({
        variant: 'destructive',
        title: 'Registrasi gagal',
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
