export type Json = string | number | boolean | null | { [key: string]: Json } | Json[]

export type WorkOrderStatus =
  | 'draft'
  | 'received'
  | 'in_diagnosis'
  | 'quotation_sent'
  | 'awaiting_authorization'
  | 'authorized'
  | 'in_execution'
  | 'blocked_parts'
  | 'blocked_technician'
  | 'blocked_customer'
  | 'quality_control'
  | 'ready_for_delivery'
  | 'delivered_with_balance'
  | 'closed'
  | 'cancelled'
  | 'warranty'

export type QuotationStatus =
  | 'draft'
  | 'sent'
  | 'partially_approved'
  | 'approved'
  | 'rejected'
  | 'expired'

export type InvoiceStatus =
  | 'draft'
  | 'issued'
  | 'partially_paid'
  | 'paid'
  | 'cancelled'

export type InventoryItemType = 'part' | 'product' | 'supply' | 'tool'
export type MovementType =
  | 'purchase'
  | 'return_to_stock'
  | 'consumption'
  | 'transfer_in'
  | 'transfer_out'
  | 'adjustment'
  | 'write_off'

export type ReservationStatus = 'pending' | 'delivered' | 'cancelled' | 'returned'
export type AppointmentStatus = 'pending' | 'confirmed' | 'arrived' | 'no_show' | 'cancelled'
export type TechnicianCostMode = 'hourly' | 'fixed_monthly' | 'pct_ot' | 'pct_service'
export type QuotationItemType = 'service' | 'part' | 'external_work' | 'other'
export type ChecklistItemStatus = 'pending' | 'ok' | 'issue' | 'na' | 'skipped'
export type NotificationChannel = 'in_app' | 'push' | 'email'

export interface Tenant {
  id: string
  name: string
  slug: string
  plan: string
  plan_expires_at: string | null
  country_code: string | null
  currency_code: string
  timezone: string
  settings: Json
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Branch {
  id: string
  tenant_id: string
  name: string
  address: string | null
  city: string | null
  phone: string | null
  email: string | null
  is_main: boolean
  settings: Json
  is_active: boolean
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface UserProfile {
  id: string
  tenant_id: string | null
  branch_id: string | null
  first_name: string
  last_name: string | null
  phone: string | null
  avatar_url: string | null
  role_id: string | null
  is_active: boolean
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface Customer {
  id: string
  tenant_id: string
  app_user_id: string | null
  first_name: string
  last_name: string | null
  id_type: string | null
  id_number: string | null
  phone: string | null
  email: string | null
  address: string | null
  is_credit_enabled: boolean
  credit_limit: number | null
  notes: string | null
  tags: string[]
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface Vehicle {
  id: string
  tenant_id: string
  customer_id: string | null
  plate: string | null
  vin: string | null
  brand: string
  model: string
  year: number | null
  color: string | null
  engine_cc: number | null
  fuel_type: string | null
  vehicle_type: string
  current_mileage: number | null
  nfc_tag_id: string | null
  qr_code: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface WorkOrder {
  id: string
  tenant_id: string
  branch_id: string
  number: string
  vehicle_id: string
  customer_id: string
  appointment_id: string | null
  status: WorkOrderStatus
  priority: string
  reception_mileage: number | null
  fuel_level: number | null
  battery_level: number | null
  reception_notes: string | null
  technician_id: string | null
  estimated_delivery_at: string | null
  delivered_at: string | null
  closed_at: string | null
  cancelled_at: string | null
  cancellation_reason: string | null
  warranty_ot_id: string | null
  version: number
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface InventoryItem {
  id: string
  tenant_id: string
  name: string
  description: string | null
  type: InventoryItemType
  barcode: string | null
  internal_code: string | null
  unit_of_measure: string
  sale_price: number | null
  cost_price: number | null
  tax_rate_id: string | null
  min_stock: number
  reorder_level: number | null
  is_active: boolean
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface InventoryStock {
  id: string
  tenant_id: string
  item_id: string
  location_id: string
  quantity_on_hand: number
  quantity_reserved: number
  updated_at: string
}

export interface Invoice {
  id: string
  tenant_id: string
  work_order_id: string
  number: string
  status: InvoiceStatus
  subtotal: number
  tax_amount: number
  discount_amount: number
  total: number
  paid_amount: number
  issued_at: string | null
  due_at: string | null
  closed_at: string | null
  notes: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}
