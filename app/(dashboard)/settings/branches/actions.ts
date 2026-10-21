'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

async function getAuthorizedProfile() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('user_profile')
    .select('tenant_id, role')
    .eq('id', user.id)
    .single()

  if (!profile?.tenant_id) redirect('/settings')

  if (profile.role !== 'owner' && profile.role !== 'shop_manager') {
    redirect('/settings/branches?error=' + encodeURIComponent('noPermission'))
  }

  return { tenantId: profile.tenant_id, role: profile.role }
}

export async function createBranch(formData: FormData) {
  const { tenantId } = await getAuthorizedProfile()

  const name    = (formData.get('name') as string)?.trim()
  const address = (formData.get('address') as string)?.trim() || null
  const city    = (formData.get('city') as string)?.trim() || null
  const phone   = (formData.get('phone') as string)?.trim() || null
  const email   = (formData.get('email') as string)?.trim() || null

  if (!name) {
    redirect('/settings/branches?error=' + encodeURIComponent('El nombre es requerido'))
  }

  const admin = createAdminClient()

  // Check license limit
  const [{ data: tenant }, { count }] = await Promise.all([
    admin.from('tenants').select('contracted_branches').eq('id', tenantId).single(),
    admin.from('branch').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId).is('deleted_at', null),
  ])

  const limit = tenant?.contracted_branches ?? 1
  const current = count ?? 0

  if (current >= limit) {
    redirect('/settings/branches?error=' + encodeURIComponent(`limitReached:${current}:${limit}`))
  }

  const isMain = current === 0

  const { error } = await admin
    .from('branch')
    .insert({ tenant_id: tenantId, name, address, city, phone, email, is_main: isMain, is_active: true })

  if (error) {
    redirect('/settings/branches?error=' + encodeURIComponent(error.message))
  }

  revalidatePath('/settings/branches')
  redirect('/settings/branches?success=created')
}

export async function updateBranch(formData: FormData) {
  const { tenantId } = await getAuthorizedProfile()

  const branchId = formData.get('branch_id') as string
  const name     = (formData.get('name') as string)?.trim()
  const address  = (formData.get('address') as string)?.trim() || null
  const city     = (formData.get('city') as string)?.trim() || null
  const phone    = (formData.get('phone') as string)?.trim() || null
  const email    = (formData.get('email') as string)?.trim() || null

  if (!name || !branchId) {
    redirect('/settings/branches?error=' + encodeURIComponent('Datos incompletos'))
  }

  const admin = createAdminClient()

  const { data: branch } = await admin
    .from('branch')
    .select('tenant_id')
    .eq('id', branchId)
    .single()

  if (!branch || branch.tenant_id !== tenantId) {
    redirect('/settings/branches?error=' + encodeURIComponent('Sucursal no encontrada'))
  }

  const { error } = await admin
    .from('branch')
    .update({ name, address, city, phone, email, updated_at: new Date().toISOString() })
    .eq('id', branchId)

  if (error) {
    redirect('/settings/branches?error=' + encodeURIComponent(error.message))
  }

  revalidatePath('/settings/branches')
  redirect('/settings/branches?success=updated')
}

export async function setMainBranch(formData: FormData) {
  const { tenantId } = await getAuthorizedProfile()

  const branchId = formData.get('branch_id') as string
  if (!branchId) redirect('/settings/branches')

  const admin = createAdminClient()

  const { data: branch } = await admin
    .from('branch')
    .select('tenant_id, is_active')
    .eq('id', branchId)
    .single()

  if (!branch || branch.tenant_id !== tenantId || !branch.is_active) {
    redirect('/settings/branches?error=' + encodeURIComponent('Sucursal no válida'))
  }

  // Clear existing main, set new one
  await admin
    .from('branch')
    .update({ is_main: false })
    .eq('tenant_id', tenantId)

  const { error } = await admin
    .from('branch')
    .update({ is_main: true })
    .eq('id', branchId)

  if (error) {
    redirect('/settings/branches?error=' + encodeURIComponent(error.message))
  }

  revalidatePath('/settings/branches')
  redirect('/settings/branches?success=main')
}

export async function toggleBranchActive(formData: FormData) {
  const { tenantId } = await getAuthorizedProfile()

  const branchId  = formData.get('branch_id') as string
  const newActive = formData.get('is_active') === 'true'

  if (!branchId) redirect('/settings/branches')

  const admin = createAdminClient()

  const { data: branch } = await admin
    .from('branch')
    .select('tenant_id, is_main')
    .eq('id', branchId)
    .single()

  if (!branch || branch.tenant_id !== tenantId) {
    redirect('/settings/branches?error=' + encodeURIComponent('Sucursal no encontrada'))
  }

  if (branch.is_main && !newActive) {
    redirect('/settings/branches?error=' + encodeURIComponent('cannotDeactivateMain'))
  }

  const { error } = await admin
    .from('branch')
    .update({ is_active: newActive, updated_at: new Date().toISOString() })
    .eq('id', branchId)

  if (error) {
    redirect('/settings/branches?error=' + encodeURIComponent(error.message))
  }

  revalidatePath('/settings/branches')
  redirect('/settings/branches?success=toggle')
}
