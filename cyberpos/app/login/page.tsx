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

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const supabase = createClient()
      
      // Normalize email
      const normalizedEmail = email.trim().toLowerCase()
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      })

      if (error) throw error

      // Get user profile to check role with retry mechanism
      let profile = null
      let profileError = null
      let retries = 3
      
      while (retries > 0 && !profile) {
        const result = await supabase
          .from('profiles')
          .select('role')
          .eq('id', data.user.id)
          .maybeSingle()
        
        profileError = result.error
        profile = result.data
        
        if (!profile && retries > 1) {
          // Wait before retry
          await new Promise(resolve => setTimeout(resolve, 300))
        }
        retries--
      }

      if (profileError) {
        console.error('Profile query error:', profileError)
        toast({
          variant: "destructive",
          title: "Kesalahan sistem",
          description: "Gagal mengambil data profil. Silakan coba lagi.",
        })
        await supabase.auth.signOut()
        return
      }

      if (!profile) {
        console.error('Profile not found for user:', data.user.id)
        toast({
          variant: "destructive",
          title: "Profil tidak ditemukan",
          description: "Akun Anda belum memiliki profil. Silakan hubungi administrator.",
        })
        await supabase.auth.signOut()
        return
      }

      const role = profile.role

      if (!role || !['CUSTOMER', 'CASHIER', 'ADMIN', 'OWNER', 'TECHNICIAN'].includes(role)) {
        console.error('Invalid role for user:', data.user.id, 'role:', role)
        toast({
          variant: "destructive",
          title: "Role tidak valid",
          description: "Role akun Anda tidak dikenali. Silakan hubungi administrator.",
        })
        await supabase.auth.signOut()
        return
      }

      toast({
        title: "Login berhasil",
        description: "Anda akan dialihkan...",
      })

      // Refresh router to ensure session is available
      router.refresh()

      // Small delay to ensure cookie propagation
      await new Promise(resolve => setTimeout(resolve, 100))

      // Redirect based on role
      if (role === 'CUSTOMER') {
        router.push('/customer/dashboard')
      } else if (role === 'CASHIER') {
        router.push('/cashier/dashboard')
      } else if (role === 'OWNER' || role === 'ADMIN') {
        router.push('/admin/dashboard')
      } else if (role === 'TECHNICIAN') {
        router.push('/admin/dashboard') // ponytail: create /technician/dashboard when needed
      }
    } catch (error: any) {
      console.error('Login error:', error)
      
      let errorMessage = "Email atau password salah"
      
      if (error.message?.includes('Invalid login credentials')) {
        errorMessage = "Email atau password salah"
      } else if (error.message?.includes('Email not confirmed')) {
        errorMessage = "Email belum diverifikasi. Silakan cek inbox Anda."
      } else if (error.message) {
        errorMessage = error.message
      }
      
      toast({
        variant: "destructive",
        title: "Login gagal",
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
          <CardTitle className="text-2xl font-bold tracking-tight">Masuk ke CyberPOS</CardTitle>
          <CardDescription>
            Masukkan email dan password Anda
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleLogin}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="nama@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Memproses..." : "Masuk"}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              Belum punya akun?{" "}
              <Link href="/register" className="font-medium text-primary hover:underline">
                Daftar di sini
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
