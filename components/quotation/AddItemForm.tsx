'use client'

import { useState, useRef, useEffect, useTransition } from 'react'

interface InventoryResult {
  id: string
  name: string
  sku: string | null
  internal_code: string | null
  sale_price: number | null
  unit_of_measure: string
  available_stock: number
  is_compatible: boolean | null
}

interface Service {
  id: string
  name: string
  base_price: number | null
}

interface Props {
  quotationId: string
  workOrderId: string
  currentTotal: number
  services: Service[]
  defaultTaxRate: number
  addItemAction: (formData: FormData) => Promise<void>
  vehicleBrand?: string
  vehicleModel?: string
}

export function AddItemForm({ quotationId, workOrderId, currentTotal, services, defaultTaxRate, addItemAction, vehicleBrand, vehicleModel }: Props) {
  const [itemType, setItemType] = useState<'service' | 'part'>('service')
  const [description, setDescription] = useState('')
  const [unitPrice, setUnitPrice] = useState(0)
  const [quantity, setQuantity] = useState(1)
  const [taxRate, setTaxRate] = useState(defaultTaxRate)
  const [inventoryItemId, setInventoryItemId] = useState<string | null>(null)
  const [inventoryUnit, setInventoryUnit] = useState<string | null>(null)

  const [searchResults, setSearchResults] = useState<InventoryResult[]>([])
  const [searchOpen, setSearchOpen] = useState(false)
  const [searching, setSearching] = useState(false)
  const searchTimer = useRef<ReturnType<typeof setTimeout>>()
  const descRef = useRef<HTMLInputElement>(null)

  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    if (itemType !== 'part' || inventoryItemId || !description.trim()) {
      setSearchResults([])
      setSearchOpen(false)
      return
    }
    clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(async () => {
      if (description.length < 2) return
      setSearching(true)
      try {
        const params = new URLSearchParams({ q: description, limit: '6' })
        if (vehicleBrand) params.set('vehicle_brand', vehicleBrand)
        if (vehicleModel) params.set('vehicle_model', vehicleModel)
        const res = await fetch(`/api/inventory/search?${params}`)
        if (res.ok) {
          const data = await res.json()
          setSearchResults(data.items ?? [])
          setSearchOpen((data.items ?? []).length > 0)
        }
      } finally {
        setSearching(false)
      }
    }, 300)
    return () => clearTimeout(searchTimer.current)
  }, [description, itemType, inventoryItemId])

  function selectInventoryItem(item: InventoryResult) {
    setDescription(item.name)
    setUnitPrice(item.sale_price ?? 0)
    setInventoryItemId(item.id)
    setInventoryUnit(item.unit_of_measure)
    setSearchResults([])
    setSearchOpen(false)
  }

  function clearInventorySelection() {
    setInventoryItemId(null)
    setInventoryUnit(null)
    setDescription('')
    setUnitPrice(0)
    setTimeout(() => descRef.current?.focus(), 10)
  }

  function buildFormData(overrides?: Partial<{
    description: string; quantity: number; unitPrice: number;
    itemType: string; taxRate: number; inventoryItemId: string | null
  }>) {
    const fd = new FormData()
    fd.set('quotation_id', quotationId)
    fd.set('work_order_id', workOrderId)
    fd.set('current_total', String(currentTotal))
    fd.set('description', overrides?.description ?? description)
    fd.set('quantity', String(overrides?.quantity ?? quantity))
    fd.set('unit_price', String(overrides?.unitPrice ?? unitPrice))
    fd.set('item_type', overrides?.itemType ?? itemType)
    fd.set('tax_rate', String(overrides?.taxRate ?? taxRate))
    fd.set('discount_pct', '0')
    const iid = overrides?.inventoryItemId !== undefined ? overrides.inventoryItemId : inventoryItemId
    if (iid) fd.set('inventory_item_id', iid)
    return fd
  }

  function resetForm() {
    setDescription('')
    setUnitPrice(0)
    setQuantity(1)
    setInventoryItemId(null)
    setInventoryUnit(null)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const fd = buildFormData()
    startTransition(async () => {
      await addItemAction(fd)
      resetForm()
    })
  }

  function addServiceChip(svc: Service) {
    const fd = buildFormData({
      description: svc.name,
      quantity: 1,
      unitPrice: svc.base_price ?? 0,
      itemType: 'service',
      taxRate: defaultTaxRate,
      inventoryItemId: null,
    })
    startTransition(() => addItemAction(fd))
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 mb-5">
      <p className="text-sm font-semibold text-gray-700 mb-4">Agregar ítem</p>

      {/* Service chips */}
      {services.length > 0 && (
        <div className="mb-4">
          <p className="text-xs text-gray-400 mb-2">Desde catálogo de servicios</p>
          <div className="flex flex-wrap gap-2">
            {services.slice(0, 12).map(svc => (
              <button
                key={svc.id}
                type="button"
                onClick={() => addServiceChip(svc)}
                disabled={isPending}
                className="text-xs border border-slate-200 rounded-lg px-2.5 py-1 text-gray-700 hover:bg-slate-50 hover:border-slate-300 transition-colors disabled:opacity-50"
              >
                + {svc.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid grid-cols-6 gap-3 items-end">
        {/* Description / inventory search */}
        <div className="col-span-2 relative">
          <label className="block text-xs text-gray-400 mb-1">Descripción</label>
          {inventoryItemId ? (
            <div className="flex items-center gap-1.5">
              <div className="flex-1 flex items-center gap-1.5 px-3 py-2 border border-emerald-300 bg-emerald-50 rounded-lg text-sm text-gray-700 min-w-0">
                <span className="truncate">{description}</span>
                {inventoryUnit && <span className="text-xs text-emerald-600 shrink-0 font-medium">· {inventoryUnit}</span>}
              </div>
              <button
                type="button"
                onClick={clearInventorySelection}
                className="shrink-0 text-gray-400 hover:text-gray-600 text-sm px-0.5 leading-none"
                title="Quitar selección de inventario"
              >
                ✕
              </button>
            </div>
          ) : (
            <div className="relative">
              <input
                ref={descRef}
                value={description}
                onChange={e => setDescription(e.target.value)}
                required
                placeholder={itemType === 'part' ? 'Buscar repuesto...' : 'Cambio de aceite...'}
                onBlur={() => setTimeout(() => setSearchOpen(false), 150)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 pr-8"
              />
              {searching && (
                <div className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 border-2 border-slate-200 border-t-slate-500 rounded-full animate-spin" />
              )}
              {searchOpen && searchResults.length > 0 && (
                <div className="absolute z-20 top-full left-0 right-0 mt-0.5 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
                  {searchResults.map(item => (
                    <button
                      key={item.id}
                      type="button"
                      onMouseDown={() => selectInventoryItem(item)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 text-left border-b border-gray-50 last:border-0"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-medium text-gray-800 truncate">{item.name}</p>
                          {item.is_compatible === true && (
                            <span className="shrink-0 text-xs bg-emerald-50 text-emerald-600 font-medium px-1.5 py-0.5 rounded">✓ compatible</span>
                          )}
                        </div>
                        {item.sku && <p className="text-xs text-gray-400 font-mono">{item.sku}</p>}
                      </div>
                      <div className="shrink-0 flex items-center gap-2 text-xs">
                        <span className={`px-1.5 py-0.5 rounded font-medium ${
                          item.available_stock <= 0 ? 'bg-red-50 text-red-500' :
                          item.available_stock <= 3 ? 'bg-amber-50 text-amber-600' :
                          'bg-emerald-50 text-emerald-600'
                        }`}>
                          {item.available_stock > 0 ? item.available_stock : 'Sin stock'} {item.available_stock > 0 ? item.unit_of_measure : ''}
                        </span>
                        {item.sale_price != null && (
                          <span className="font-medium text-gray-600">
                            ${item.sale_price.toLocaleString('es-CO')}
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Type */}
        <div>
          <label className="block text-xs text-gray-400 mb-1">Tipo</label>
          <select
            value={itemType}
            onChange={e => {
              setItemType(e.target.value as 'service' | 'part')
              setInventoryItemId(null)
              setInventoryUnit(null)
              setDescription('')
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-400"
          >
            <option value="service">Servicio</option>
            <option value="part">Repuesto</option>
          </select>
        </div>

        {/* Price */}
        <div>
          <label className="block text-xs text-gray-400 mb-1">Precio unit.</label>
          <input
            type="number"
            value={unitPrice}
            onChange={e => setUnitPrice(Number(e.target.value))}
            min="0"
            step="0.01"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
          />
        </div>

        {/* Quantity */}
        <div>
          <label className="block text-xs text-gray-400 mb-1">Cant.</label>
          <input
            type="number"
            value={quantity}
            onChange={e => setQuantity(Number(e.target.value))}
            min="1"
            step="0.01"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
          />
        </div>

        {/* Tax + submit */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs text-gray-400 mb-1">IVA %</label>
            <input
              type="number"
              value={taxRate}
              onChange={e => setTaxRate(Number(e.target.value))}
              min="0"
              max="100"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
            />
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              disabled={isPending}
              className="w-full bg-slate-800 hover:bg-slate-700 text-white text-sm font-medium py-2 rounded-lg transition-colors disabled:opacity-50"
            >
              {isPending ? '…' : '+'}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
