-- Follow-up to the 0039/0040 audit (item #3): markPoSent and closePo were
-- the only two direct .from("purchase_orders").update() calls left in the
-- app relying on po_write's is_procurement_or_admin() bypass — moving them
-- into security-definer RPCs (matching mark_po_in_transit's own pattern)
-- means po_write no longer needs to grant procurement_officer direct write
-- access at all; only the payment_status transitions in payments.ts /
-- po-payment-status.ts still touch the table directly, and those are
-- already gated by ADMIN_ROLES at the app layer. Tightening po_write to
-- is_admin_role() closes the gap where a plain procurement_officer could
-- have flipped payment_status via a raw client call despite initiatePayment
-- restricting that to finance/admin.

create or replace function mark_po_sent(p_po_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  po purchase_orders%rowtype;
begin
  if not is_procurement_or_admin() then
    raise exception 'Only procurement officers or admins can mark a PO sent';
  end if;

  select * into po from purchase_orders where id = p_po_id for update;
  if po is null or po.organization_id <> current_organization_id() then raise exception 'Purchase order not found'; end if;
  if po.status <> 'draft' then raise exception 'This PO is not in draft status'; end if;

  update purchase_orders set status = 'sent_to_vendor' where id = p_po_id;
  perform write_audit('purchase_order', p_po_id, 'sent_to_vendor', '{}'::jsonb);
end;
$$;

create or replace function close_po(p_po_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  po purchase_orders%rowtype;
begin
  if not is_procurement_or_admin() then
    raise exception 'Only procurement officers or admins can close a PO';
  end if;

  select * into po from purchase_orders where id = p_po_id for update;
  if po is null or po.organization_id <> current_organization_id() then raise exception 'Purchase order not found'; end if;
  if po.status <> 'fully_received' then raise exception 'This PO is not fully received yet'; end if;

  update purchase_orders set status = 'closed' where id = p_po_id;
  perform write_audit('purchase_order', p_po_id, 'closed', '{}'::jsonb);
end;
$$;

drop policy po_write on purchase_orders;
create policy po_write on purchase_orders for all
  using (organization_id = current_organization_id() and is_admin_role())
  with check (organization_id = current_organization_id() and is_admin_role());
