'use server'

import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/permissions'
import { revalidatePath } from 'next/cache'

export async function createMaintenanceTicket(data: {
  computer_id: string
  title: string
  description: string
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
}) {
  await requireRole(['OWNER', 'ADMIN', 'CASHIER', 'TECHNICIAN'])
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Generate ticket number
  const ticket_number = `TKT-${Date.now()}`

  const { data: ticket, error } = await supabase
    .from('maintenance_tickets')
    .insert({
      ticket_number,
      computer_id: data.computer_id,
      title: data.title,
      description: data.description,
      priority: data.priority,
      status: 'OPEN',
      reported_by: user!.id,
    })
    .select()
    .single()

  if (error) throw new Error(error.message)

  // Update computer status to maintenance
  await supabase
    .from('computers')
    .update({ status: 'MAINTENANCE' })
    .eq('id', data.computer_id)

  revalidatePath('/admin/maintenance')
  revalidatePath('/technician/tickets')
  return ticket
}

export async function assignTechnician(ticket_id: string, technician_id: string) {
  await requireRole(['OWNER', 'ADMIN'])
  const supabase = await createClient()

  const { error } = await supabase
    .from('maintenance_tickets')
    .update({ 
      technician_id,
      status: 'IN_PROGRESS',
      started_at: new Date().toISOString(),
    })
    .eq('id', ticket_id)

  if (error) throw new Error(error.message)

  revalidatePath('/admin/maintenance')
  revalidatePath('/technician/tickets')
}

export async function updateTicketStatus(
  ticket_id: string,
  status: string,
  resolution_notes?: string,
  cost?: number
) {
  await requireRole(['OWNER', 'ADMIN', 'TECHNICIAN'])
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Get ticket
  const { data: ticket } = await supabase
    .from('maintenance_tickets')
    .select('technician_id, computer_id')
    .eq('id', ticket_id)
    .single()

  if (!ticket) throw new Error('Tiket tidak ditemukan')

  // Check if user is assigned technician or admin/owner
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user!.id)
    .single()

  if (profile?.role === 'TECHNICIAN' && ticket.technician_id !== user!.id) {
    throw new Error('Anda tidak memiliki akses ke tiket ini')
  }

  const updateData: any = { status }
  
  if (status === 'RESOLVED' || status === 'CLOSED') {
    updateData.resolved_at = new Date().toISOString()
    if (resolution_notes) updateData.resolution_notes = resolution_notes
    if (cost) updateData.cost = cost

    // Update computer status back to available if closed
    if (status === 'CLOSED') {
      await supabase
        .from('computers')
        .update({ status: 'AVAILABLE' })
        .eq('id', ticket.computer_id)
    }
  }

  const { error } = await supabase
    .from('maintenance_tickets')
    .update(updateData)
    .eq('id', ticket_id)

  if (error) throw new Error(error.message)

  revalidatePath('/admin/maintenance')
  revalidatePath('/technician/tickets')
  revalidatePath('/admin/computers')
}

export async function getMaintenanceTickets(filters?: {
  status?: string
  priority?: string
  technician_id?: string
  computer_id?: string
}) {
  await requireRole(['OWNER', 'ADMIN', 'CASHIER', 'TECHNICIAN'])
  const supabase = await createClient()

  let query = supabase
    .from('maintenance_tickets')
    .select(`
      *,
      computers (code, name),
      profiles!maintenance_tickets_reported_by_fkey (full_name),
      technician:profiles!maintenance_tickets_technician_id_fkey (full_name)
    `)
    .order('created_at', { ascending: false })

  if (filters?.status) {
    query = query.eq('status', filters.status)
  }
  if (filters?.priority) {
    query = query.eq('priority', filters.priority)
  }
  if (filters?.technician_id) {
    query = query.eq('technician_id', filters.technician_id)
  }
  if (filters?.computer_id) {
    query = query.eq('computer_id', filters.computer_id)
  }

  const { data, error } = await query

  if (error) throw new Error(error.message)
  return data
}

export async function getMyTickets() {
  await requireRole(['TECHNICIAN'])
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data, error } = await supabase
    .from('maintenance_tickets')
    .select(`
      *,
      computers (code, name),
      profiles!maintenance_tickets_reported_by_fkey (full_name)
    `)
    .eq('technician_id', user!.id)
    .in('status', ['IN_PROGRESS', 'WAITING_PARTS'])
    .order('priority', { ascending: false })

  if (error) throw new Error(error.message)
  return data
}
