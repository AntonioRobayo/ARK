'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'

// ── Countries ─────────────────────────────────────────────────────────────────

export async function toggleCountry(code: string, isActive: boolean) {
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('countries')
    .update({ is_active: !isActive })
    .eq('code', code)
  if (error) redirect(`/superadmin/catalogs?tab=countries&error=${encodeURIComponent(error.message)}`)
  redirect('/superadmin/catalogs?tab=countries')
}

export async function addCountry(formData: FormData) {
  const supabase = createAdminClient()
  const code = (formData.get('code') as string).toUpperCase().trim()
  const { error } = await supabase.from('countries').insert({
    code,
    name:      formData.get('name') as string,
    currency:  (formData.get('currency') as string).toUpperCase().trim(),
    timezone:  formData.get('timezone') as string,
    sort_order: 99,
    is_active:  true,
  })
  if (error) redirect(`/superadmin/catalogs?tab=countries&add=1&error=${encodeURIComponent(error.message)}`)
  redirect('/superadmin/catalogs?tab=countries')
}

// ── Currencies ────────────────────────────────────────────────────────────────

export async function toggleCurrency(code: string, isActive: boolean) {
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('currencies')
    .update({ is_active: !isActive })
    .eq('code', code)
  if (error) redirect(`/superadmin/catalogs?tab=currencies&error=${encodeURIComponent(error.message)}`)
  redirect('/superadmin/catalogs?tab=currencies')
}

export async function addCurrency(formData: FormData) {
  const supabase = createAdminClient()
  const code = (formData.get('code') as string).toUpperCase().trim()
  const { error } = await supabase.from('currencies').insert({
    code,
    name:      formData.get('name') as string,
    is_active: true,
    sort_order: 99,
  })
  if (error) redirect(`/superadmin/catalogs?tab=currencies&add=1&error=${encodeURIComponent(error.message)}`)
  redirect('/superadmin/catalogs?tab=currencies')
}
