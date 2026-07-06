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
export type PoStatus = "draft" | "sent_to_vendor" | "partially_received" | "fully_received" | "closed";
export type BudgetPeriod = "monthly" | "quarterly" | "annual";

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

export interface Vendor {
  id: string;
  name: string;
  category: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  payment_terms: string | null;
  bank_details: Record<string, unknown> | null;
  documents: unknown[];
  is_approved: boolean;
  performance_notes: string | null;
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
