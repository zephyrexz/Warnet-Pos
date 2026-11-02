'use server'

import { createClient } from '@/lib/supabase/server'
import { requirePermission } from '@/lib/permissions'
import { revalidatePath } from 'next/cache'

export async function createUser(data: {
  email: string
  password: string
  full_name: string
  role: 'OWNER' | 'ADMIN' | 'CASHIER' | 'TECHNICIAN'
  phone?: string
}) {
  await requirePermission('manage_users')
  const supabase = await createClient()
  const { data: { user: currentUser } } = await supabase.auth.getUser()

  // Get current user role
  const { data: currentProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', currentUser!.id)
    .single()

  // Only OWNER can create OWNER or ADMIN
  if (data.role === 'OWNER' && currentProfile?.role !== 'OWNER') {
    throw new Error('Hanya OWNER yang dapat membuat akun OWNER')
  }

  if (data.role === 'ADMIN' && currentProfile?.role !== 'OWNER') {
    throw new Error('Hanya OWNER yang dapat membuat akun ADMIN')
  }

  // Create auth user using admin API
  const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
    email: data.email,
    password: data.password,
    email_confirm: true,
    user_metadata: {
      full_name: data.full_name,
    }
  })

  if (authError) throw new Error(authError.message)

  // Update profile with role
  const { error: profileError } = await supabase
    .from('profiles')
    .update({
      role: data.role,
      phone: data.phone,
    })
    .eq('id', authUser.user.id)

  if (profileError) throw new Error(profileError.message)

  revalidatePath('/admin/users')
  return authUser.user
}

export async function updateUserRole(user_id: string, role: string) {
  await requirePermission('manage_users')
  const supabase = await createClient()
  const { data: { user: currentUser } } = await supabase.auth.getUser()

  // Get current user role
  const { data: currentProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', currentUser!.id)
    .single()

  // Only OWNER can change roles
  if (currentProfile?.role !== 'OWNER') {
    throw new Error('Hanya OWNER yang dapat mengubah role')
  }

  // Cannot change own role
  if (user_id === currentUser!.id) {
    throw new Error('Tidak dapat mengubah role sendiri')
  }

  const { error } = await supabase
    .from('profiles')
    .update({ role })
    .eq('id', user_id)

  if (error) throw new Error(error.message)

  revalidatePath('/admin/users')
}

export async function deactivateUser(user_id: string) {
  await requirePermission('manage_users')
  const supabase = await createClient()
  const { data: { user: currentUser } } = await supabase.auth.getUser()

  if (user_id === currentUser!.id) {
    throw new Error('Tidak dapat menonaktifkan akun sendiri')
  }

  const { error } = await supabase
    .from('profiles')
    .update({ is_active: false })
    .eq('id', user_id)

  if (error) throw new Error(error.message)

  revalidatePath('/admin/users')
}

export async function activateUser(user_id: string) {
  await requirePermission('manage_users')
  const supabase = await createClient()

  const { error } = await supabase
    .from('profiles')
    .update({ is_active: true })
    .eq('id', user_id)

  if (error) throw new Error(error.message)

  revalidatePath('/admin/users')
}

export async function getUsers(filters?: {
  role?: string
  is_active?: boolean
}) {
  await requirePermission('manage_users')
  const supabase = await createClient()

  let query = supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false })

  if (filters?.role) {
    query = query.eq('role', filters.role)
  }
  if (filters?.is_active !== undefined) {
    query = query.eq('is_active', filters.is_active)
  }

  const { data, error } = await query

  if (error) throw new Error(error.message)
  return data
}

export async function getStaffUsers() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .in('role', ['OWNER', 'ADMIN', 'CASHIER', 'TECHNICIAN'])
    .eq('is_active', true)
    .order('full_name', { ascending: true })

  if (error) throw new Error(error.message)
  return data
}
