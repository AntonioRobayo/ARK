'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export type PermissionCode =
  // users
  | 'users.invite'
  | 'users.deactivate'
  | 'users.manage_roles'
  // ot
  | 'ot.view'
  | 'ot.create'
  | 'ot.edit'
  | 'ot.cancel'
  | 'ot.change_status'
  | 'ot.approve_discount'
  // inventory
  | 'inventory.view'
  | 'inventory.view_costs'
  | 'inventory.receive'
  | 'inventory.approve_purchases'
  | 'inventory.adjust'
  | 'inventory.transfer'
  | 'inventory.manage_suppliers'
  | 'inventory.release_reservations'
  // billing
  | 'billing.view'
  | 'billing.create_invoice'
  | 'billing.receive_payment'
  | 'billing.close_register'
  | 'billing.approve_register_close'
  | 'billing.approve_credit'
  | 'billing.approve_delivery_with_balance'
  // customers
  | 'customers.view'
  | 'customers.create'
  | 'customers.edit'
  | 'customers.manage_credit'
  // reports
  | 'reports.view'
  | 'reports.export'
  // config
  | 'config.manage'

/**
 * Check if the current authenticated user has a given permission.
 * Uses the DB function user_has_permission() which resolves:
 *   1. user_permission overrides (granted / revoked individually)
 *   2. role_permission (via user_profile.role_id)
 *
 * Falls back to legacy text role check if role_id is not yet set.
 */
export async function checkPermission(code: PermissionCode): Promise<boolean> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  const adminClient = createAdminClient()

  // Fast path: use DB function when role_id is set
  const { data, error } = await adminClient
    .rpc('user_has_permission', { p_user_id: user.id, p_code: code })

  if (!error && data !== null) return data as boolean

  // Fallback: legacy text role (while migration is being applied)
  const { data: profile } = await adminClient
    .from('user_profile')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile?.role) return false

  return legacyRoleHasPermission(profile.role, code)
}

/**
 * Check permission for a specific user id (server-side, no auth context needed).
 */
export async function userHasPermission(userId: string, code: PermissionCode): Promise<boolean> {
  const adminClient = createAdminClient()

  const { data, error } = await adminClient
    .rpc('user_has_permission', { p_user_id: userId, p_code: code })

  if (!error && data !== null) return data as boolean

  // Fallback
  const { data: profile } = await adminClient
    .from('user_profile')
    .select('role')
    .eq('id', userId)
    .single()

  if (!profile?.role) return false
  return legacyRoleHasPermission(profile.role, code)
}

/** Legacy fallback while role_id backfill is pending */
function legacyRoleHasPermission(role: string, code: PermissionCode): boolean {
  const all: PermissionCode[] = [
    'users.invite','users.deactivate','users.manage_roles',
    'ot.view','ot.create','ot.edit','ot.cancel','ot.change_status','ot.approve_discount',
    'inventory.view','inventory.view_costs','inventory.receive','inventory.approve_purchases',
    'inventory.adjust','inventory.transfer','inventory.manage_suppliers','inventory.release_reservations',
    'billing.view','billing.create_invoice','billing.receive_payment','billing.close_register',
    'billing.approve_register_close','billing.approve_credit','billing.approve_delivery_with_balance',
    'customers.view','customers.create','customers.edit','customers.manage_credit',
    'reports.view','reports.export','config.manage',
  ]
  const perRole: Record<string, PermissionCode[]> = {
    owner:        all,
    admin:        all,
    shop_manager: all.filter(c => c !== 'users.manage_roles' && c !== 'config.manage'),
    mechanic:     ['ot.view','ot.create','ot.edit','ot.change_status','inventory.view','customers.view'],
    receptionist: ['ot.view','ot.create','ot.edit','ot.change_status','customers.view','customers.create','customers.edit','billing.view','billing.receive_payment'],
    parts_manager:['inventory.view','inventory.view_costs','inventory.receive','inventory.approve_purchases','inventory.adjust','inventory.transfer','inventory.manage_suppliers','inventory.release_reservations','ot.view','ot.change_status','customers.view'],
    accountant:   ['billing.view','billing.create_invoice','billing.receive_payment','billing.close_register','billing.approve_register_close','billing.approve_credit','billing.approve_delivery_with_balance','customers.view','customers.create','customers.edit','customers.manage_credit','reports.view','reports.export'],
  }
  return (perRole[role] ?? []).includes(code)
}
