'use client'

import { useState, useRef, useEffect, useTransition } from 'react'
import { consumePart } from './actions'

interface InventoryResult {
  id: string
  name: string
  sku: string | null
  sale_price: number | null
  unit_of_measure: string
  available_stock: number
  is_compatible: boolean | null
}

interface Props {
  workOrderId: string
  otNumber: string
  vehicleBrand?: string
  vehicleModel?: string
  stockError?: string
}

export function PartsClient({ workOrderId, otNumber, vehicleBrand, vehicleModel, stockError }: Props) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<InventoryResult[]>([])
  const [searching, setSearching] = useState(false)
  const [activeItemId, setActiveItemId] = useState<string | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [notes, setNotes] = useState('')
  const [forced, setForced] = useState(false)
  const [recentConsumptions, setRecentConsumptions] = useState<{ name: string; qty: number; unit: string }[]>([])
  const [isPending, startTransition] = useTransition()
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => {
    clearTimeout(timer.current)
    if (query.length < 2) { setResults([]); return }
    timer.current = setTimeout(async () => {
      setSearching(true)
      try {
        const params = new URLSearchParams({ q: query, limit: '8' })
        if (vehicleBrand) params.set('vehicle_brand', vehicleBrand)
        if (vehicleModel) params.set('vehicle_model', vehicleModel)
        const res = await fetch(`/api/inventory/search?${params}`)
        if (res.ok) setResults((await res.json()).items ?? [])
      } finally { setSearching(false) }
    }, 300)
    return () => clearTimeout(timer.current)
  }, [query, vehicleBrand, vehicleModel])

  function selectItem(item: InventoryResult) {
    setActiveItemId(item.id)
    setQuantity(1)
    setNotes('')
    setForced(false)
  }

  function handleSubmit(item: InventoryResult) {
    const fd = new FormData()
    fd.set('work_order_id', workOrderId)
    fd.set('item_id', item.id)
    fd.set('quantity', String(quantity))
    fd.set('notes', notes)
    if (forced) fd.set('forced', '1')
    startTransition(async () => {
      await consumePart(fd)
      setRecentConsumptions(prev => [{ name: item.name, qty: quantity, unit: item.unit_of_measure }, ...prev])
      setActiveItemId(null)
      setQuery('')
      setResults([])
    })
  }

  const activeItem = results.find(r => r.id === activeItemId)

  return (
    <div className="max-w-2xl space-y-5">
      {/* Error banner */}
      {stockError === 'insufficient_stock' && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-700">
          ⚠ Stock insuficiente. Puedes hacer una <strong>salida forzada</strong> si el ítem no está registrado en inventario.
        </div>
      )}

      {/* Vehicle context */}
      {vehicleBrand && (
        <p className="text-xs text-gray-400">
          Buscando repuestos compatibles con <span className="font-medium text-gray-600">{vehicleBrand} {vehicleModel}</span>
        </p>
      )}

      {/* Search */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Buscar repuesto en inventario</h2>
        <div className="relative">
          <input
            value={query}
            onChange={e => { setQuery(e.target.value); setActiveItemId(null) }}
            placeholder="Nombre, SKU o código..."
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300 pr-8"
          />
          {searching && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 border-2 border-slate-200 border-t-slate-500 rounded-full animate-spin" />
          )}
        </div>

        {/* Results */}
        {results.length > 0 && (
          <div className="mt-3 divide-y divide-gray-50 border border-gray-100 rounded-lg overflow-hidden">
            {results.map(item => (
              <div key={item.id} className="p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="text-sm font-medium text-gray-800">{item.name}</p>
                      {item.is_compatible === true && (
                        <span className="text-xs bg-emerald-50 text-emerald-600 font-medium px-1.5 py-0.5 rounded">✓ compatible</span>
                      )}
                    </div>
                    {item.sku && <p className="text-xs text-gray-400 font-mono">{item.sku}</p>}
                  </div>
                  <div className="shrink-0 flex items-center gap-2">
                    <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${
                      item.available_stock <= 0 ? 'bg-red-50 text-red-500' :
                      item.available_stock <= 3 ? 'bg-amber-50 text-amber-600' :
                      'bg-emerald-50 text-emerald-600'
                    }`}>
                      {item.available_stock > 0 ? `${item.available_stock} ${item.unit_of_measure}` : 'Sin stock'}
                    </span>
                    {item.sale_price != null && (
                      <span className="text-xs text-gray-500 font-medium">${item.sale_price.toLocaleString('es-CO')}</span>
                    )}
                    <button
                      type="button"
                      onClick={() => selectItem(item)}
                      className="text-xs bg-slate-800 hover:bg-slate-700 text-white font-medium px-2.5 py-1 rounded-lg transition-colors"
                    >
                      Usar
                    </button>
                  </div>
                </div>

                {/* Inline form */}
                {activeItemId === item.id && (
                  <div className="mt-3 pt-3 border-t border-gray-100 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">Cantidad</label>
                        <input
                          type="number"
                          value={quantity}
                          onChange={e => setQuantity(Number(e.target.value))}
                          min="0.01"
                          step="0.01"
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">Notas (opcional)</label>
                        <input
                          value={notes}
                          onChange={e => setNotes(e.target.value)}
                          placeholder="ej. cambio preventivo"
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
                        />
                      </div>
                    </div>

                    {item.available_stock < quantity && (
                      <label className="flex items-start gap-2 bg-red-50 border border-red-100 rounded-lg px-3 py-2.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={forced}
                          onChange={e => setForced(e.target.checked)}
                          className="mt-0.5"
                        />
                        <div>
                          <p className="text-sm font-medium text-red-700">Salida forzada (sin stock registrado)</p>
                          <p className="text-xs text-red-500 mt-0.5">El ítem se descontará aunque el stock sea insuficiente. Úsalo cuando el repuesto existe físicamente pero no está registrado.</p>
                        </div>
                      </label>
                    )}

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleSubmit(item)}
                        disabled={isPending || (item.available_stock < quantity && !forced)}
                        className="bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
                      >
                        {isPending ? 'Registrando…' : 'Confirmar consumo'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveItemId(null)}
                        className="text-sm text-gray-400 hover:text-gray-600 px-3 py-2"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {query.length >= 2 && !searching && results.length === 0 && (
          <p className="text-sm text-gray-400 mt-3 text-center py-4">No se encontraron repuestos para "{query}"</p>
        )}
      </div>

      {/* Recent consumptions this session */}
      {recentConsumptions.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Registrados en esta sesión</h2>
          <div className="space-y-2">
            {recentConsumptions.map((c, i) => (
              <div key={i} className="flex items-center gap-3 text-sm">
                <span className="text-emerald-500 text-base">✓</span>
                <span className="font-medium text-gray-800">{c.name}</span>
                <span className="text-gray-400">× {c.qty} {c.unit}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
