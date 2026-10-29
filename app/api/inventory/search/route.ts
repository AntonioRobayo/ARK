import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('user_profile').select('tenant_id').eq('id', user.id).single()
  if (!profile?.tenant_id) return NextResponse.json({ error: 'No tenant' }, { status: 400 })

  const q = req.nextUrl.searchParams.get('q') ?? ''
  const limit = Math.min(Number(req.nextUrl.searchParams.get('limit') ?? 8), 20)
  const vehicleBrand = req.nextUrl.searchParams.get('vehicle_brand') ?? ''
  const vehicleModel = req.nextUrl.searchParams.get('vehicle_model') ?? ''

  if (q.length < 2) return NextResponse.json({ items: [] })

  const admin = createAdminClient()

  const [{ data: items }, { data: stockRows }, { data: compatRows }] = await Promise.all([
    admin
      .from('inventory_item')
      .select('id, name, sku, sale_price, unit_of_measure, internal_code')
      .eq('tenant_id', profile.tenant_id)
      .is('deleted_at', null)
      .eq('is_active', true)
      .or(`name.ilike.%${q}%,sku.ilike.%${q}%,internal_code.ilike.%${q}%`)
      .order('name')
      .limit(limit),
    admin
      .from('inventory_stock')
      .select('item_id, quantity_on_hand, quantity_reserved')
      .eq('tenant_id', profile.tenant_id),
    // Only fetch compatibility when we have vehicle context
    vehicleBrand
      ? admin
          .from('inventory_item_compatibility')
          .select('item_id')
          .ilike('brand', vehicleBrand)
          .or(vehicleModel ? `model.ilike.${vehicleModel},model.is.null` : 'model.is.null,model.not.is.null')
      : Promise.resolve({ data: [] as { item_id: string }[] }),
  ])

  const stockMap: Record<string, number> = {}
  for (const row of stockRows ?? []) {
    stockMap[row.item_id] = (stockMap[row.item_id] ?? 0) + (row.quantity_on_hand - row.quantity_reserved)
  }

  const compatItemIds = new Set((compatRows ?? []).map(r => r.item_id))

  const results = (items ?? []).map(item => ({
    id: item.id,
    name: item.name,
    sku: item.sku,
    internal_code: item.internal_code,
    sale_price: item.sale_price,
    unit_of_measure: item.unit_of_measure,
    available_stock: Math.max(0, stockMap[item.id] ?? 0),
    is_compatible: vehicleBrand ? compatItemIds.has(item.id) : null,
  }))

  // Sort: compatible items first
  if (vehicleBrand) {
    results.sort((a, b) => (b.is_compatible ? 1 : 0) - (a.is_compatible ? 1 : 0))
  }

  return NextResponse.json({ items: results })
}
