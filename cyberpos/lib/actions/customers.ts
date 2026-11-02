'use server'

import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/permissions'
import { revalidatePath } from 'next/cache'

export async function getCustomers(filters?: {
  search?: string
  membership_tier_id?: string
}) {
  await requireRole(['OWNER', 'ADMIN', 'CASHIER'])
  const supabase = await createClient()

  let query = supabase
    .from('customers')
    .select(`
      *,
      profiles!inner (full_name, email, phone, is_active),
      membership_tiers (name)
    `)
    .order('created_at', { ascending: false })

  if (filters?.search) {
    query = query.or(`profiles.full_name.ilike.%${filters.search}%,profiles.email.ilike.%${filters.search}%,member_number.ilike.%${filters.search}%`)
  }

  if (filters?.membership_tier_id) {
    query = query.eq('membership_tier_id', filters.membership_tier_id)
  }

  const { data, error } = await query

  if (error) throw new Error(error.message)
  return data
}

export async function getCustomerById(id: string) {
  await requireRole(['OWNER', 'ADMIN', 'CASHIER'])
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('customers')
    .select(`
      *,
      profiles!inner (full_name, email, phone, is_active, created_at),
      membership_tiers (name, discount_percent)
    `)
    .eq('id', id)
    .single()

  if (error) throw new Error(error.message)
  return data
}

export async function getCustomerTransactions(customer_id: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('sales')
    .select(`
      *,
      profiles!sales_cashier_id_fkey (full_name)
    `)
    .eq('customer_id', customer_id)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) throw new Error(error.message)
  return data
}

export async function getCustomerSessions(customer_id: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('computer_sessions')
    .select(`
      *,
      computers (code, name)
    `)
    .eq('customer_id', customer_id)
    .order('started_at', { ascending: false })
    .limit(50)

  if (error) throw new Error(error.message)
  return data
}

export async function searchCustomers(search: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('customers')
    .select(`
      *,
      profiles!inner (full_name, email, phone)
    `)
    .or(`profiles.full_name.ilike.%${search}%,profiles.email.ilike.%${search}%,member_number.ilike.%${search}%`)
    .limit(10)

  if (error) throw new Error(error.message)
  return data
}
