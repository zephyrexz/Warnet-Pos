'use server'

import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/permissions'
import { revalidatePath } from 'next/cache'

export async function openShift(opening_balance: number) {
  await requireRole(['OWNER', 'ADMIN', 'CASHIER'])
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Check if cashier already has an open shift
  const { data: existingShift } = await supabase
    .from('cashier_shifts')
    .select('id')
    .eq('cashier_id', user!.id)
    .is('closed_at', null)
    .single()

  if (existingShift) {
    throw new Error('Anda masih memiliki shift yang terbuka')
  }

  const { data: shift, error } = await supabase
    .from('cashier_shifts')
    .insert({
      cashier_id: user!.id,
      opening_balance,
    })
    .select()
    .single()

  if (error) throw new Error(error.message)

  revalidatePath('/cashier/shifts')
  return shift
}

export async function closeShift(
  shift_id: string,
  actual_balance: number,
  notes?: string
) {
  await requireRole(['OWNER', 'ADMIN', 'CASHIER'])
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Get shift info
  const { data: shift } = await supabase
    .from('cashier_shifts')
    .select('*')
    .eq('id', shift_id)
    .eq('cashier_id', user!.id)
    .single()

  if (!shift) throw new Error('Shift tidak ditemukan')
  if (shift.closed_at) throw new Error('Shift sudah ditutup')

  // Calculate expected balance
  const { data: sales } = await supabase
    .from('sales')
    .select('total, payment_method')
    .eq('cashier_id', user!.id)
    .gte('created_at', shift.opened_at)
    .eq('payment_method', 'CASH')

  const total_cash = sales?.reduce((sum, sale) => sum + Number(sale.total), 0) || 0
  const expected_balance = Number(shift.opening_balance) + total_cash
  const difference = actual_balance - expected_balance

  // Close shift
  const { error } = await supabase
    .from('cashier_shifts')
    .update({
      closed_at: new Date().toISOString(),
      expected_balance,
      actual_balance,
      difference,
      notes,
    })
    .eq('id', shift_id)

  if (error) throw new Error(error.message)

  revalidatePath('/cashier/shifts')
}

export async function getCurrentShift() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  const { data: shift } = await supabase
    .from('cashier_shifts')
    .select('*')
    .eq('cashier_id', user.id)
    .is('closed_at', null)
    .single()

  return shift
}

export async function getShiftSummary(shift_id: string) {
  const supabase = await createClient()
  
  const { data: shift } = await supabase
    .from('cashier_shifts')
    .select('*')
    .eq('id', shift_id)
    .single()

  if (!shift) throw new Error('Shift tidak ditemukan')

  // Get sales during shift
  const { data: sales } = await supabase
    .from('sales')
    .select('*')
    .eq('cashier_id', shift.cashier_id)
    .gte('created_at', shift.opened_at)
    .lte('created_at', shift.closed_at || new Date().toISOString())

  const total_transactions = sales?.length || 0
  const cash_sales = sales?.filter(s => s.payment_method === 'CASH') || []
  const non_cash_sales = sales?.filter(s => s.payment_method !== 'CASH') || []

  const total_cash = cash_sales.reduce((sum, s) => sum + Number(s.total), 0)
  const total_non_cash = non_cash_sales.reduce((sum, s) => sum + Number(s.total), 0)
  const total_revenue = total_cash + total_non_cash

  return {
    shift,
    summary: {
      total_transactions,
      cash_transactions: cash_sales.length,
      non_cash_transactions: non_cash_sales.length,
      total_cash,
      total_non_cash,
      total_revenue,
    },
    sales,
  }
}

export async function getAllShifts(filters?: {
  start_date?: string
  end_date?: string
  cashier_id?: string
}) {
  await requireRole(['OWNER', 'ADMIN'])
  const supabase = await createClient()

  let query = supabase
    .from('cashier_shifts')
    .select(`
      *,
      profiles (full_name, email)
    `)
    .order('opened_at', { ascending: false })

  if (filters?.start_date) {
    query = query.gte('opened_at', filters.start_date)
  }
  if (filters?.end_date) {
    query = query.lte('opened_at', filters.end_date)
  }
  if (filters?.cashier_id) {
    query = query.eq('cashier_id', filters.cashier_id)
  }

  const { data, error } = await query

  if (error) throw new Error(error.message)
  return data
}
