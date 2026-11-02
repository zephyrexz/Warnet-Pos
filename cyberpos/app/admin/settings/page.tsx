import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Settings as SettingsIcon } from "lucide-react"

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'OWNER' && profile?.role !== 'ADMIN') redirect('/login')

  const { data: settings } = await supabase
    .from('app_settings')
    .select('*')
    .order('key', { ascending: true })

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Pengaturan</h2>
        <p className="text-muted-foreground mt-1">Konfigurasi aplikasi</p>
      </div>

      <Card>
        <CardHeader><CardTitle>Pengaturan Aplikasi</CardTitle></CardHeader>
        <CardContent>
          {!settings || settings.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <SettingsIcon className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p>Belum ada pengaturan tersimpan.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {settings.map((setting: any) => (
                <div key={setting.key} className="border rounded-lg p-4">
                  <p className="font-semibold">{setting.key}</p>
                  <pre className="text-sm text-muted-foreground mt-2 bg-muted/30 p-2 rounded overflow-x-auto">
                    {JSON.stringify(setting.value, null, 2)}
                  </pre>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
