'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'

export async function createCampaign(formData: FormData) {
  const adminClient = createAdminClient()

  const placementId        = formData.get('placement_id') as string
  const title              = formData.get('title') as string
  const linkUrl            = (formData.get('link_url') as string) || null
  const advertiserName     = formData.get('advertiser_name') as string
  const advertiserContact  = (formData.get('advertiser_contact') as string) || null
  const pricePaid          = parseFloat(formData.get('price_paid') as string) || null
  const currency           = (formData.get('currency') as string) || 'USD'
  const startsAt           = formData.get('starts_at') as string
  const endsAt             = formData.get('ends_at') as string
  const notes              = (formData.get('notes') as string) || null

  // Upload image file to Supabase Storage
  const imageFile = formData.get('image_file') as File | null
  if (!imageFile || imageFile.size === 0) {
    redirect(`/superadmin/ads/new?error=${encodeURIComponent('Debes seleccionar una imagen')}`)
  }

  const ext      = imageFile!.name.split('.').pop() ?? 'jpg'
  const path     = `ads/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
  const buffer   = new Uint8Array(await imageFile!.arrayBuffer())

  const { error: uploadError } = await adminClient.storage
    .from('ads-images')
    .upload(path, buffer, { contentType: imageFile!.type, upsert: false })

  if (uploadError) {
    redirect(`/superadmin/ads/new?error=${encodeURIComponent(uploadError.message)}`)
  }

  const { data: { publicUrl } } = adminClient.storage.from('ads-images').getPublicUrl(path)

  const { error } = await adminClient.from('ads').insert({
    placement_id: placementId,
    title,
    image_url: publicUrl,
    link_url: linkUrl,
    advertiser_name: advertiserName,
    advertiser_contact: advertiserContact,
    price_paid: pricePaid,
    currency,
    starts_at: startsAt,
    ends_at: endsAt,
    notes,
    is_active: true,
  })

  if (error) {
    redirect(`/superadmin/ads/new?error=${encodeURIComponent(error.message)}`)
  }
  redirect('/superadmin/ads?success=Campaña publicada')
}

export async function toggleCampaign(formData: FormData) {
  const adminClient = createAdminClient()
  const id       = formData.get('id') as string
  const isActive = formData.get('is_active') === 'true'

  const { error } = await adminClient.from('ads').update({ is_active: !isActive }).eq('id', id)

  if (error) redirect(`/superadmin/ads?error=${encodeURIComponent(error.message)}`)
  redirect('/superadmin/ads')
}

export async function createPlacement(formData: FormData) {
  const adminClient = createAdminClient()

  const name            = formData.get('name') as string
  const slug            = (formData.get('slug') as string).toLowerCase().replace(/\s+/g, '_')
  const description     = (formData.get('description') as string) || null
  const locationHint    = (formData.get('location_hint') as string) || null
  const width           = parseInt(formData.get('width') as string, 10)
  const height          = parseInt(formData.get('height') as string, 10)
  const acceptedFormats = (formData.get('accepted_formats') as string) || 'JPG, PNG, WebP'
  const maxFileSizeKb   = parseInt(formData.get('max_file_size_kb') as string, 10) || 500
  const pricePerWeek    = parseFloat(formData.get('price_per_week') as string) || null
  const pricePerMonth   = parseFloat(formData.get('price_per_month') as string) || null

  const { error } = await adminClient.from('ad_placements').insert({
    name, slug, description, location_hint: locationHint,
    width, height, accepted_formats: acceptedFormats,
    max_file_size_kb: maxFileSizeKb,
    price_per_week: pricePerWeek, price_per_month: pricePerMonth,
    is_active: true,
  })

  if (error) redirect(`/superadmin/ads/placements/new?error=${encodeURIComponent(error.message)}`)
  redirect('/superadmin/ads/placements?success=Espacio creado')
}

export async function togglePlacement(formData: FormData) {
  const adminClient = createAdminClient()
  const id       = formData.get('id') as string
  const isActive = formData.get('is_active') === 'true'

  const { error } = await adminClient.from('ad_placements').update({ is_active: !isActive }).eq('id', id)
  if (error) redirect(`/superadmin/ads/placements?error=${encodeURIComponent(error.message)}`)
  redirect('/superadmin/ads/placements')
}
