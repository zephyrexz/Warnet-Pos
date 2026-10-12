import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Monitor, ShoppingCart, Users, Wrench } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      <nav className="border-b bg-white">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <h1 className="text-2xl font-bold text-blue-600">CyberPOS</h1>
          <div className="flex gap-4">
            <Button asChild variant="ghost">
              <Link href="/login">Masuk</Link>
            </Button>
            <Button asChild>
              <Link href="/register">Daftar</Link>
            </Button>
          </div>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-12">
        <section className="mb-16 text-center">
          <h2 className="mb-4 text-5xl font-bold text-slate-900">
            Sistem Manajemen Warnet Modern
          </h2>
          <p className="mb-8 text-xl text-slate-600">
            Kelola warnet Anda dengan mudah: billing komputer, kasir, inventaris, dan membership
          </p>
          <div className="flex justify-center gap-4">
            <Button asChild size="lg">
              <Link href="/register">Mulai Sekarang</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/login">Masuk Staf</Link>
            </Button>
          </div>
        </section>

        <section className="mb-16">
          <h3 className="mb-8 text-center text-3xl font-bold">Fitur Utama</h3>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader>
                <Monitor className="mb-2 h-10 w-10 text-blue-600" />
                <CardTitle>Billing Komputer</CardTitle>
                <CardDescription>
                  Prepaid & postpaid dengan perhitungan otomatis
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1 text-sm text-slate-600">
                  <li>• Tracking sesi real-time</li>
                  <li>• Paket fleksibel</li>
                  <li>• Reservasi online</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <ShoppingCart className="mb-2 h-10 w-10 text-green-600" />
                <CardTitle>POS Kasir</CardTitle>
                <CardDescription>
                  Penjualan produk dengan manajemen stok
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1 text-sm text-slate-600">
                  <li>• Inventaris otomatis</li>
                  <li>• Multiple payment</li>
                  <li>• Struk digital</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Users className="mb-2 h-10 w-10 text-purple-600" />
                <CardTitle>Membership</CardTitle>
                <CardDescription>
                  Loyalty program dengan poin dan tier
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1 text-sm text-slate-600">
                  <li>• Sistem poin</li>
                  <li>• Diskon member</li>
                  <li>• Voucher promo</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Wrench className="mb-2 h-10 w-10 text-orange-600" />
                <CardTitle>Maintenance</CardTitle>
                <CardDescription>
                  Tracking perawatan dan perbaikan komputer
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1 text-sm text-slate-600">
                  <li>• Tiket maintenance</li>
                  <li>• History perbaikan</li>
                  <li>• Status tracking</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="rounded-lg bg-blue-600 p-12 text-center text-white">
          <h3 className="mb-4 text-3xl font-bold">Siap Memulai?</h3>
          <p className="mb-6 text-lg">
            Daftar sekarang dan nikmati kemudahan mengelola warnet Anda
          </p>
          <Button asChild size="lg" variant="secondary">
            <Link href="/register">Daftar Gratis</Link>
          </Button>
        </section>
      </main>

      <footer className="border-t bg-white py-8">
        <div className="container mx-auto px-4 text-center text-slate-600">
          <p>&copy; 2026 CyberPOS. Sistem Manajemen Warnet.</p>
        </div>
      </footer>
    </div>
  );
}
