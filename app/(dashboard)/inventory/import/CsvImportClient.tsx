'use client'

import { useRef, useState, useTransition } from 'react'
import * as XLSX from 'xlsx'
import { bulkImportItems, type ImportRow } from './actions'

interface UnitOption {
  id: string
  key: string
  label_es: string
}

interface Props {
  units: UnitOption[]
  existingSkus: string[]
  importError?: string
  duplicateSkus?: string[]
}

const VALID_TYPES = ['part', 'consumable', 'accessory', 'tool', 'other']
const TYPE_LABELS: Record<string, string> = {
  part: 'Repuesto', consumable: 'Consumible', accessory: 'Accesorio',
  tool: 'Herramienta', other: 'Otro',
}

interface ParsedRow {
  line: number
  name: string
  sku: string
  internal_code: string
  type: string
  unit: string
  sale_price: string
  cost_price: string
  min_stock: string
  initial_stock: string
  description: string
  bin_location: string
  errors: string[]
}

function parseCSV(text: string): string[][] {
  const lines = text.trim().split(/\r?\n/)
  return lines.map(line => {
    const cols: string[] = []
    let cur = ''
    let inQuote = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (ch === '"') { inQuote = !inQuote }
      else if (ch === ',' && !inQuote) { cols.push(cur.trim()); cur = '' }
      else { cur += ch }
    }
    cols.push(cur.trim())
    return cols
  })
}

