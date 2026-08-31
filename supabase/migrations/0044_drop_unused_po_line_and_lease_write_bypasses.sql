-- Same bug class as 0040's rfqs_write/rfq_quotes_write and payments_write:
-- a blanket is_procurement_or_admin() write policy that grants direct
-- table access no legitimate app code path actually uses, because every
-- real mutation already goes through a security-definer RPC (which bypasses
-- RLS entirely regardless of this policy).
--
-- po_line_write: every po_line_items write in the app goes through
-- convert_to_po / update_po / receive_po_line. Without this fix, a
-- procurement_officer/finance_admin/super_admin could bypass receive_po_line
-- entirely and directly UPDATE an existing line item's received_qty,
-- quality_pass, or unit_price on an already-issued PO, with no audit trail
-- (only the RPC calls write_audit).
--
-- equipment_leases_write: every equipment_leases write goes through
-- lease_out_equipment / mark_equipment_returned. Without this fix, the same
-- roles could directly forge returned_at/return_condition/inspection_pass
-- on an existing lease, bypassing mark_equipment_returned's validation.
--
-- Confirmed via grep: no src/ file does a direct .insert/.update/.delete on
-- either table — only .select() reads, which keep working via the existing
-- *_select policies untouched here.

drop policy po_line_write on po_line_items;
drop policy equipment_leases_write on equipment_leases;
