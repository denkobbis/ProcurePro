// Hand-written to match supabase/migrations/0001_schema.sql.
// Once the Supabase project is live, regenerate with:
//   npx supabase gen types typescript --project-id <ref> > src/lib/database.types.ts

export type UserRole =
  | "requester"
  | "approver"
  | "procurement_officer"
  | "finance_admin"
  | "super_admin";

export type RequestStatus =
  | "draft"
  | "submitted"
  | "under_review"
  | "approved"
  | "rejected"
  | "converted_to_po";

export type RequestUrgency = "low" | "normal" | "high" | "critical";
export type ApprovalStatus = "pending" | "approved" | "rejected" | "info_requested";
export type PoStatus =
  | "draft"
  | "sent_to_vendor"
  | "in_transit"
  | "customs_clearance"
  | "partially_received"
  | "fully_received"
  | "closed";
export type BudgetPeriod = "monthly" | "quarterly" | "annual";
export type CurrencyCode = "NGN" | "USD" | "EUR" | "GBP";
export type EquipmentStatus = "available" | "on_lease" | "maintenance" | "retired";
export type LeaseStatus = "active" | "returned" | "overdue";
export type RfqStatus = "open" | "awarded" | "cancelled";

export interface Department {
  id: string;
  name: string;
  created_at: string;
}

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  role: UserRole;
  department_id: string | null;
  is_active: boolean;
  created_at: string;
}

export interface VendorDocument {
  file_path: string;
  file_name: string;
  uploaded_at: string;
  document_type?: string;
  expiry_date?: string | null;
}

export interface Vendor {
  id: string;
  name: string;
  category: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  payment_terms: string | null;
  bank_details: Record<string, unknown> | null;
  documents: VendorDocument[];
  is_approved: boolean;
  performance_notes: string | null;
  default_currency: CurrencyCode;
  ncdmb_compliant: boolean;
  ncdmb_certificate_number: string | null;
  ncdmb_certificate_expiry: string | null;
  local_content_percentage: number | null;
  created_by: string | null;
  created_at: string;
}

export interface Budget {
  id: string;
  department_id: string;
  category: string;
  period: BudgetPeriod;
  period_start: string;
  period_end: string;
  allocated_amount: number;
  hard_block: boolean;
  created_by: string | null;
  created_at: string;
}

export interface ApprovalRule {
  id: string;
  department_id: string | null;
  min_amount: number;
  max_amount: number | null;
  approver_role: UserRole;
  step_order: number;
  created_at: string;
}

export interface PurchaseRequest {
  id: string;
  request_number: string;
  requester_id: string;
  department_id: string;
  category: string;
  description: string;
  qty: number;
  est_unit_cost: number;
  vendor_id: string | null;
  justification: string | null;
  urgency: RequestUrgency;
  status: RequestStatus;
  current_step: number;
  mpn: string | null;
  oem_brand: string | null;
  created_at: string;
  updated_at: string;
}

export interface RequestAttachment {
  id: string;
  request_id: string;
  file_path: string;
  file_name: string;
  uploaded_by: string | null;
  created_at: string;
}

export interface RequestComment {
  id: string;
  request_id: string;
  author_id: string;
  comment: string;
  created_at: string;
}

export interface Approval {
  id: string;
  request_id: string;
  step_order: number;
  approver_role: UserRole;
  approver_id: string | null;
  status: ApprovalStatus;
  comment: string | null;
  acted_at: string | null;
  created_at: string;
}

export interface Delegation {
  id: string;
  approver_id: string;
  delegate_id: string;
  start_date: string;
  end_date: string;
  created_at: string;
}

export interface PurchaseOrder {
  id: string;
  po_number: string;
  request_id: string | null;
  vendor_id: string;
  department_id: string;
  status: PoStatus;
  total_amount: number;
  delivery_terms: string | null;
  currency: CurrencyCode;
  fx_rate_to_ngn: number;
  total_amount_ngn: number;
  freight_cost_ngn: number;
  customs_duty_ngn: number;
  carrier: string | null;
  tracking_number: string | null;
  eta: string | null;
  customs_reference: string | null;
  customs_cleared_at: string | null;
  local_content_percentage: number | null;
  ncdmb_certificate_number: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface PoLineItem {
  id: string;
  po_id: string;
  description: string;
  qty: number;
  unit_price: number;
  received_qty: number;
  quality_pass: boolean | null;
  mpn: string | null;
  oem_brand: string | null;
  created_at: string;
}

export interface EquipmentAsset {
  id: string;
  asset_tag: string;
  name: string;
  category: string;
  status: EquipmentStatus;
  day_rate_ngn: number;
  notes: string | null;
  created_by: string | null;
  created_at: string;
}

export interface EquipmentLease {
  id: string;
  asset_id: string;
  client_name: string;
  start_date: string;
  expected_return_date: string;
  actual_return_date: string | null;
  day_rate_ngn: number;
  status: LeaseStatus;
  return_condition: string | null;
  return_inspection_pass: boolean | null;
  created_by: string | null;
  created_at: string;
}

export interface Rfq {
  id: string;
  request_id: string;
  status: RfqStatus;
  created_by: string | null;
  created_at: string;
}

export interface RfqQuote {
  id: string;
  rfq_id: string;
  vendor_id: string;
  unit_price: number;
  currency: CurrencyCode;
  lead_time_days: number | null;
  notes: string | null;
  is_winner: boolean;
  created_by: string | null;
  created_at: string;
}

export interface AuditLogEntry {
  id: string;
  entity_type: string;
  entity_id: string;
  action: string;
  actor_id: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
}

export interface AppNotification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  is_read: boolean;
  created_at: string;
}

// Minimal Database shape so @supabase/ssr generics compile.
// Not exhaustive (RPC return types are cast at call sites).
export type Database = Record<string, unknown>;
