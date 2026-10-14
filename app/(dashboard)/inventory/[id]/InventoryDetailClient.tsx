'use client'

import { useState, useTransition } from 'react'
import { adjustStock, toggleItemActive } from '../actions'

interface Movement {
  id: string
  movement_type: string
  quantity: number
  unit_cost: number | null
  notes: string | null
  created_at: string
  performer: string | null
}

interface Props {
  itemId: string
  itemName: string
  unit: string
  isActive: boolean
  movements: Movement[]
  movementLabels: Record<string, string>
}

const MOVEMENT_TYPES = ['purchase', 'adjustment', 'consumption', 'write_off', 'return_to_stock']

export function InventoryDetailClient({ itemId, itemName, unit, isActive, movements, movementLabels }: Props) {
  const [showAdjust, setShowAdjust] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleToggle() {
    startTransition(() => toggleItemActive(itemId, isActive))
  }

  return (
    <div className="space-y-4">
      {/* Actions row */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setShowAdjust(v => !v)}
          className="text-sm font-medium px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors"
        >
          {showAdjust ? 'Cancelar ajuste' : '+ Ajuste de stock'}
        </button>
        <button
          onClick={handleToggle}
          disabled={isPending}
          className="text-sm font-medium px-4 py-2 border border-gray-200 hover:bg-gray-50 text-gray-600 rounded-lg transition-colors disabled:opacity-50"
        >
          {isActive ? 'Desactivar ítem' : 'Activar ítem'}
        </button>
      </div>

      {/* Adjustment form */}
      {showAdjust && (
        <form
          action={async (fd) => {
            fd.append('item_id', itemId)
            await adjustStock(fd)
            setShowAdjust(false)
          }}
          className="bg-white border border-gray-200 rounded-xl p-5 space-y-3"
        >
          <h3 className="text-sm font-semibold text-gray-700">Registrar movimiento — {itemName}</h3>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Tipo de movimiento</label>
              <select
                name="movement_type"
                defaultValue="purchase"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300 bg-white"
              >
                {MOVEMENT_TYPES.map(t => (
                  <option key={t} value={t}>{movementLabels[t] ?? t}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Cantidad ({unit})</label>
              <input
                type="number"
                name="quantity"
                required
                min="0.01"
                step="0.01"
                placeholder="1"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Costo unitario (opcional)</label>
              <input
                type="number"
                name="unit_cost"
                min="0"
                step="0.01"
                placeholder="0"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Notas</label>
              <input
                name="notes"
                placeholder="Compra proveedor X, ajuste inventario..."
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-slate-800 hover:bg-slate-700 text-white text-sm font-medium py-2 rounded-lg transition-colors"
          >
            Registrar movimiento
          </button>
        </form>
      )}

      {/* Movement log */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-700">Historial de movimientos</h3>
        </div>
        {movements.length === 0 ? (
          <p className="text-sm text-gray-300 text-center py-8">Sin movimientos registrados</p>
        ) : (
          <div className="divide-y divide-gray-50">
            {movements.map(m => {
              const isNeg = m.quantity < 0
              return (
                <div key={m.id} className="px-5 py-3 flex items-center gap-3">
                  <span className={`text-lg font-bold w-6 text-center ${isNeg ? 'text-red-400' : 'text-emerald-500'}`}>
                    {isNeg ? '↓' : '↑'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800">
                      {movementLabels[m.movement_type] ?? m.movement_type}
                      {m.notes && <span className="text-gray-400 font-normal"> — {m.notes}</span>}
                    </p>
                    <p className="text-xs text-gray-400">
                      {m.performer && `${m.performer} · `}
                      {new Date(m.created_at).toLocaleString('es-CO', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <span className={`text-sm font-bold tabular-nums ${isNeg ? 'text-red-500' : 'text-emerald-600'}`}>
                    {isNeg ? '' : '+'}{m.quantity} {unit}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
