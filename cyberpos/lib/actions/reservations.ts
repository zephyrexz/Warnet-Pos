'use server'

import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/permissions'
import { revalidatePath } from 'next/cache'

export async function getReservations(filters?: {
  start_date?: string
  end_date?: string
  status?: string
  customer_id?: string
}) {
  await requireRole(['OWNER', 'ADMIN', 'CASHIER'])
  const supabase = await createClient()

  let query = supabase
    .from('reservations')
    .select(`
      *,
      customers!inner (
        member_number,
        profiles!inner (full_name, email, phone)
      ),
      computers (code, name)
    `)
    .order('start_time', { ascending: true })

  if (filters?.start_date) {
    query = query.gte('start_time', filters.start_date)
  }
  if (filters?.end_date) {
    query = query.lte('start_time', filters.end_date)
  }
  if (filters?.status) {
    query = query.eq('status', filters.status)
  }
  if (filters?.customer_id) {
    query = query.eq('customer_id', filters.customer_id)
  }

  const { data, error } = await query

  if (error) throw new Error(error.message)
  return data
}

export async function confirmReservation(id: string) {
  await requireRole(['OWNER', 'ADMIN', 'CASHIER'])
  const supabase = await createClient()

  const { error } = await supabase
    .from('reservations')
    .update({ 
      status: 'CONFIRMED',
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) throw new Error(error.message)

  revalidatePath('/admin/reservations')
}

export async function cancelReservation(id: string, reason: string) {
  await requireRole(['OWNER', 'ADMIN', 'CASHIER'])
  const supabase = await createClient()

  const { error } = await supabase
    .from('reservations')
    .update({ 
      status: 'CANCELLED',
      cancelled_reason: reason,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) throw new Error(error.message)

  revalidatePath('/admin/reservations')
}

export async function checkInReservation(id: string) {
  await requireRole(['OWNER', 'ADMIN', 'CASHIER'])
  const supabase = await createClient()

  // Get reservation details
  const { data: reservation } = await supabase
    .from('reservations')
    .select('*')
    .eq('id', id)
    .single()

  if (!reservation) throw new Error('Reservasi tidak ditemukan')
  if (reservation.status !== 'CONFIRMED') {
    throw new Error('Reservasi belum dikonfirmasi')
  }

  // Update reservation status
  const { error } = await supabase
    .from('reservations')
    .update({ 
      status: 'CHECKED_IN',
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) throw new Error(error.message)

  revalidatePath('/admin/reservations')
  revalidatePath('/cashier/reservations')
}

export async function markNoShow(id: string) {
  await requireRole(['OWNER', 'ADMIN', 'CASHIER'])
  const supabase = await createClient()

  const { error } = await supabase
    .from('reservations')
    .update({ 
      status: 'NO_SHOW',
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) throw new Error(error.message)

  revalidatePath('/admin/reservations')
}

export async function getTodayReservations() {
  const supabase = await createClient()
  
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const { data, error } = await supabase
    .from('reservations')
    .select(`
      *,
      customers!inner (
        member_number,
        profiles!inner (full_name, phone)
      ),
      computers (code, name)
    `)
    .gte('start_time', today.toISOString())
    .lt('start_time', tomorrow.toISOString())
    .in('status', ['PENDING', 'CONFIRMED', 'CHECKED_IN'])
    .order('start_time', { ascending: true })

  if (error) throw new Error(error.message)
  return data
}
