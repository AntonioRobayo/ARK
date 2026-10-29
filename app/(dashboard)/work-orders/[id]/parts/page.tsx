import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { PartsClient } from './PartsClient'

type SearchParams = Promise<{ error?: string; item_id?: string }>

export default async function PartsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: SearchParams
}) {
  const { id } = await params
  const { error } = await searchParams

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const admin = createAdminClient()
  const { data: ot } = await admin
    .from('work_order')
    .select('id, number, status, vehicle:vehicle_id(brand, model, plate)')
    .eq('id', id)
    .single()

  if (!ot) notFound()

  const vehicle = Array.isArray(ot.vehicle) ? ot.vehicle[0] : ot.vehicle as any

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <Link href={`/work-orders/${id}`} className="text-gray-400 hover:text-gray-600 text-sm">
          ← OT {ot.number}
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Repuestos utilizados</h1>
          {vehicle && (
            <p className="text-sm text-gray-400 mt-0.5">
              <span className="font-mono">{vehicle.plate}</span>
              {vehicle.brand && ` · ${vehicle.brand} ${vehicle.model ?? ''}`}
            </p>
          )}
        </div>
      </div>

      <PartsClient
        workOrderId={id}
        otNumber={ot.number}
        vehicleBrand={vehicle?.brand ?? undefined}
        vehicleModel={vehicle?.model ?? undefined}
        stockError={error}
      />
    </div>
  )
}
