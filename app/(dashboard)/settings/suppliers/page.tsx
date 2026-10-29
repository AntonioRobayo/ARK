import React from 'react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { checkPermission } from '@/lib/permissions'
import { SubmitButton } from '@/components/ui/SubmitButton'
import { createSupplier, updateSupplier, toggleSupplier } from './actions'

export default async function SuppliersPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string }>
}) {
  const ok = await checkPermission('inventory.manage_suppliers')
  if (!ok) redirect('/settings')

  const { edit: editId } = await searchParams

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const admin = createAdminClient()
  const { data: profile } = await admin.from('user_profile').select('tenant_id').eq('id', user.id).single()
  if (!profile?.tenant_id) redirect('/settings')

  const { data: suppliers } = await admin
    .from('supplier')
    .select('id, name, tax_id, contact_name, phone, email, address, category, is_active')
    .eq('tenant_id', profile.tenant_id)
    .is('deleted_at', null)
    .order('name')

  const list = suppliers ?? []
  const categories = [...new Set(list.map(s => s.category).filter(Boolean))]

  return (
    <div className="max-w-5xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/settings" className="text-gray-400 hover:text-gray-600 text-sm">← Configuración</Link>
        <h1 className="text-2xl font-bold text-gray-900">Proveedores</h1>
        <span className="ml-1 text-sm text-gray-400">({list.length})</span>
      </div>

      {/* Table */}
      {list.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-6">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Nombre</th>
                <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">NIT / Tax ID</th>
                <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Contacto</th>
                <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Teléfono</th>
                <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Categoría</th>
                <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Estado</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {list.map(supplier => (
                <React.Fragment key={supplier.id}>
                  {editId === supplier.id ? (
                    <tr className="bg-slate-50">
                      <td colSpan={7} className="px-4 py-4">
                        <form action={updateSupplier} className="space-y-3">
                          <input type="hidden" name="id" value={supplier.id} />
                          <div className="grid grid-cols-3 gap-3">
                            <div>
                              <label className="block text-xs text-gray-500 mb-1">Nombre *</label>
                              <input
                                name="name"
                                required
                                defaultValue={supplier.name}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-500 mb-1">NIT / Tax ID</label>
                              <input
                                name="tax_id"
                                defaultValue={supplier.tax_id ?? ''}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-500 mb-1">Persona de contacto</label>
                              <input
                                name="contact_name"
                                defaultValue={supplier.contact_name ?? ''}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-500 mb-1">Teléfono</label>
                              <input
                                name="phone"
                                defaultValue={supplier.phone ?? ''}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-500 mb-1">Email</label>
                              <input
                                name="email"
                                type="email"
                                defaultValue={supplier.email ?? ''}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-500 mb-1">Categoría</label>
                              <input
                                name="category"
                                list="edit-categories"
                                defaultValue={supplier.category ?? ''}
                                placeholder="repuestos, lubricantes..."
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                              />
                              <datalist id="edit-categories">
                                {categories.map(c => <option key={c} value={c as string} />)}
                              </datalist>
                            </div>
                            <div className="col-span-3">
                              <label className="block text-xs text-gray-500 mb-1">Dirección</label>
                              <input
                                name="address"
                                defaultValue={supplier.address ?? ''}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                              />
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <SubmitButton
                              pendingLabel="Guardando…"
                              className="bg-slate-800 hover:bg-slate-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
                            >
                              Guardar cambios
                            </SubmitButton>
                            <Link
                              href="/settings/suppliers"
                              className="text-sm text-gray-400 hover:text-gray-600 px-3 py-2"
                            >
                              Cancelar
                            </Link>
                          </div>
                        </form>
                      </td>
                    </tr>
                  ) : (
                    <tr className={!supplier.is_active ? 'opacity-50' : ''}>
                      <td className="px-4 py-3 font-medium text-gray-800">{supplier.name}</td>
                      <td className="px-4 py-3 text-gray-500 font-mono text-xs">{supplier.tax_id ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-600">{supplier.contact_name ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-600">{supplier.phone ?? '—'}</td>
                      <td className="px-4 py-3">
                        {supplier.category && (
                          <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                            {supplier.category}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <form action={toggleSupplier}>
                          <input type="hidden" name="id" value={supplier.id} />
                          <input type="hidden" name="is_active" value={String(supplier.is_active)} />
                          <SubmitButton
                            className={`text-xs font-medium px-2.5 py-1 rounded-full transition-colors ${
                              supplier.is_active
                                ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                            }`}
                          >
                            {supplier.is_active ? 'Activo' : 'Inactivo'}
                          </SubmitButton>
                        </form>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/settings/suppliers?edit=${supplier.id}`}
                          className="text-xs text-slate-600 hover:text-slate-800 font-medium"
                        >
                          Editar
                        </Link>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create form */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <p className="font-semibold text-gray-700 mb-4">Agregar proveedor</p>
        <form action={createSupplier} className="space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Nombre *</label>
              <input
                name="name"
                required
                placeholder="Distribuidora XYZ"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">NIT / Tax ID</label>
              <input
                name="tax_id"
                placeholder="900.123.456-7"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Persona de contacto</label>
              <input
                name="contact_name"
                placeholder="Juan Pérez"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Teléfono</label>
              <input
                name="phone"
                placeholder="+57 300 000 0000"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Email</label>
              <input
                name="email"
                type="email"
                placeholder="ventas@proveedor.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Categoría</label>
              <input
                name="category"
                list="new-categories"
                placeholder="repuestos, lubricantes, herramientas..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
              />
              <datalist id="new-categories">
                <option value="repuestos" />
                <option value="lubricantes" />
                <option value="herramientas" />
                <option value="eléctricos" />
                <option value="otro" />
                {categories.map(c => <option key={c} value={c as string} />)}
              </datalist>
            </div>
            <div className="col-span-3">
              <label className="block text-xs text-gray-500 mb-1">Dirección</label>
              <input
                name="address"
                placeholder="Cra 10 #20-30, Bogotá"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
              />
            </div>
          </div>
          <SubmitButton
            pendingLabel="Guardando…"
            className="bg-slate-800 hover:bg-slate-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
          >
            Registrar proveedor
          </SubmitButton>
        </form>
      </div>
    </div>
  )
}
