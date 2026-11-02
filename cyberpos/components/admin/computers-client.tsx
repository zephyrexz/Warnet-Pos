'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Computer, Monitor, Wrench, Plus, Search, Settings, MoreVertical } from "lucide-react"
import { ComputerFormDialog, ComputerStatusDialog } from '@/components/admin/computer-dialogs'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { deleteComputer } from '@/lib/actions/computers'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

type ComputerType = {
  id: string
  code: string
  name: string
  location?: string
  hourly_rate: number
  status: string
  notes?: string
  computer_sessions?: Array<{
    id: string
    started_at: string
    ended_at?: string
    profiles?: { full_name: string }
  }>
}

export default function ComputersClient({
  initialComputers,
  userRole,
}: {
  initialComputers: ComputerType[]
  userRole: string
}) {
  const router = useRouter()
  const [computers, setComputers] = useState(initialComputers)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [openForm, setOpenForm] = useState(false)
  const [openStatus, setOpenStatus] = useState(false)
  const [selectedComputer, setSelectedComputer] = useState<any>(null)
  const [mode, setMode] = useState<'create' | 'edit'>('create')

  const statusColors: Record<string, string> = {
    AVAILABLE: 'bg-green-100 text-green-800',
    IN_USE: 'bg-blue-100 text-blue-800',
    RESERVED: 'bg-yellow-100 text-yellow-800',
    MAINTENANCE: 'bg-orange-100 text-orange-800',
    DISABLED: 'bg-gray-100 text-gray-800',
  }

  const filteredComputers = computers.filter(comp => {
    const matchSearch = search === '' || 
      comp.name.toLowerCase().includes(search.toLowerCase()) ||
      comp.code.toLowerCase().includes(search.toLowerCase()) ||
      comp.location?.toLowerCase().includes(search.toLowerCase())
    
    const matchStatus = statusFilter === 'ALL' || comp.status === statusFilter
    
    return matchSearch && matchStatus
  })

  const stats = {
    total: computers.length,
    available: computers.filter(c => c.status === 'AVAILABLE').length,
    inUse: computers.filter(c => c.status === 'IN_USE').length,
    maintenance: computers.filter(c => c.status === 'MAINTENANCE').length,
  }

  const handleAdd = () => {
    setSelectedComputer(null)
    setMode('create')
    setOpenForm(true)
  }

  const handleEdit = (comp: ComputerType) => {
    setSelectedComputer(comp)
    setMode('edit')
    setOpenForm(true)
  }

  const handleChangeStatus = (comp: ComputerType) => {
    setSelectedComputer(comp)
    setOpenStatus(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Yakin ingin menonaktifkan komputer ini?')) return

    try {
      await deleteComputer(id)
      toast.success('Komputer berhasil dinonaktifkan')
      router.refresh()
    } catch (error: any) {
      toast.error(error.message || 'Terjadi kesalahan')
    }
  }

  const handleFormClose = (open: boolean) => {
    setOpenForm(open)
    if (!open) router.refresh()
  }

  const handleStatusClose = (open: boolean) => {
    setOpenStatus(open)
    if (!open) router.refresh()
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Komputer</h2>
          <p className="text-muted-foreground mt-1">Kelola semua komputer warnet</p>
        </div>
        {(userRole === 'OWNER' || userRole === 'ADMIN') && (
          <Button onClick={handleAdd}>
            <Plus className="h-4 w-4 mr-2" />
            Tambah Komputer
          </Button>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
            <Computer className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tersedia</CardTitle>
            <Monitor className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.available}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Digunakan</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.inUse}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Maintenance</CardTitle>
            <Wrench className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.maintenance}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Daftar Komputer</CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Cari komputer..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8 w-[200px]"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="border rounded-md px-3 py-2 text-sm"
              >
                <option value="ALL">Semua Status</option>
                <option value="AVAILABLE">Tersedia</option>
                <option value="IN_USE">Digunakan</option>
                <option value="MAINTENANCE">Maintenance</option>
                <option value="DISABLED">Nonaktif</option>
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredComputers.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Computer className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p>Tidak ada komputer ditemukan.</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredComputers.map((comp) => {
                const activeSession = comp.computer_sessions?.find((s) => !s.ended_at)
                return (
                  <div key={comp.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold text-lg">{comp.name}</p>
                        <p className="text-sm text-muted-foreground">Kode: {comp.code}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={statusColors[comp.status] || 'bg-gray-100'}>
                          {comp.status}
                        </Badge>
                        {(userRole === 'OWNER' || userRole === 'ADMIN') && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleEdit(comp)}>
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleChangeStatus(comp)}>
                                Ubah Status
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => handleDelete(comp.id)}
                                className="text-red-600"
                              >
                                Nonaktifkan
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    </div>
                    
                    {comp.location && (
                      <p className="text-sm text-muted-foreground">📍 {comp.location}</p>
                    )}

                    <div className="text-sm">
                      <p className="text-muted-foreground">Tarif</p>
                      <p className="font-medium">
                        Rp {Number(comp.hourly_rate).toLocaleString('id-ID')}/jam
                      </p>
                    </div>

                    {activeSession && (
                      <div className="pt-2 border-t text-sm">
                        <p className="text-muted-foreground">Sedang digunakan</p>
                        <p className="font-medium">
                          {activeSession.profiles?.full_name || 'Walk-in'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Mulai: {new Date(activeSession.started_at).toLocaleTimeString('id-ID')}
                        </p>
                      </div>
                    )}

                    {comp.notes && (
                      <p className="text-xs text-muted-foreground pt-2 border-t">
                        💬 {comp.notes}
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {(userRole === 'OWNER' || userRole === 'ADMIN') && (
        <>
          <ComputerFormDialog
            open={openForm}
            onOpenChange={handleFormClose}
            computer={selectedComputer}
            mode={mode}
          />
          {selectedComputer && (
            <ComputerStatusDialog
              open={openStatus}
              onOpenChange={handleStatusClose}
              computer={selectedComputer}
            />
          )}
        </>
      )}
    </div>
  )
}
