'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { checkPermission } from '@/lib/permissions'

async function getAdminAndTenant() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')
  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('user_profile').select('tenant_id').eq('id', user.id).single()
  if (!profile?.tenant_id) redirect('/settings')
  return { admin, tenantId: profile.tenant_id }
}

export async function createSupplier(formData: FormData) {
  const ok = await checkPermission('inventory.manage_suppliers')
  if (!ok) redirect('/settings?error=sin_permiso')
  const { admin, tenantId } = await getAdminAndTenant()

  await admin.from('supplier').insert({
    tenant_id: tenantId,
    name: (formData.get('name') as string).trim(),
    tax_id: (formData.get('tax_id') as string)?.trim() || null,
    phone: (formData.get('phone') as string)?.trim() || null,
    email: (formData.get('email') as string)?.trim() || null,
    address: (formData.get('address') as string)?.trim() || null,
    contact_name: (formData.get('contact_name') as string)?.trim() || null,
    category: (formData.get('category') as string)?.trim() || null,
    is_active: true,
  })

  revalidatePath('/settings/suppliers')
}

export async function updateSupplier(formData: FormData) {
  const ok = await checkPermission('inventory.manage_suppliers')
  if (!ok) redirect('/settings?error=sin_permiso')
  const { admin, tenantId } = await getAdminAndTenant()
  const id = formData.get('id') as string

  await admin.from('supplier').update({
    name: (formData.get('name') as string).trim(),
    tax_id: (formData.get('tax_id') as string)?.trim() || null,
    phone: (formData.get('phone') as string)?.trim() || null,
    email: (formData.get('email') as string)?.trim() || null,
    address: (formData.get('address') as string)?.trim() || null,
    contact_name: (formData.get('contact_name') as string)?.trim() || null,
    category: (formData.get('category') as string)?.trim() || null,
    updated_at: new Date().toISOString(),
  }).eq('id', id).eq('tenant_id', tenantId)

  revalidatePath('/settings/suppliers')
}

export async function toggleSupplier(formData: FormData) {
  const ok = await checkPermission('inventory.manage_suppliers')
  if (!ok) return
  const { admin, tenantId } = await getAdminAndTenant()
  const id = formData.get('id') as string
  const current = formData.get('is_active') === 'true'

  await admin.from('supplier').update({ is_active: !current }).eq('id', id).eq('tenant_id', tenantId)
  revalidatePath('/settings/suppliers')
}
