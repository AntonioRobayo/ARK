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

export async function updateCurrencyRate(code: string, formData: FormData) {
  const supabase = createAdminClient()
  const rate = formData.get('usd_rate')
  const usd_rate = rate ? Number(rate) : null
  const { error } = await supabase
    .from('currencies')
    .update({ usd_rate })
    .eq('code', code)
  if (error) redirect(`/superadmin/catalogs?tab=currencies&error=${encodeURIComponent(error.message)}`)
  redirect('/superadmin/catalogs?tab=currencies')
}

export async function toggleCurrency(code: string, isActive: boolean) {
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('currencies')
    .update({ is_active: !isActive })
    .eq('code', code)
  if (error) redirect(`/superadmin/catalogs?tab=currencies&error=${encodeURIComponent(error.message)}`)
  redirect('/superadmin/catalogs?tab=currencies')
}

// ── App Catalogs ──────────────────────────────────────────────────────────────

export async function addCatalogEntry(formData: FormData) {
  const supabase = createAdminClient()
  const cat = formData.get('category') as string
  const { error } = await supabase.from('global_catalog').insert({
    category: cat,
    value: (formData.get('value') as string).trim(),
    label_es: (formData.get('label_es') as string).trim(),
    label_en: (formData.get('label_en') as string)?.trim() || null,
    label_pt: (formData.get('label_pt') as string)?.trim() || null,
    sort_order: Number(formData.get('sort_order') ?? 99),
    is_active: true,
    is_system: false,
  })
  if (error) redirect(`/superadmin/catalogs?tab=app_catalogs&cat=${cat}&add=1&error=${encodeURIComponent(error.message)}`)
  redirect(`/superadmin/catalogs?tab=app_catalogs&cat=${cat}`)
}

export async function toggleCatalogEntry(id: string, isActive: boolean) {
  const supabase = createAdminClient()
  await supabase.from('global_catalog').update({ is_active: !isActive }).eq('id', id)
  redirect('/superadmin/catalogs?tab=app_catalogs')
}

export async function updateCatalogEntry(formData: FormData) {
  const supabase = createAdminClient()
  const id  = formData.get('id') as string
  const cat = formData.get('category') as string
  const { error } = await supabase.from('global_catalog').update({
    label_es:   (formData.get('label_es') as string).trim(),
    label_en:   (formData.get('label_en') as string)?.trim() || null,
    label_pt:   (formData.get('label_pt') as string)?.trim() || null,
    sort_order: Number(formData.get('sort_order') ?? 99),
  }).eq('id', id)
  if (error) redirect(`/superadmin/catalogs?tab=app_catalogs&cat=${cat}&error=${encodeURIComponent(error.message)}`)
  redirect(`/superadmin/catalogs?tab=app_catalogs&cat=${cat}`)
}

export async function addCurrency(formData: FormData) {
  const supabase = createAdminClient()
  const code = (formData.get('code') as string).toUpperCase().trim()
  const rateRaw = formData.get('usd_rate')
  const usd_rate = rateRaw && String(rateRaw).trim() !== '' ? Number(rateRaw) : null
  const { error } = await supabase.from('currencies').insert({
    code,
    name:      formData.get('name') as string,
    is_active: true,
    sort_order: 99,
    usd_rate,
  })
  if (error) redirect(`/superadmin/catalogs?tab=currencies&add=1&error=${encodeURIComponent(error.message)}`)
  redirect('/superadmin/catalogs?tab=currencies')
}
