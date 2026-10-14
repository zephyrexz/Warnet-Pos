import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Monitor, ShoppingCart, Users, Wrench, ArrowRight, Check } from "lucide-react"

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 lg:px-6">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Monitor className="h-4 w-4 text-white" />
            </div>
            <span className="text-xl font-bold">CyberPOS</span>
          </div>
          <div className="flex items-center gap-3">
            <Button asChild variant="ghost">
              <Link href="/login">Masuk</Link>
            </Button>
            <Button asChild>
              <Link href="/register">Daftar Sekarang</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-16 lg:py-24">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="mb-6 text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
            Sistem Manajemen Warnet Modern
          </h1>
          <p className="mb-8 text-lg text-muted-foreground sm:text-xl">
            Kelola warnet Anda dengan mudah: billing komputer, kasir, inventaris, dan membership dalam satu platform terintegrasi
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Button asChild size="lg">
              <Link href="/register">
                Mulai Sekarang
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/login">Masuk ke Dashboard</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="border-t bg-muted/30 py-16 lg:py-24">
        <div className="container mx-auto px-4">
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl">
              Fitur Lengkap untuk Warnet
            </h2>
            <p className="text-lg text-muted-foreground">
              Semua yang Anda butuhkan untuk mengelola warnet secara profesional
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader>
                <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <Monitor className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>Billing Komputer</CardTitle>
                <CardDescription>
                  Sistem billing otomatis dengan berbagai pilihan paket
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <span>Prepaid & Postpaid</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <span>Tracking real-time</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <span>Reservasi online</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-lg bg-green-100">
                  <ShoppingCart className="h-6 w-6 text-green-600" />
                </div>
                <CardTitle>POS Kasir</CardTitle>
                <CardDescription>
                  Point of Sale terintegrasi dengan manajemen stok
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>Inventaris otomatis</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>Multiple payment</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>Struk digital</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-lg bg-purple-100">
                  <Users className="h-6 w-6 text-purple-600" />
                </div>
                <CardTitle>Membership</CardTitle>
                <CardDescription>
                  Program loyalitas dengan poin dan tingkatan member
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-purple-600 mt-0.5 flex-shrink-0" />
                    <span>Sistem poin reward</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-purple-600 mt-0.5 flex-shrink-0" />
                    <span>Diskon member</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-purple-600 mt-0.5 flex-shrink-0" />
                    <span>Voucher promo</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-lg bg-orange-100">
                  <Wrench className="h-6 w-6 text-orange-600" />
                </div>
                <CardTitle>Maintenance</CardTitle>
                <CardDescription>
                  Kelola perawatan dan perbaikan perangkat
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-orange-600 mt-0.5 flex-shrink-0" />
                    <span>Tiket maintenance</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-orange-600 mt-0.5 flex-shrink-0" />
                    <span>History perbaikan</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-orange-600 mt-0.5 flex-shrink-0" />
                    <span>Status tracking</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="border-t py-16 lg:py-24">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl">
              Siap Memulai?
            </h2>
            <p className="mb-8 text-lg text-muted-foreground">
              Daftar sekarang dan rasakan kemudahan mengelola warnet dengan sistem terintegrasi
            </p>
            <Button asChild size="lg">
              <Link href="/register">
                Daftar Gratis Sekarang
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-muted/30 py-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded bg-primary">
                <Monitor className="h-3 w-3 text-white" />
              </div>
              <span className="font-semibold">CyberPOS</span>
            </div>
            <p className="text-sm text-muted-foreground">
              &copy; 2026 CyberPOS. Sistem Manajemen Warnet Modern.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
