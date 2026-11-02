import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DollarSign } from "lucide-react"

export default async function ExpensesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'OWNER' && profile?.role !== 'ADMIN') redirect('/login')

  const { data: expenses } = await supabase
    .from('expenses')
    .select(`*, profiles!expenses_created_by_fkey (full_name)`)
    .order('date', { ascending: false })
    .limit(100)

  const total = expenses?.reduce((sum, e) => sum + Number(e.amount), 0) || 0

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Pengeluaran</h2>
        <p className="text-muted-foreground mt-1">Kelola pengeluaran operasional</p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Pengeluaran</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">Rp {total.toLocaleString('id-ID')}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Daftar Pengeluaran</CardTitle></CardHeader>
        <CardContent>
          {!expenses || expenses.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p>Belum ada pengeluaran tercatat.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {expenses.map((exp: any) => (
                <div key={exp.id} className="border rounded-lg p-4 space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold">{exp.category}</p>
                      <p className="text-sm text-muted-foreground">{exp.description}</p>
                    </div>
                    <p className="text-lg font-bold">Rp {Number(exp.amount).toLocaleString('id-ID')}</p>
                  </div>
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>{new Date(exp.date).toLocaleDateString('id-ID')}</span>
                    <span>Dicatat oleh: {exp.profiles?.full_name}</span>
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
