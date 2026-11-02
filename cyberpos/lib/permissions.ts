// lib/permissions.ts - Permission checking utilities
import { createClient } from '@/lib/supabase/server'

export type UserRole = 'OWNER' | 'ADMIN' | 'CASHIER' | 'TECHNICIAN' | 'CUSTOMER'

export type Permission = 
  | 'manage_computers'
  | 'manage_products'
  | 'manage_categories'
  | 'manage_billing_plans'
  | 'manage_suppliers'
  | 'manage_inventory'
  | 'manage_users'
  | 'manage_settings'
  | 'view_reports'
  | 'approve_refunds'
  | 'adjust_wallet'
  | 'manage_membership'
  | 'manage_vouchers'
  | 'change_prices'
  | 'view_audit_logs'

const rolePermissions: Record<UserRole, Permission[]> = {
  OWNER: [
    'manage_computers',
    'manage_products',
    'manage_categories',
    'manage_billing_plans',
    'manage_suppliers',
    'manage_inventory',
    'manage_users',
    'manage_settings',
    'view_reports',
    'approve_refunds',
    'adjust_wallet',
    'manage_membership',
    'manage_vouchers',
    'change_prices',
    'view_audit_logs',
  ],
  ADMIN: [
    'manage_computers',
    'manage_products',
    'manage_categories',
    'manage_billing_plans',
    'manage_suppliers',
    'manage_inventory',
    'view_reports',
    // Note: ADMIN can have additional permissions granted individually
  ],
  CASHIER: [], // Cashier has no management permissions, only transaction operations
  TECHNICIAN: [], // Technician only handles maintenance
  CUSTOMER: [], // Customer only accesses own portal
}

export async function getCurrentUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role, email, full_name')
    .eq('id', user.id)
    .single()

  return profile
}

export async function hasPermission(permission: Permission): Promise<boolean> {
  const user = await getCurrentUser()
  if (!user) return false

  const userRole = user.role as UserRole
  return rolePermissions[userRole]?.includes(permission) || false
}

export async function requirePermission(permission: Permission) {
  const allowed = await hasPermission(permission)
  if (!allowed) {
    throw new Error('Insufficient permissions')
  }
}

export async function requireRole(allowedRoles: UserRole[]) {
  const user = await getCurrentUser()
  if (!user) {
    throw new Error('Authentication required')
  }

  if (!allowedRoles.includes(user.role as UserRole)) {
    throw new Error('Access denied')
  }

  return user
}

export function canManageData(role: UserRole): boolean {
  return role === 'OWNER' || role === 'ADMIN'
}

export function canProcessTransactions(role: UserRole): boolean {
  return role === 'OWNER' || role === 'ADMIN' || role === 'CASHIER'
}

export function canViewReports(role: UserRole): boolean {
  return role === 'OWNER' || role === 'ADMIN'
}