export function CsvImportClient({ units, existingSkus, importError, duplicateSkus }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [rows, setRows] = useState<ParsedRow[]>([])
  const [fileName, setFileName] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const unitByKey: Record<string, UnitOption> = {}
  for (const u of units) unitByKey[u.key] = u

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setFileName(file.name)
    const isXlsx = file.name.endsWith('.xlsx') || file.name.endsWith('.xls') ||
      file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    const reader = new FileReader()
    if (isXlsx) {
      reader.onload = ev => {
        const data = ev.target?.result as ArrayBuffer
        const wb = XLSX.read(data, { type: 'array' })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const csv = XLSX.utils.sheet_to_csv(ws)
        processCSV(csv)
      }
      reader.readAsArrayBuffer(file)
    } else {
      reader.onload = ev => {
        const text = ev.target?.result as string
        processCSV(text)
      }
      reader.readAsText(file, 'utf-8')
    }
    e.target.value = ''
  }

  function processCSV(text: string) {
    const parsed = parseCSV(text)
    if (parsed.length < 2) { setRows([]); return }

    // Detect header row
    const header = parsed[0].map(h => h.toLowerCase().replace(/[^a-z_]/g, ''))
    const idx = (names: string[]) => names.reduce((found, n) => found >= 0 ? found : header.indexOf(n), -1)

    const nameIdx   = idx(['name', 'nombre'])
    const skuIdx    = idx(['sku'])
    const codeIdx   = idx(['internal_code', 'codigo_interno', 'codigo'])
    const typeIdx   = idx(['type', 'tipo'])
    const unitIdx   = idx(['unit', 'unidad'])
    const saleIdx   = idx(['sale_price', 'precio_venta', 'precio'])
    const costIdx   = idx(['cost_price', 'costo'])
    const minIdx    = idx(['min_stock', 'stock_minimo'])
    const initIdx   = idx(['initial_stock', 'stock_inicial'])
    const descIdx   = idx(['description', 'descripcion'])
    const binIdx    = idx(['bin_location', 'ubicacion', 'ubicación'])

    const skusSeen = new Set<string>()
    const parsed2: ParsedRow[] = []

    for (let i = 1; i < parsed.length; i++) {
      const cols = parsed[i]
      if (cols.every(c => !c)) continue // skip empty rows

      const get = (idx: number) => (idx >= 0 ? cols[idx] ?? '' : '')
      const name = get(nameIdx)
      const sku = get(skuIdx).toUpperCase()
      const unit = get(unitIdx) || 'unit'
      const type = get(typeIdx) || 'part'

      const errors: string[] = []
      if (!name) errors.push('Nombre requerido')
      if (sku && existingSkus.includes(sku)) errors.push(`SKU "${sku}" ya existe`)
      if (sku && skusSeen.has(sku)) errors.push(`SKU "${sku}" duplicado en el archivo`)
      if (!VALID_TYPES.includes(type)) errors.push(`Tipo "${type}" inválido`)
      if (unit && !unitByKey[unit] && !['und', 'un', 'pcs'].includes(unit))
        errors.push(`Unidad "${unit}" no reconocida`)

      const saleRaw = get(saleIdx)
      const costRaw = get(costIdx)
      const minRaw  = get(minIdx)
      const initRaw = get(initIdx)

      if (saleRaw && isNaN(Number(saleRaw))) errors.push('Precio venta inválido')
      if (costRaw && isNaN(Number(costRaw))) errors.push('Costo inválido')
      if (minRaw && isNaN(Number(minRaw)))   errors.push('Stock mínimo inválido')
      if (initRaw && isNaN(Number(initRaw))) errors.push('Stock inicial inválido')

      if (sku) skusSeen.add(sku)

      parsed2.push({
        line: i,
        name, sku,
        internal_code: get(codeIdx),
        type,
        unit,
        sale_price: saleRaw,
        cost_price: costRaw,
        min_stock: minRaw,
        initial_stock: initRaw,
        description: get(descIdx),
        bin_location: get(binIdx),
        errors,
      })
    }
    setRows(parsed2)
  }

  const validRows = rows.filter(r => r.errors.length === 0)
  const errorRows = rows.filter(r => r.errors.length > 0)

  function buildImportRows(): ImportRow[] {
    return validRows.map(r => {
      const unit = unitByKey[r.unit]
      return {
        name: r.name,
        sku: r.sku || null,
        internal_code: r.internal_code || null,
        type: r.type,
        unit_id: unit?.id ?? null,
        unit_of_measure: (unit?.key ?? r.unit) || 'und',
        sale_price: r.sale_price ? Number(r.sale_price) : null,
        cost_price: r.cost_price ? Number(r.cost_price) : null,
        min_stock: r.min_stock ? Number(r.min_stock) : 0,
        initial_stock: r.initial_stock ? Number(r.initial_stock) : 0,
        description: r.description || null,
        bin_location: r.bin_location || null,
      }
    })
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData()
    fd.set('rows', JSON.stringify(buildImportRows()))
    startTransition(() => bulkImportItems(fd))
  }

  function downloadTemplate() {
    const wb = XLSX.utils.book_new()

    // --- Sheet 1: Template ---
    const headers = ['name', 'sku', 'internal_code', 'type', 'unit', 'sale_price', 'cost_price', 'min_stock', 'initial_stock', 'description', 'bin_location']
    const headerLabels = ['Nombre *', 'SKU', 'Código interno', 'Tipo', 'Unidad', 'Precio venta', 'Costo', 'Stock mínimo', 'Stock inicial', 'Descripción', 'Ubicación']
    const examples = [
      ['Filtro de aceite Honda', 'FILT-001', 'REP-001', 'part', 'unit', 25000, 15000, 2, 5, 'Filtro estándar', 'Góndola 1 nivel 2'],
      ['Aceite 20W-50 1L', '', '', 'consumable', 'liter', 18000, 12000, 3, 10, '', ''],
      ['Kit de frenos delanteros', 'FREN-KIT-001', '', 'part', 'set', 85000, 55000, 1, 2, '', ''],
    ]

    const wsData = [headers, headerLabels, ...examples]
    const ws = XLSX.utils.aoa_to_sheet(wsData)

    // Hide row 1 (machine headers) and style row 2 (human labels)
    ws['!rows'] = [{ hidden: true }, { hpt: 20 }]

    // Column widths
    ws['!cols'] = [
      { wch: 30 }, { wch: 14 }, { wch: 16 }, { wch: 12 }, { wch: 10 },
      { wch: 13 }, { wch: 13 }, { wch: 13 }, { wch: 13 }, { wch: 30 }, { wch: 20 },
    ]

    // Style header row (row 2 = index 1)
    const headerStyle = { font: { bold: true, color: { rgb: 'FFFFFF' } }, fill: { fgColor: { rgb: '1E293B' } }, alignment: { horizontal: 'center' } }
    for (let c = 0; c < headers.length; c++) {
      const cellRef = XLSX.utils.encode_cell({ r: 1, c })
      if (ws[cellRef]) ws[cellRef].s = headerStyle
    }

    // Freeze header row
    ws['!freeze'] = { xSplit: 0, ySplit: 2 }

    XLSX.utils.book_append_sheet(wb, ws, 'Plantilla')

    // --- Sheet 2: Reference ---
    const refData = [
      ['TIPOS VÁLIDOS', '', 'UNIDADES VÁLIDAS', ''],
      ['Código', 'Descripción', 'Código', 'Descripción'],
      ['part', 'Repuesto', 'unit', 'Unidad'],
      ['consumable', 'Consumible', 'liter', 'Litro'],
      ['accessory', 'Accesorio', 'ml', 'Mililitro'],
      ['tool', 'Herramienta', 'kg', 'Kilogramo'],
      ['other', 'Otro', 'gram', 'Gramo'],
      ['', '', 'set', 'Set / Kit'],
      ['', '', 'pair', 'Par'],
      ['', '', 'box', 'Caja'],
      ['', '', 'meter', 'Metro'],
      ['', '', 'roll', 'Rollo'],
      ...units.slice(0, 20).map(u => ['', '', u.key, u.label_es]),
    ]
    const wsRef = XLSX.utils.aoa_to_sheet(refData)
    wsRef['!cols'] = [{ wch: 14 }, { wch: 16 }, { wch: 14 }, { wch: 16 }]
    XLSX.utils.book_append_sheet(wb, wsRef, 'Referencia')

    XLSX.writeFile(wb, 'plantilla_inventario.xlsx')
  }

  return (
    <div className="space-y-5">
      {/* Error banner */}
      {importError && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
          {importError === 'dup_sku'
            ? `SKUs duplicados en la base de datos: ${duplicateSkus?.join(', ')}`
            : importError === 'empty' ? 'No hay filas válidas para importar'
            : `Error: ${importError}`}
        </div>
      )}

      {/* Step 1: Download template */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">1. Descarga la plantilla</h2>
        <p className="text-sm text-gray-500 mb-3">
          Descarga el archivo Excel con los campos y ejemplos precargados. Solo <strong>Nombre</strong> es obligatorio.
          La hoja <em>Referencia</em> tiene los valores válidos de Tipo y Unidad.
        </p>

        <button
          type="button"
          onClick={downloadTemplate}
          className="flex items-center gap-2 text-sm font-medium text-emerald-700 border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 px-4 py-2 rounded-lg transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          Descargar plantilla Excel (.xlsx)
        </button>
      </div>

      {/* Step 2: Upload */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">2. Sube tu archivo</h2>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-800 border border-dashed border-slate-300 hover:border-slate-400 rounded-lg px-4 py-3 transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="17 8 12 3 7 8"/>
            <line x1="12" y1="3" x2="12" y2="15"/>
          </svg>
          {fileName ? `Cambiar archivo (${fileName})` : 'Seleccionar archivo .xlsx o .csv'}
        </button>
        <input ref={inputRef} type="file" accept=".xlsx,.xls,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" className="hidden" onChange={handleFile} />
      </div>

      {/* Step 3: Preview */}
      {rows.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-gray-700">3. Vista previa</h2>
              <p className="text-xs text-gray-400 mt-0.5">
                {validRows.length} válidos · {errorRows.length > 0 && <span className="text-red-500">{errorRows.length} con errores (serán omitidos)</span>}
              </p>
            </div>
            {validRows.length > 0 && (
              <form onSubmit={handleSubmit}>
                <button
                  type="submit"
                  disabled={isPending}
                  className="bg-slate-800 hover:bg-slate-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
                >
                  {isPending ? 'Importando…' : `Importar ${validRows.length} ítem${validRows.length !== 1 ? 's' : ''}`}
                </button>
              </form>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-4 py-2.5 font-medium text-gray-500">Nombre</th>
                  <th className="text-left px-4 py-2.5 font-medium text-gray-500">SKU</th>
                  <th className="text-left px-4 py-2.5 font-medium text-gray-500">Tipo</th>
                  <th className="text-left px-4 py-2.5 font-medium text-gray-500">Unidad</th>
                  <th className="text-right px-4 py-2.5 font-medium text-gray-500">Precio</th>
                  <th className="text-right px-4 py-2.5 font-medium text-gray-500">Costo</th>
                  <th className="text-right px-4 py-2.5 font-medium text-gray-500">Mín</th>
                  <th className="text-right px-4 py-2.5 font-medium text-gray-500">Stock ini.</th>
                  <th className="text-left px-4 py-2.5 font-medium text-gray-500">Ubicación</th>
                  <th className="px-4 py-2.5 font-medium text-gray-500">Estado</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(row => {
                  const hasError = row.errors.length > 0
                  return (
                    <tr key={row.line} className={`border-b border-gray-50 last:border-0 ${hasError ? 'bg-red-50' : ''}`}>
                      <td className="px-4 py-2.5 font-medium text-gray-900">{row.name || <span className="text-red-400 italic">vacío</span>}</td>
                      <td className="px-4 py-2.5 text-gray-500 font-mono">{row.sku || '—'}</td>
                      <td className="px-4 py-2.5 text-gray-500">{TYPE_LABELS[row.type] ?? row.type}</td>
                      <td className="px-4 py-2.5 text-gray-500">{(unitByKey[row.unit]?.label_es ?? row.unit) || '—'}</td>
                      <td className="px-4 py-2.5 text-right text-gray-700">{row.sale_price || '—'}</td>
                      <td className="px-4 py-2.5 text-right text-gray-500">{row.cost_price || '—'}</td>
                      <td className="px-4 py-2.5 text-right text-gray-500">{row.min_stock || '0'}</td>
                      <td className="px-4 py-2.5 text-right text-gray-500">{row.initial_stock || '0'}</td>
                      <td className="px-4 py-2.5 text-gray-500 text-xs font-mono">{row.bin_location || '—'}</td>
                      <td className="px-4 py-2.5">
                        {hasError ? (
                          <div className="text-red-500 text-xs space-y-0.5">
                            {row.errors.map((e, i) => <div key={i}>✕ {e}</div>)}
                          </div>
                        ) : (
                          <span className="text-emerald-600 text-xs font-medium">✓ OK</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
