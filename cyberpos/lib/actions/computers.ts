'use server'

import { createClient } from '@/lib/supabase/server'
import { requirePermission, requireRole } from '@/lib/permissions'
import { revalidatePath } from 'next/cache'

export async function createComputer(data: {
  code: string
  name: string
  location?: string
  specs?: any
  hourly_rate: number
  notes?: string
}) {
  await requirePermission('manage_computers')
  const supabase = await createClient()

  const { data: computer, error } = await supabase
    .from('computers')
    .insert({
      code: data.code,
      name: data.name,
      location: data.location,
      specs: data.specs,
      hourly_rate: data.hourly_rate,
      notes: data.notes,
      status: 'AVAILABLE',
      is_active: true,
    })
    .select()
    .single()

  if (error) throw new Error(error.message)

  revalidatePath('/admin/computers')
  revalidatePath('/cashier/computers')
  return computer
}

export async function updateComputer(id: string, data: {
  name?: string
  location?: string
  specs?: any
  hourly_rate?: number
  notes?: string
  status?: string
}) {
  await requirePermission('manage_computers')
  const supabase = await createClient()

  const { data: computer, error } = await supabase
    .from('computers')
    .update({
      ...data,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()

  if (error) throw new Error(error.message)

  revalidatePath('/admin/computers')
  revalidatePath('/cashier/computers')
  return computer
}

export async function deleteComputer(id: string) {
  await requirePermission('manage_computers')
  const supabase = await createClient()

  // Check for active sessions
  const { data: sessions } = await supabase
    .from('computer_sessions')
    .select('id')
    .eq('computer_id', id)
    .is('ended_at', null)

  if (sessions && sessions.length > 0) {
    throw new Error('Tidak dapat menghapus komputer dengan sesi aktif')
  }

  // Soft delete
  const { error } = await supabase
    .from('computers')
    .update({ is_active: false })
    .eq('id', id)

  if (error) throw new Error(error.message)

  revalidatePath('/admin/computers')
  revalidatePath('/cashier/computers')
}

export async function updateComputerStatus(id: string, status: string) {
  await requireRole(['OWNER', 'ADMIN', 'TECHNICIAN'])
  const supabase = await createClient()

  const { error } = await supabase
    .from('computers')
    .update({ status })
    .eq('id', id)

  if (error) throw new Error(error.message)

  revalidatePath('/admin/computers')
  revalidatePath('/cashier/computers')
}

export async function getComputers() {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('computers')
    .select(`
      *,
      computer_sessions!computer_sessions_computer_id_fkey (
        id,
        started_at,
        ended_at,
        customer_id,
        profiles!computer_sessions_customer_id_fkey (full_name)
      )
    `)
    .eq('is_active', true)
    .order('code', { ascending: true })

  if (error) throw new Error(error.message)
  return data
}

export async function getComputerById(id: string) {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('computers')
    .select(`
      *,
      computer_sessions!computer_sessions_computer_id_fkey (
        id,
        started_at,
        ended_at,
        customer_id,
        billing_plan_id,
        hourly_rate,
        discount_percent,
        profiles!computer_sessions_customer_id_fkey (full_name, email)
      )
    `)
    .eq('id', id)
    .single()

  if (error) throw new Error(error.message)
  return data
}
