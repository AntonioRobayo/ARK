'use client'

import { useState } from 'react'
import { createBranch, updateBranch, setMainBranch, toggleBranchActive } from './actions'

interface Branch {
  id: string
  name: string
  address: string | null
  city: string | null
  phone: string | null
  email: string | null
  is_main: boolean
  is_active: boolean
}

interface Labels {
  addBtn: string
  cancelBtn: string
  saveBtn: string
  newTitle: string
  editTitle: string
  nameLabel: string
  namePlaceholder: string
  addressLabel: string
  addressPlaceholder: string
  cityLabel: string
  cityPlaceholder: string
  phoneLabel: string
  phonePlaceholder: string
  emailLabel: string
  emailPlaceholder: string
  mainBadge: string
  activeBadge: string
  inactiveBadge: string
  setMain: string
  deactivate: string
  reactivate: string
  edit: string
  empty: string
  tableHeaders: { name: string; city: string; phone: string; status: string }
}

interface Props {
  branches: Branch[]
  canManage: boolean
  labels: Labels
}

function BranchForm({
  branch,
  labels,
  onCancel,
}: {
  branch?: Branch
  labels: Labels
  onCancel: () => void
}) {
  const action = branch ? updateBranch : createBranch
  return (
    <form
      action={async (fd) => {
        await action(fd)
        onCancel()
      }}
      className="bg-white border border-gray-200 rounded-xl p-6 mb-6 space-y-4"
    >
      {branch && <input type="hidden" name="branch_id" value={branch.id} />}
      <h2 className="text-sm font-semibold text-gray-700">
        {branch ? labels.editTitle : labels.newTitle}
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{labels.nameLabel}</label>
          <input
            name="name"
            required
            defaultValue={branch?.name ?? ''}
            placeholder={labels.namePlaceholder}
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{labels.cityLabel}</label>
          <input
            name="city"
            defaultValue={branch?.city ?? ''}
            placeholder={labels.cityPlaceholder}
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{labels.addressLabel}</label>
          <input
            name="address"
            defaultValue={branch?.address ?? ''}
            placeholder={labels.addressPlaceholder}
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{labels.phoneLabel}</label>
          <input
            name="phone"
            type="tel"
            defaultValue={branch?.phone ?? ''}
            placeholder={labels.phonePlaceholder}
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">{labels.emailLabel}</label>
          <input
            name="email"
            type="email"
            defaultValue={branch?.email ?? ''}
            placeholder={labels.emailPlaceholder}
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent"
          />
        </div>
      </div>

      <div className="flex items-center gap-3 pt-1">
        <button
          type="submit"
          className="text-sm font-medium px-5 py-2.5 rounded-lg text-white transition-colors"
          style={{ backgroundColor: '#FF7316' }}
        >
          {labels.saveBtn}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="text-sm font-medium px-5 py-2.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
        >
          {labels.cancelBtn}
        </button>
      </div>
    </form>
  )
}

export function BranchesClient({ branches, canManage, labels }: Props) {
  const [showNew, setShowNew]     = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  return (
    <div>
      {/* New branch button */}
      {canManage && !showNew && editingId === null && (
        <div className="mb-5">
          <button
            onClick={() => setShowNew(true)}
            className="inline-flex items-center text-sm font-medium px-4 py-2 rounded-lg text-white transition-colors"
            style={{ backgroundColor: '#FF7316' }}
          >
            {labels.addBtn}
          </button>
        </div>
      )}

      {/* New branch form */}
      {canManage && showNew && (
        <BranchForm labels={labels} onCancel={() => setShowNew(false)} />
      )}

      {/* Branches list */}
      {branches.length === 0 && !showNew ? (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
          <p className="text-sm text-gray-400">{labels.empty}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {branches.map(b => (
            <div key={b.id}>
              {/* Edit form inline */}
              {canManage && editingId === b.id ? (
                <BranchForm
                  branch={b}
                  labels={labels}
                  onCancel={() => setEditingId(null)}
                />
              ) : (
                <div className={`bg-white border rounded-xl p-5 ${!b.is_active ? 'opacity-60' : ''}`}
                     style={{ borderColor: b.is_main ? '#FF7316' : undefined }}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      {/* Name + badges */}
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-semibold text-gray-900 text-sm">{b.name}</span>
                        {b.is_main && (
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                                style={{ backgroundColor: '#FFF0E6', color: '#FF7316' }}>
                            {labels.mainBadge}
                          </span>
                        )}
                        {b.is_active ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                            {labels.activeBadge}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-gray-300 inline-block" />
                            {labels.inactiveBadge}
                          </span>
                        )}
                      </div>
                      {/* Address / city / phone */}
                      <div className="text-xs text-gray-400 space-y-0.5">
                        {(b.address || b.city) && (
                          <p>{[b.address, b.city].filter(Boolean).join(', ')}</p>
                        )}
                        {b.phone && <p>{b.phone}</p>}
                        {b.email && <p>{b.email}</p>}
                      </div>
                    </div>

                    {/* Actions */}
                    {canManage && (
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          onClick={() => setEditingId(b.id)}
                          className="text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
                        >
                          {labels.edit}
                        </button>

                        {!b.is_main && b.is_active && (
                          <form action={setMainBranch}>
                            <input type="hidden" name="branch_id" value={b.id} />
                            <button
                              type="submit"
                              className="text-xs font-medium px-3 py-1.5 rounded-lg border border-orange-200 text-orange-600 hover:bg-orange-50 transition-colors"
                            >
                              {labels.setMain}
                            </button>
                          </form>
                        )}

                        {!b.is_main && (
                          <form action={toggleBranchActive}>
                            <input type="hidden" name="branch_id" value={b.id} />
                            <input type="hidden" name="is_active" value={String(!b.is_active)} />
                            <button
                              type="submit"
                              className={`text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors ${
                                b.is_active
                                  ? 'border-red-200 text-red-500 hover:bg-red-50'
                                  : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50'
                              }`}
                            >
                              {b.is_active ? labels.deactivate : labels.reactivate}
                            </button>
                          </form>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
