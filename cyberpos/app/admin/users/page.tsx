import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { UserCog } from "lucide-react"

export default async function UsersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'OWNER' && profile?.role !== 'ADMIN') redirect('/login')

  const { data: users } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false })

  const roleColors: Record<string, string> = {
    OWNER: 'bg-purple-100 text-purple-800',
    ADMIN: 'bg-blue-100 text-blue-800',
    CASHIER: 'bg-green-100 text-green-800',
    TECHNICIAN: 'bg-yellow-100 text-yellow-800',
    CUSTOMER: 'bg-gray-100 text-gray-800',
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Pengguna</h2>
        <p className="text-muted-foreground mt-1">Kelola akun pengguna sistem</p>
      </div>

      <Card>
        <CardHeader><CardTitle>Daftar Pengguna</CardTitle></CardHeader>
        <CardContent>
          {!users || users.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <UserCog className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p>Belum ada pengguna.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {users.map((usr: any) => (
                <div key={usr.id} className="border rounded-lg p-4 space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold">{usr.full_name}</p>
                      <p className="text-sm text-muted-foreground">{usr.email}</p>
                    </div>
                    <Badge className={roleColors[usr.role]}>{usr.role}</Badge>
                  </div>
                  <div className="flex justify-between text-sm text-muted-foreground">
                    {usr.username && <span>@{usr.username}</span>}
                    <span>Bergabung: {new Date(usr.created_at).toLocaleDateString('id-ID')}</span>
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
