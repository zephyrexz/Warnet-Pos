'use server'

import { createClient } from '@/lib/supabase/server'
import { requirePermission, requireRole } from '@/lib/permissions'
import { revalidatePath } from 'next/cache'

export async function createBillingPlan(data: {
  name: string
  billing_type: 'PREPAID' | 'POSTPAID'
  duration_minutes?: number
  price: number
  description?: string
  valid_from?: string
  valid_until?: string
}) {
  await requirePermission('manage_billing_plans')
  const supabase = await createClient()

  const { data: plan, error } = await supabase
    .from('billing_plans')
    .insert({
      ...data,
      is_active: true,
    })
    .select()
    .single()

  if (error) throw new Error(error.message)

  revalidatePath('/admin/billing')
  return plan
}

export async function updateBillingPlan(id: string, data: {
  name?: string
  duration_minutes?: number
  price?: number
  description?: string
  valid_from?: string
  valid_until?: string
  is_active?: boolean
}) {
  await requirePermission('manage_billing_plans')
  const supabase = await createClient()

  const { data: plan, error } = await supabase
    .from('billing_plans')
    .update(data)
    .eq('id', id)
    .select()
    .single()

  if (error) throw new Error(error.message)

  revalidatePath('/admin/billing')
  return plan
}

export async function deleteBillingPlan(id: string) {
  await requirePermission('manage_billing_plans')
  const supabase = await createClient()

  // Soft delete to preserve history
  const { error } = await supabase
    .from('billing_plans')
    .update({ is_active: false })
    .eq('id', id)

  if (error) throw new Error(error.message)

  revalidatePath('/admin/billing')
}

export async function getBillingPlans(includeInactive = false) {
  const supabase = await createClient()
  
  let query = supabase
    .from('billing_plans')
    .select('*')
    .order('price', { ascending: true })

  if (!includeInactive) {
    query = query.eq('is_active', true)
  }

  const { data, error } = await query

  if (error) throw new Error(error.message)
  return data
}

export async function startSession(data: {
  computer_id: string
  customer_id?: string
  billing_plan_id?: string
  hourly_rate: number
  discount_percent?: number
  planned_duration_minutes?: number
}) {
  await requireRole(['OWNER', 'ADMIN', 'CASHIER'])
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Check computer availability
  const { data: computer } = await supabase
    .from('computers')
    .select('status')
    .eq('id', data.computer_id)
    .single()

  if (computer?.status !== 'AVAILABLE') {
    throw new Error('Komputer tidak tersedia')
  }

  // Create session
  const planned_end_at = data.planned_duration_minutes
    ? new Date(Date.now() + data.planned_duration_minutes * 60000).toISOString()
    : null

  const { data: session, error } = await supabase
    .from('computer_sessions')
    .insert({
      computer_id: data.computer_id,
      customer_id: data.customer_id,
      billing_plan_id: data.billing_plan_id,
      started_by: user!.id,
      hourly_rate: data.hourly_rate,
      discount_percent: data.discount_percent || 0,
      planned_end_at,
    })
    .select()
    .single()

  if (error) throw new Error(error.message)

  // Update computer status
  await supabase
    .from('computers')
    .update({ status: 'IN_USE' })
    .eq('id', data.computer_id)

  revalidatePath('/admin/computers')
  revalidatePath('/cashier/computers')
  revalidatePath('/cashier/billing')
  return session
}

export async function endSession(session_id: string) {
  await requireRole(['OWNER', 'ADMIN', 'CASHIER'])
  const supabase = await createClient()

  const { data: session } = await supabase
    .from('computer_sessions')
    .select('computer_id')
    .eq('id', session_id)
    .single()

  if (!session) throw new Error('Sesi tidak ditemukan')

  // End session
  const { error } = await supabase
    .from('computer_sessions')
    .update({ ended_at: new Date().toISOString() })
    .eq('id', session_id)

  if (error) throw new Error(error.message)

  // Update computer status
  await supabase
    .from('computers')
    .update({ status: 'AVAILABLE' })
    .eq('id', session.computer_id)

  revalidatePath('/admin/computers')
  revalidatePath('/cashier/computers')
  revalidatePath('/cashier/billing')
}

export async function extendSession(
  session_id: string,
  additional_minutes: number
) {
  await requireRole(['OWNER', 'ADMIN', 'CASHIER'])
  const supabase = await createClient()

  const { data: session } = await supabase
    .from('computer_sessions')
    .select('planned_end_at')
    .eq('id', session_id)
    .single()

  if (!session) throw new Error('Sesi tidak ditemukan')

  const currentEnd = session.planned_end_at 
    ? new Date(session.planned_end_at)
    : new Date()

  const newEnd = new Date(currentEnd.getTime() + additional_minutes * 60000)

  const { error } = await supabase
    .from('computer_sessions')
    .update({ planned_end_at: newEnd.toISOString() })
    .eq('id', session_id)

  if (error) throw new Error(error.message)

  revalidatePath('/cashier/billing')
}

export async function calculateBillingAmount(session_id: string) {
  const supabase = await createClient()

  const { data: session } = await supabase
    .from('computer_sessions')
    .select('*')
    .eq('id', session_id)
    .single()

  if (!session) throw new Error('Sesi tidak ditemukan')

  const startTime = new Date(session.started_at)
  const endTime = session.ended_at ? new Date(session.ended_at) : new Date()
  
  const durationMs = endTime.getTime() - startTime.getTime()
  const durationHours = durationMs / (1000 * 60 * 60)
  
  const subtotal = durationHours * Number(session.hourly_rate)
  const discount = subtotal * (Number(session.discount_percent) / 100)
  const total = subtotal - discount

  return {
    duration_minutes: Math.ceil(durationMs / (1000 * 60)),
    duration_hours: durationHours,
    hourly_rate: Number(session.hourly_rate),
    subtotal,
    discount_percent: Number(session.discount_percent),
    discount,
    total: Math.ceil(total), // Round up to nearest rupiah
  }
}

export async function getActiveSessions() {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('computer_sessions')
    .select(`
      *,
      computers (code, name),
      profiles!computer_sessions_customer_id_fkey (full_name)
    `)
    .is('ended_at', null)
    .order('started_at', { ascending: false })

  if (error) throw new Error(error.message)
  return data
}
