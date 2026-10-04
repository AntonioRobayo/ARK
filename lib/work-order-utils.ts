import type { WorkOrderStatus } from '@/types/database'

export const STATUS_LABEL: Record<WorkOrderStatus, string> = {
  draft:                  'Borrador',
  received:               'Recibido',
  in_diagnosis:           'En diagnóstico',
  quotation_sent:         'Cotización enviada',
  awaiting_authorization: 'Esperando autorización',
  authorized:             'Autorizado',
  in_execution:           'En ejecución',
  blocked_parts:          'Bloqueado — repuestos',
  blocked_technician:     'Bloqueado — técnico',
  blocked_customer:       'Bloqueado — cliente',
  quality_control:        'Control de calidad',
  ready_for_delivery:     'Listo para entrega',
  delivered_with_balance: 'Entregado con saldo',
  closed:                 'Cerrado',
  cancelled:              'Cancelado',
  warranty:               'Garantía',
}

export const STATUS_COLOR: Record<WorkOrderStatus, string> = {
  draft:                  'bg-gray-100 text-gray-600',
  received:               'bg-blue-100 text-blue-700',
  in_diagnosis:           'bg-purple-100 text-purple-700',
  quotation_sent:         'bg-yellow-100 text-yellow-700',
  awaiting_authorization: 'bg-orange-100 text-orange-700',
  authorized:             'bg-emerald-100 text-emerald-700',
  in_execution:           'bg-blue-100 text-blue-800',
  blocked_parts:          'bg-red-100 text-red-700',
  blocked_technician:     'bg-red-100 text-red-700',
  blocked_customer:       'bg-red-100 text-red-700',
  quality_control:        'bg-teal-100 text-teal-700',
  ready_for_delivery:     'bg-green-100 text-green-700',
  delivered_with_balance: 'bg-amber-100 text-amber-700',
  closed:                 'bg-gray-200 text-gray-700',
  cancelled:              'bg-red-50 text-red-400',
  warranty:               'bg-violet-100 text-violet-700',
}

export const PRIORITY_LABEL: Record<string, string> = {
  low:    'Baja',
  normal: 'Normal',
  high:   'Alta',
  urgent: 'Urgente',
}

export const PRIORITY_COLOR: Record<string, string> = {
  low:    'bg-gray-100 text-gray-500',
  normal: 'bg-gray-100 text-gray-600',
  high:   'bg-orange-100 text-orange-600',
  urgent: 'bg-red-100 text-red-600',
}

// Transiciones permitidas por estado
export const STATUS_TRANSITIONS: Partial<Record<WorkOrderStatus, WorkOrderStatus[]>> = {
  draft:                  ['received', 'cancelled'],
  received:               ['in_diagnosis', 'cancelled'],
  in_diagnosis:           ['quotation_sent', 'authorized', 'cancelled'],
  quotation_sent:         ['awaiting_authorization', 'authorized', 'cancelled'],
  awaiting_authorization: ['authorized', 'cancelled'],
  authorized:             ['in_execution', 'cancelled'],
  in_execution:           ['blocked_parts', 'blocked_technician', 'blocked_customer', 'quality_control', 'cancelled'],
  blocked_parts:          ['in_execution', 'cancelled'],
  blocked_technician:     ['in_execution', 'cancelled'],
  blocked_customer:       ['in_execution', 'cancelled'],
  quality_control:        ['in_execution', 'ready_for_delivery'],
  ready_for_delivery:     ['delivered_with_balance', 'closed'],
  delivered_with_balance: ['closed'],
  closed:                 ['warranty'],
  warranty:               ['in_execution', 'closed'],
}

// Estados considerados "activos" (no terminales)
export const ACTIVE_STATUSES: WorkOrderStatus[] = [
  'draft', 'received', 'in_diagnosis', 'quotation_sent',
  'awaiting_authorization', 'authorized', 'in_execution',
  'blocked_parts', 'blocked_technician', 'blocked_customer',
  'quality_control', 'ready_for_delivery', 'delivered_with_balance',
]

export const BLOCKED_STATUSES: WorkOrderStatus[] = [
  'blocked_parts', 'blocked_technician', 'blocked_customer',
]

export function formatPlate(plate: string | null) {
  return plate?.toUpperCase() ?? '—'
}

export function formatOtNumber(number: string) {
  return `OT-${number}`
}
