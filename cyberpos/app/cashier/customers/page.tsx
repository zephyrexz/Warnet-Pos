import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users } from "lucide-react"

export default async function CustomersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'CASHIER') redirect('/login')

  const { data: customers } = await supabase
    .from('customers')
    .select(`*, profiles!customers_id_fkey (full_name, email, phone)`)
    .order('created_at', { ascending: false })
    .limit(50)

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Pelanggan</h2>
        <p className="text-muted-foreground mt-1">Cari data pelanggan</p>
      </div>

      <Card>
        <CardHeader><CardTitle>Daftar Pelanggan</CardTitle></CardHeader>
        <CardContent>
          {!customers || customers.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p>Belum ada pelanggan.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {customers.map((cust: any) => (
                <div key={cust.id} className="border rounded-lg p-4 space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold">{cust.profiles?.full_name}</p>
                      <p className="text-sm text-muted-foreground">{cust.member_number}</p>
                    </div>
                    <div className="text-right text-sm">
                      <p className="text-muted-foreground">Poin</p>
                      <p className="font-medium">{cust.total_points}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                    <div>{cust.profiles?.phone || '-'}</div>
                    <div className="text-right">Saldo: Rp {Number(cust.wallet_balance).toLocaleString('id-ID')}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
